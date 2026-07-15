import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canAddCalculatedItemToCart } from "./access.js";
import { addQuoteToBigCommerceCart } from "./bigcommerce.js";
import { createQuoteToken, verifyQuoteMatchesToken, verifyQuoteToken } from "./quoteToken.js";
import { calculateQuote, getCalculatorPublicConfig, getSupportedCalculatorTypes } from "./calculators/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const quoteSigningSecret = process.env.QUOTE_SIGNING_SECRET || "dev-quote-secret-change-me";
const requireQuoteToken = process.env.REQUIRE_QUOTE_TOKEN === "true";
const contactRequestWebhookUrl = process.env.CONTACT_REQUEST_WEBHOOK_URL || "";
const contactRequestRecipient = process.env.CONTACT_REQUEST_EMAIL_TO || "smi@securitymirror.com";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && quoteSigningSecret === "dev-quote-secret-change-me") {
  throw new Error("QUOTE_SIGNING_SECRET must be set in production.");
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function corsOrigin(req) {
  if (allowedOrigins.includes("*")) return "*";
  const requestOrigin = req.headers.origin;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return requestOrigin;
  return allowedOrigins[0] || "*";
}

function sendJson(req, res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": corsOrigin(req),
    Vary: "Origin",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function sendText(req, res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": corsOrigin(req),
    Vary: "Origin",
  });
  res.end(text);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.status = 400;
    throw error;
  }
}

function quoteForPayload(payload) {
  return calculateQuote(payload);
}

function signedQuoteResponse(quote) {
  const quoteToken = createQuoteToken(quote, quoteSigningSecret);
  return { ...quote, quoteToken };
}

function cleanText(value, maxLength = 1000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanContactRequest(payload) {
  const contact = payload.contact || {};
  return {
    submittedAt: new Date().toISOString(),
    pageUrl: cleanText(payload.pageUrl, 2000),
    customerId: payload.customerId ?? payload.calculator?.customerId ?? null,
    customerGroup: cleanText(payload.customerGroup || payload.calculator?.customerGroup || "Guest", 100),
    contact: {
      name: cleanText(contact.name, 200),
      email: cleanText(contact.email, 320),
      company: cleanText(contact.company, 200),
      phone: cleanText(contact.phone, 80),
      streetAddress: cleanText(contact.streetAddress, 300),
      city: cleanText(contact.city, 120),
      provinceState: cleanText(contact.provinceState, 120),
      postalCode: cleanText(contact.postalCode, 40),
      country: cleanText(contact.country, 120),
      comments: cleanText(contact.comments, 4000),
    },
    calculator: payload.calculator || {},
    calculation: payload.calculation || null,
  };
}

async function forwardContactRequest(request) {
  if (!contactRequestWebhookUrl) return false;

  const response = await fetch(contactRequestWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = new Error(`Contact request webhook failed with status ${response.status}.`);
    error.status = 502;
    throw error;
  }

  return true;
}

async function serveStatic(req, res, url) {
  const relativePath = url.pathname === "/" ? "demo.html" : url.pathname.slice(1);
  const resolvedPath = path.resolve(publicDir, relativePath);

  if (!resolvedPath.startsWith(publicDir)) {
    sendText(req, res, 403, "Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(resolvedPath);
    const extension = path.extname(resolvedPath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Access-Control-Allow-Origin": corsOrigin(req),
      Vary: "Origin",
    });
    res.end(file);
  } catch {
    sendText(req, res, 404, "Not found");
  }
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    sendJson(req, res, 204, {});
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(req, res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/calculator/config") {
    const type = url.searchParams.get("type") || "frameless_mirror";
    const config = getCalculatorPublicConfig(type);
    if (!config) {
      sendJson(req, res, 404, {
        ok: false,
        message: `Unsupported calculator type: ${type}`,
        supportedTypes: getSupportedCalculatorTypes(),
      });
      return;
    }
    sendJson(req, res, 200, { ok: true, config, supportedTypes: getSupportedCalculatorTypes() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/calculator/quote") {
    const payload = await readJson(req);
    const quote = quoteForPayload(payload);
    if (!quote.ok) {
      sendJson(req, res, 422, quote);
      return;
    }
    sendJson(req, res, 200, signedQuoteResponse(quote));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/contact/request") {
    const payload = await readJson(req);
    const contactRequest = cleanContactRequest(payload);

    if (!contactRequest.contact.name || !contactRequest.contact.email) {
      sendJson(req, res, 400, {
        ok: false,
        status: "contact_required_fields_missing",
        message: "Name and email are required.",
      });
      return;
    }

    if (!contactRequest.calculation) {
      const calculation = quoteForPayload(contactRequest.calculator);
      if (calculation.ok) contactRequest.calculation = calculation;
    }

    const forwarded = await forwardContactRequest(contactRequest);
    if (!forwarded) {
      sendJson(req, res, 501, {
        ok: false,
        status: "contact_request_not_configured",
        message: "Automatic request delivery is not configured.",
        recipient: contactRequestRecipient,
      });
      return;
    }

    sendJson(req, res, 200, {
      ok: true,
      status: "contact_request_received",
      message: "Thank you. We received your request.",
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/cart/add") {
    const payload = await readJson(req);
    const quote = quoteForPayload(payload);
    if (!quote.ok) {
      sendJson(req, res, 422, quote);
      return;
    }

    if (payload.quoteToken) {
      let tokenPayload;
      try {
        tokenPayload = verifyQuoteToken(payload.quoteToken, quoteSigningSecret);
      } catch (error) {
        sendJson(req, res, 401, {
          ok: false,
          status: "invalid_quote_token",
          message: error.message,
        });
        return;
      }

      if (!verifyQuoteMatchesToken(quote, tokenPayload)) {
        sendJson(req, res, 409, {
          ok: false,
          status: "quote_mismatch",
          message: "Quote details do not match the signed quote token.",
        });
        return;
      }
    } else if (requireQuoteToken) {
      sendJson(req, res, 400, {
        ok: false,
        status: "quote_token_required",
        message: "quoteToken is required for add-to-cart.",
      });
      return;
    }

    if (!canAddCalculatedItemToCart({ customerId: payload.customerId, customerGroup: quote.customerGroup })) {
      sendJson(req, res, 403, {
        ok: false,
        status: "contact_request_required",
        message: "Guest-priced calculators cannot be added to cart. Please submit the contact form.",
        quote: signedQuoteResponse(quote),
      });
      return;
    }

    if (!process.env.BIGCOMMERCE_STORE_HASH || !process.env.BIGCOMMERCE_ACCESS_TOKEN) {
      sendJson(req, res, 501, {
        ok: false,
        status: "bigcommerce_not_configured",
        message: "Quote is valid, but BigCommerce credentials are not configured on this server.",
        quote,
      });
      return;
    }

    const cart = await addQuoteToBigCommerceCart({
      quote,
      cartId: payload.cartId,
      customerId: payload.customerId,
      channelId: payload.channelId,
    });
    sendJson(req, res, 200, { ok: true, quote: signedQuoteResponse(quote), cart });
    return;
  }

  sendJson(req, res, 404, { ok: false, message: "Not found" });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname === "/health" || url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    sendJson(req, res, error.status || 500, {
      ok: false,
      message: error.message || "Server error",
      details: error.response,
    });
  }
});

server.listen(port, () => {
  console.log(`Security Mirror calculator server running at http://localhost:${port}`);
});

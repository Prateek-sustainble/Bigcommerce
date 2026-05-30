import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addQuoteToBigCommerceCart } from "./bigcommerce.js";
import { createQuoteToken, verifyQuoteMatchesToken, verifyQuoteToken } from "./quoteToken.js";
import {
  calculateFramelessMirrorQuote,
  getFramelessMirrorPublicConfig,
} from "./calculators/framelessMirror.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const port = Number(process.env.PORT || 3000);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const quoteSigningSecret = process.env.QUOTE_SIGNING_SECRET || "dev-quote-secret-change-me";
const requireQuoteToken = process.env.REQUIRE_QUOTE_TOKEN === "true";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
  });
  res.end(text);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function quoteForPayload(payload) {
  if (payload.type && payload.type !== "frameless_mirror") {
    return {
      ok: false,
      status: "unsupported",
      message: `Unsupported calculator type: ${payload.type}`,
    };
  }
  return calculateFramelessMirrorQuote(payload);
}

function signedQuoteResponse(quote) {
  const quoteToken = createQuoteToken(quote, quoteSigningSecret);
  return { ...quote, quoteToken };
}

async function serveStatic(req, res, url) {
  const relativePath = url.pathname === "/" ? "demo.html" : url.pathname.slice(1);
  const resolvedPath = path.resolve(publicDir, relativePath);

  if (!resolvedPath.startsWith(publicDir)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(resolvedPath);
    const extension = path.extname(resolvedPath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Access-Control-Allow-Origin": allowedOrigin,
    });
    res.end(file);
  } catch {
    sendText(res, 404, "Not found");
  }
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/calculator/config") {
    const type = url.searchParams.get("type") || "frameless_mirror";
    if (type !== "frameless_mirror") {
      sendJson(res, 404, { ok: false, message: `Unsupported calculator type: ${type}` });
      return;
    }
    sendJson(res, 200, { ok: true, config: getFramelessMirrorPublicConfig() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/calculator/quote") {
    const payload = await readJson(req);
    const quote = quoteForPayload(payload);
    if (!quote.ok) {
      sendJson(res, 422, quote);
      return;
    }
    sendJson(res, 200, signedQuoteResponse(quote));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/cart/add") {
    const payload = await readJson(req);
    const quote = quoteForPayload(payload);
    if (!quote.ok) {
      sendJson(res, 422, quote);
      return;
    }

    if (payload.quoteToken) {
      let tokenPayload;
      try {
        tokenPayload = verifyQuoteToken(payload.quoteToken, quoteSigningSecret);
      } catch (error) {
        sendJson(res, 401, {
          ok: false,
          status: "invalid_quote_token",
          message: error.message,
        });
        return;
      }

      if (!verifyQuoteMatchesToken(quote, tokenPayload)) {
        sendJson(res, 409, {
          ok: false,
          status: "quote_mismatch",
          message: "Quote details do not match the signed quote token.",
        });
        return;
      }
    } else if (requireQuoteToken) {
      sendJson(res, 400, {
        ok: false,
        status: "quote_token_required",
        message: "quoteToken is required for add-to-cart.",
      });
      return;
    }

    if (!process.env.BIGCOMMERCE_STORE_HASH || !process.env.BIGCOMMERCE_ACCESS_TOKEN) {
      sendJson(res, 501, {
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
    sendJson(res, 200, { ok: true, quote: signedQuoteResponse(quote), cart });
    return;
  }

  sendJson(res, 404, { ok: false, message: "Not found" });
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
    sendJson(res, error.status || 500, {
      ok: false,
      message: error.message || "Server error",
      details: error.response,
    });
  }
});

server.listen(port, () => {
  console.log(`Security Mirror calculator server running at http://localhost:${port}`);
});

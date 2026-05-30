import crypto from "node:crypto";

const DEFAULT_TTL_SECONDS = 15 * 60;

function base64urlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64urlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function hmac(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function fingerprint(quote) {
  const stable = {
    type: quote.type,
    customerGroup: quote.customerGroup,
    selections: quote.selections,
    price: quote.price,
    sku: quote.sku,
    description: quote.description,
  };
  return crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

export function createQuoteToken(quote, secret, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!secret) throw new Error("QUOTE_SIGNING_SECRET is required to sign quote tokens.");
  const header = { alg: "HS256", typ: "QTK1" };
  const issuedAt = nowSeconds();
  const payload = {
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
    fp: fingerprint(quote),
    type: quote.type,
    customerGroup: quote.customerGroup,
    selections: quote.selections,
    price: quote.price,
    sku: quote.sku,
    description: quote.description,
  };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signature = hmac(secret, `${encodedHeader}.${encodedPayload}`);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyQuoteToken(token, secret) {
  if (!secret) throw new Error("QUOTE_SIGNING_SECRET is required to verify quote tokens.");
  if (!token || typeof token !== "string") throw new Error("quoteToken is required.");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid quote token format.");
  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = hmac(secret, `${encodedHeader}.${encodedPayload}`);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error("Invalid quote token signature.");
  }

  const header = JSON.parse(base64urlDecode(encodedHeader));
  if (header.alg !== "HS256" || header.typ !== "QTK1") {
    throw new Error("Invalid quote token header.");
  }

  const payload = JSON.parse(base64urlDecode(encodedPayload));
  if (typeof payload.exp !== "number" || nowSeconds() > payload.exp) {
    throw new Error("Quote token has expired.");
  }

  return payload;
}

export function verifyQuoteMatchesToken(quote, tokenPayload) {
  return fingerprint(quote) === tokenPayload.fp;
}

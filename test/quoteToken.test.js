import assert from "node:assert/strict";
import test from "node:test";
import { calculateFramelessMirrorQuote } from "../src/calculators/framelessMirror.js";
import { createQuoteToken, verifyQuoteMatchesToken, verifyQuoteToken } from "../src/quoteToken.js";

function sampleQuote() {
  const quote = calculateFramelessMirrorQuote({
    customerGroup: "House",
    item: "Clear Mirror 5mm",
    widthInches: 24,
    widthFraction: 0,
    heightInches: 36,
    heightFraction: 0,
    edgeWork: "No",
    shatterStop: "No",
    quantity: 1,
  });
  if (!quote.ok) throw new Error("Expected sample quote to be valid.");
  return quote;
}

test("creates and verifies a quote token", () => {
  const quote = sampleQuote();
  const token = createQuoteToken(quote, "test-secret");
  const payload = verifyQuoteToken(token, "test-secret");
  assert.equal(payload.type, "frameless_mirror");
  assert.equal(payload.price.unitCad, 67.86);
  assert.equal(verifyQuoteMatchesToken(quote, payload), true);
});

test("fails verification for tampered quotes", () => {
  const quote = sampleQuote();
  const token = createQuoteToken(quote, "test-secret");
  const payload = verifyQuoteToken(token, "test-secret");
  const tampered = {
    ...quote,
    price: {
      ...quote.price,
      unitCad: 1,
      subtotalCad: 1,
    },
  };
  assert.equal(verifyQuoteMatchesToken(tampered, payload), false);
});

test("rejects expired quote tokens", () => {
  const quote = sampleQuote();
  const expiredToken = createQuoteToken(quote, "test-secret", -1);
  assert.throws(() => verifyQuoteToken(expiredToken, "test-secret"), /expired/i);
});

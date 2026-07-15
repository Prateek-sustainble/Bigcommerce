import assert from "node:assert/strict";
import test from "node:test";
import { canAddCalculatedItemToCart, usesGuestPricing } from "../src/access.js";

test("guest pricing applies to missing and Guest customer groups", () => {
  assert.equal(usesGuestPricing(), true);
  assert.equal(usesGuestPricing("Guest"), true);
  assert.equal(usesGuestPricing("Default Customer Group"), true);
  assert.equal(usesGuestPricing("House"), false);
});

test("cart add requires only a real logged-in customer", () => {
  assert.equal(canAddCalculatedItemToCart({ customerId: null, customerGroup: "House" }), false);
  assert.equal(canAddCalculatedItemToCart({ customerId: 123, customerGroup: "Guest" }), true);
  assert.equal(canAddCalculatedItemToCart({ customerId: 123, customerGroup: "House" }), true);
});

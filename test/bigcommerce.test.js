import assert from "node:assert/strict";
import test from "node:test";
import { addQuoteToBigCommerceCart } from "../src/bigcommerce.js";

const quote = {
  description: "FRAMELESS-Series-Item Clear Mirror 5mm-Width24xHeight36- No- No Shatter Stop",
  sku: "FRAMELESS-CM5MM-CUSTOM",
  selections: { quantity: 2 },
  price: { unitCad: 95, unitUsd: 68.4 },
  assets: { primaryImageUrl: "https://example.com/mirror.png" },
};

function withBigCommerceEnv(fn) {
  return async () => {
    const originalFetch = globalThis.fetch;
    const originalEnv = {
      BIGCOMMERCE_STORE_HASH: process.env.BIGCOMMERCE_STORE_HASH,
      BIGCOMMERCE_ACCESS_TOKEN: process.env.BIGCOMMERCE_ACCESS_TOKEN,
      BIGCOMMERCE_CART_CURRENCY: process.env.BIGCOMMERCE_CART_CURRENCY,
    };

    process.env.BIGCOMMERCE_STORE_HASH = "store123";
    process.env.BIGCOMMERCE_ACCESS_TOKEN = "token123";
    process.env.BIGCOMMERCE_CART_CURRENCY = "CAD";

    try {
      await fn();
    } finally {
      globalThis.fetch = originalFetch;
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  };
}

test(
  "creates BigCommerce carts with redirect URLs included",
  withBigCommerceEnv(async () => {
    let request;
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({ data: { redirect_urls: { cart_url: "https://example.com/cart" } } }),
      };
    };

    await addQuoteToBigCommerceCart({ quote });

    assert.equal(request.url, "https://api.bigcommerce.com/stores/store123/v3/carts?include=redirect_urls");
    assert.equal(request.options.headers["X-Auth-Token"], "token123");
    assert.deepEqual(JSON.parse(request.options.body), {
      line_items: [],
      custom_items: [
        {
          name: quote.description,
          sku: quote.sku,
          quantity: 2,
          list_price: 95,
          image_url: quote.assets.primaryImageUrl,
        },
      ],
      currency: { code: "CAD" },
    });
  }),
);

test(
  "adds custom items to existing BigCommerce carts with redirect URLs included",
  withBigCommerceEnv(async () => {
    let request;
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({ data: { redirect_urls: { cart_url: "https://example.com/cart" } } }),
      };
    };

    await addQuoteToBigCommerceCart({ quote, cartId: "cart-123" });

    assert.equal(
      request.url,
      "https://api.bigcommerce.com/stores/store123/v3/carts/cart-123/items?include=redirect_urls",
    );
    assert.deepEqual(JSON.parse(request.options.body), {
      custom_items: [
        {
          name: quote.description,
          sku: quote.sku,
          quantity: 2,
          list_price: 95,
          image_url: quote.assets.primaryImageUrl,
        },
      ],
    });
  }),
);

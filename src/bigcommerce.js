function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to call the BigCommerce API.`);
  return value;
}

function pickCartCurrencyPrice(quote, currencyCode) {
  if (currencyCode === "USD") return quote.price.unitUsd;
  return quote.price.unitCad;
}

function toAbsoluteImageUrl(imageUrl) {
  if (!imageUrl) return undefined;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const baseUrl =
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "https://security-mirror-calculator.onrender.com";

  return new URL(imageUrl, baseUrl).toString();
}

function buildCustomItem(quote, currencyCode) {
  return {
    name: quote.description,
    sku: quote.sku,
    quantity: quote.selections.quantity,
    list_price: pickCartCurrencyPrice(quote, currencyCode),
    image_url: toAbsoluteImageUrl(quote.assets.primaryImageUrl || quote.assets.fallbackImageUrl),
  };
}

async function requestBigCommerce(path, body) {
  const storeHash = requireEnv("BIGCOMMERCE_STORE_HASH");
  const authToken = requireEnv("BIGCOMMERCE_ACCESS_TOKEN");
  const response = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v3${path}`, {
    method: "POST",
    headers: {
      "X-Auth-Token": authToken,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(json.title || json.detail || "BigCommerce API request failed.");
    error.status = response.status;
    error.response = json;
    throw error;
  }
  return json;
}

export async function addQuoteToBigCommerceCart({ quote, cartId, customerId, channelId }) {
  const currencyCode = process.env.BIGCOMMERCE_CART_CURRENCY || "CAD";
  const customItem = buildCustomItem(quote, currencyCode);

  if (cartId) {
    return requestBigCommerce(`/carts/${cartId}/items?include=redirect_urls`, {
      custom_items: [customItem],
    });
  }

  const body = {
    line_items: [],
    custom_items: [customItem],
    currency: { code: currencyCode },
  };

  if (customerId) body.customer_id = Number(customerId);
  if (channelId) body.channel_id = Number(channelId);

  return requestBigCommerce("/carts?include=redirect_urls", body);
}

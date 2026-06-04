# Security Mirror Calculator

In-house replacement for the Calculator Studio + Grid pricing flow.

This proof of concept implements the **Frameless Mirror** calculator from `FINAL EXCEL SM Fin V20.5 (1).xlsx` and exposes it as:

- A Render-ready Node API.
- A BigCommerce embeddable product-page widget.
- A server-side add-to-cart path for trusted calculated pricing.
- Signed quote tokens between quote and add-to-cart.
- URL-driven customer-type locking/hiding (`?cg=House`, `?cg=Contractor`, etc.).
- Option-based image override hooks for Hostinger-hosted images.
- Interactive gallery thumbnails driven by the quote response.

## Run Locally

```sh
npm test
npm start
```

Open `http://localhost:3000`.

## API

```http
GET /api/calculator/config?type=frameless_mirror
POST /api/calculator/quote
POST /api/cart/add
```

Example quote payload:

```json
{
  "type": "frameless_mirror",
  "customerGroup": "House",
  "item": "Clear Mirror 5mm",
  "widthInches": 24,
  "widthFraction": 0,
  "heightInches": 36,
  "heightFraction": 0,
  "edgeWork": "No",
  "shatterStop": "No",
  "quantity": 1
}
```

This returns the old Calculator Studio screenshot result:

```json
{
  "quoteToken": "eyJ...",
  "price": {
    "unitCad": 67.86,
    "unitUsd": 48.86,
    "subtotalCad": 67.86,
    "subtotalUsd": 48.86
  },
  "sku": "FRAMELESS-CM5MM-CUSTOM",
  "description": "FRAMELESS-Series-Item Clear Mirror 5mm-Width24xHeight36- No- No Shatter Stop"
}
```

`/api/cart/add` validates `quoteToken` and rejects tampered quote payloads before calling BigCommerce.

## BigCommerce Embed

Upload or serve these from Render:

- `/security-mirror-widget.css`
- `/security-mirror-widget.js`

Stencil product page snippet:

```html
<link rel="stylesheet" href="https://YOUR-RENDER-APP.onrender.com/security-mirror-widget.css">
<div id="security-mirror-calculator"></div>
<script src="https://YOUR-RENDER-APP.onrender.com/security-mirror-widget.js"></script>
<script>
  window.SecurityMirrorCalculator.init({
    root: "#security-mirror-calculator",
    apiBase: "https://YOUR-RENDER-APP.onrender.com",
    type: "frameless_mirror",
    customerGroup: "{{customer.customer_group_name}}",
    hideCustomerField: true
  });
</script>
```

A ready-to-paste copy also lives at [docs/bigcommerce-frameless-snippet.html](/Users/prateekrana/Documents/BC/docs/bigcommerce-frameless-snippet.html).

## Customer-type specific links

The widget auto-locks customer group from URL query params and hides the selector:

- `?cg=Guest`
- `?cg=Contractor`
- `?cg=House`
- `?cg=Special`
- `?cg=Elite`
- `?cg=Platinum`

Examples:

- `https://YOUR-RENDER-APP.onrender.com/demo.html?cg=Contractor`
- `https://securitymirror.com/frameless-mirror-special/?cg=House`

## Option-based image switching (Hostinger)

Configure image overrides in [src/data/framelessMirror.js](/Users/prateekrana/Documents/BC/src/data/framelessMirror.js) under `images.optionImageOverrides`.

Example entry:

```js
{
  item: "Clear Mirror 5mm",
  edgeWork: "Polished Edge",
  shatterStop: "Yes",
  primaryImageUrl: "https://your-hostinger-url/Images/custom-main.png",
  gallery: [
    "https://your-hostinger-url/Images/custom-1.png",
    "https://your-hostinger-url/Images/custom-2.png"
  ]
}
```

The widget automatically swaps the primary image and thumbnail gallery when an override matches the selected item/options.

## Render Environment

Required only for live add-to-cart:

```sh
BIGCOMMERCE_STORE_HASH=...
BIGCOMMERCE_ACCESS_TOKEN=...
BIGCOMMERCE_CART_CURRENCY=CAD
ALLOWED_ORIGIN=https://securitymirror.com
QUOTE_SIGNING_SECRET=replace-with-random-secret
REQUIRE_QUOTE_TOKEN=true
```

Create the token under **Settings → Store-level API accounts** in BigCommerce. For this cart flow, give it Carts modify access; the server adds custom items through the V3 Cart API and requests `include=redirect_urls` so the storefront can send the shopper to the BigCommerce cart after a successful add.

For staging plus production, `ALLOWED_ORIGIN` can be comma-separated:

```sh
ALLOWED_ORIGIN=https://store-abc.mybigcommerce.com,https://securitymirror.com
```

Without BigCommerce credentials, `/api/cart/add` recalculates and validates the quote, then returns `bigcommerce_not_configured`.

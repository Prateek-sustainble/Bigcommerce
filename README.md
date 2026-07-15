# Security Mirror Calculator

In-house replacement for the Calculator Studio + Grid pricing flow.

This implements the Security Mirror pricing calculators from `FINAL EXCEL SM Fin V20.5 (1).xlsx` and exposes them as:

- A Render-ready Node API.
- A BigCommerce embeddable product-page widget.
- A server-side add-to-cart path for trusted calculated pricing.
- Signed quote tokens between quote and add-to-cart.
- URL-driven customer-type locking/hiding (`?cg=House`, `?cg=Contractor`, etc.).
- Option-based image override hooks for Hostinger-hosted images.
- Interactive gallery thumbnails driven by the quote response.

Supported calculator types:

`frameless_mirror`, `cut_glass`, `shelves`, `series_855`, `series_3205`, `kick_plates`, `antique`, `u_guard`, `corner_guard`, `j_mould`, `series_850`, `series_850_ft`, `series_3200`, `series_3200_ft`, `series_3300`, `series_4100`, `convex_domes`.

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

Customer-group pricing is driven by the calculator backend, not by BigCommerce product price lists. The storefront only supplies the logged-in customer context (`customer_id` and `customer_group_name`), and the widget locks the group field so the customer sees the correct tier without changing the theme layout.

## BigCommerce Embed

Upload or serve these from Render:

- `/security-mirror-widget.css`
- `/security-mirror-widget.js`

Stencil product page snippet:

```html
<link rel="stylesheet" href="https://security-mirror-calculator.onrender.com/security-mirror-widget.css">
<div id="security-mirror-calculator" data-sm-type="frameless_mirror"></div>
<script src="https://security-mirror-calculator.onrender.com/security-mirror-widget.js"></script>
<script>
  window.SecurityMirrorCalculator.init({
    root: "#security-mirror-calculator",
    apiBase: "https://security-mirror-calculator.onrender.com",
    customerGroup: "{{customer.customer_group_name}}",
    hideCustomerField: true
  });
</script>
```

A ready-to-paste copy also lives at [docs/bigcommerce-frameless-snippet.html](/Users/prateekrana/Documents/BC/docs/bigcommerce-frameless-snippet.html).

Duplicate the template per product family and change only `data-sm-type`. For example, use `series_3200` on a Series 3200 product page and `kick_plates` on a Kick Plates product page.

Important: do not add the next product family inside the same shared `single-details.html` block if that file is used by multiple products. Create a sibling custom product template for the next family, paste the same embed there, and change only `data-sm-type`.

For shelf products, use `sm_type="series_855"` for [Series 855 Steel Shelves](https://securitymirror.com/series-855-steel-shelves-sp2h/) and `sm_type="series_3205"` for [Series 3205 Steel Shelves](https://securitymirror.com/copy-of-series-3205-steel-shelves/). Both calculators reuse the same shelf pricing formula; they just start on different fixed shelf series and no longer show the series dropdown.

### Creating and assigning product-family templates

In your BigCommerce theme, create custom product templates under `templates/pages/custom/product/` and start each one by copying `templates/pages/product.html` from the base theme. Give each file a clear name like `frameless-mirror.html` or `kick-plates.html`, then place the calculator embed in that file with the matching `data-sm-type`.

Assign the template in BigCommerce by editing the product and choosing the file in `Other Details` -> `Template Layout File`. If you want to assign many products at once, use the Storefront Custom Template Associations API with `entity_type: "product"` and the same `file_name` as the template file.

## Customer-type specific links

The widget auto-locks customer group from URL query params and hides the selector:

- `?cg=Guest`
- `?cg=Contractor`
- `?cg=House`
- `?cg=Special`
- `?cg=Elite`
- `?cg=Platinum`

Examples:

- `https://security-mirror-calculator.onrender.com/demo.html?type=kick_plates&cg=Contractor`
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

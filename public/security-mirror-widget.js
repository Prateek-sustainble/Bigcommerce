(function () {
  const defaults = {
    root: "#security-mirror-calculator",
    apiBase: "",
    type: "frameless_mirror",
    customerGroup: "House",
    customerId: null,
    contactEmail: "smi@securitymirror.com",
    defaultItem: "",
    hideCustomerField: false,
    hideItemField: false,
    lockCustomerGroup: false,
  };

  const fractionOptions = [
    ["0", "0"],
    ["0.0625", "1/16"],
    ["0.125", "1/8"],
    ["0.1875", "3/16"],
    ["0.25", "1/4"],
    ["0.3125", "5/16"],
    ["0.375", "3/8"],
    ["0.4375", "7/16"],
    ["0.5", "1/2"],
    ["0.5625", "9/16"],
    ["0.625", "5/8"],
    ["0.6875", "11/16"],
    ["0.75", "3/4"],
    ["0.8125", "13/16"],
    ["0.875", "7/8"],
    ["0.9375", "15/16"],
  ];

  function qs(root, selector) {
    return root.querySelector(selector);
  }

  function money(value) {
    return Number(value || 0).toFixed(2);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function optionMarkup(values) {
    return values
      .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
      .join("");
  }

  function fractionOptionMarkup(field) {
    return (field.fractionOptions || fractionOptions)
      .map((option) => {
        const value = Array.isArray(option) ? option[0] : option.value ?? option;
        const label = Array.isArray(option) ? option[1] : option.label ?? value;
        return `<option value="${escapeHtml(value)}">${escapeHtml(label || value)}</option>`;
      })
      .join("");
  }

  function inchesControlMarkup(field, inchesName, defaultValue) {
    const value = field.defaultInches ?? defaultValue ?? 0;
    if (Array.isArray(field.inchesOptions) && field.inchesOptions.length) {
      const options = field.inchesOptions
        .map((option) => {
          const optionValue = Array.isArray(option) ? option[0] : option.value ?? option;
          const label = Array.isArray(option) ? option[1] : option.label ?? optionValue;
          const selected = String(optionValue) === String(value) ? " selected" : "";
          return `<option value="${escapeHtml(optionValue)}"${selected}>${escapeHtml(label)}</option>`;
        })
        .join("");
      return `<select data-sm-field="${escapeHtml(inchesName)}">${options}</select>`;
    }

    const min = field.min ?? 0;
    const max = field.max ?? 120;
    return `<input data-sm-field="${escapeHtml(inchesName)}" type="number" min="${escapeHtml(min)}" max="${escapeHtml(max)}" step="1" value="${escapeHtml(value)}">`;
  }

  function swatchMarkup(field) {
    const defaultValue = field.default ?? (field.options || [])[0] ?? "";
    const swatches = (field.swatches || (field.options || []).map((value) => ({ value, label: value }))).filter(Boolean);
    return swatches
      .map((swatch) => {
        const value = swatch.value ?? swatch.label ?? "";
        const label = swatch.label || value;
        const style = swatch.imageUrl
          ? `background-image:url('${escapeHtml(swatch.imageUrl)}')`
          : swatch.color
            ? `background:${escapeHtml(swatch.color)}`
            : "";
        return `
          <button
            class="sm-swatch${String(value) === String(defaultValue) ? " is-active" : ""}"
            type="button"
            data-sm-swatch-value="${escapeHtml(value)}"
            title="${escapeHtml(label)}"
            aria-label="${escapeHtml(label)}"
            aria-pressed="${String(value) === String(defaultValue) ? "true" : "false"}"
          >
            <span class="sm-swatch__sample" style="${style}"></span>
          </button>
        `;
      })
      .join("");
  }

  function payload(root, options) {
    const data = { type: options.type, customerId: options.customerId ?? null };
    root.querySelectorAll("[data-sm-field]").forEach((field) => {
      const name = field.dataset.smField;
      if (!name) return;
      if (field.disabled) return;
      if (field.type === "number") {
        data[name] = Number(field.value);
        return;
      }
      data[name] = field.value;
    });
    return data;
  }

  function normalizeCustomerGroup(value) {
    if (!value) return "";
    const normalized = String(value).trim().toLowerCase();
    const map = {
      guest: "Guest",
      contractor: "Contractor",
      house: "House",
      special: "Special",
      elite: "Elite",
      platinum: "Platinum",
      richelieu: "Richelieu",
      "richelieu / hd supply": "Richelieu",
    };
    return map[normalized] || "";
  }

  function customerGroupFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (
      normalizeCustomerGroup(params.get("customerType")) ||
      normalizeCustomerGroup(params.get("customer_group")) ||
      normalizeCustomerGroup(params.get("cg"))
    );
  }

  function allowUrlOverrides() {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  }

  function customerGroupFromRoot(root) {
    if (!root) return "";
    return normalizeCustomerGroup(root.dataset.smCustomerGroup || "");
  }

  function customerIdFromRoot(root) {
    if (!root) return null;
    const rawValue = root.dataset.smCustomerId;
    if (!rawValue) return null;
    const value = Number(rawValue);
    return Number.isFinite(value) ? value : null;
  }

  function usesGuestPricing(customerGroup) {
    return (normalizeCustomerGroup(customerGroup) || "Guest") === "Guest";
  }

  function requiresContactRequest(options) {
    return !options.customerId || usesGuestPricing(options.customerGroup);
  }

  async function requestJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      const error = Object.assign(new Error(json.message || "Request failed."), json);
      error.status = response.status;
      throw error;
    }
    return json;
  }

  const CART_ID_STORAGE_KEY = "sm-calculator-cart-id";

  function loadCartId() {
    try {
      return window.sessionStorage.getItem(CART_ID_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function saveCartId(id) {
    try {
      if (id) window.sessionStorage.setItem(CART_ID_STORAGE_KEY, id);
      else window.sessionStorage.removeItem(CART_ID_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }

  function extractCartId(response) {
    return (
      response?.cart?.data?.id ||
      response?.cart?.id ||
      null
    );
  }

  function setImageSource(image, imageUrl, fallbackImageUrl) {
    if (!image) return;
    image.onerror = () => {
      image.onerror = null;
      image.src = fallbackImageUrl;
    };
    image.src = imageUrl || fallbackImageUrl;
  }

  function conditionAttributes(field) {
    const attributes = [];
    if (field.visibleWhen) {
      attributes.push(`data-sm-visible-when-field="${escapeHtml(field.visibleWhen.field)}"`);
      attributes.push(`data-sm-visible-when-value="${escapeHtml(field.visibleWhen.value)}"`);
    }
    if (field.hiddenWhen) {
      attributes.push(`data-sm-hidden-when-field="${escapeHtml(field.hiddenWhen.field)}"`);
      attributes.push(`data-sm-hidden-when-value="${escapeHtml(field.hiddenWhen.value)}"`);
    }
    return attributes.join(" ");
  }

  function renderField(field) {
    const label = escapeHtml(field.label || field.name);
    const defaultValue = field.default ?? "";
    const condition = conditionAttributes(field);
    if (field.control === "dimension") {
      const inchesName = `${field.name}Inches`;
      const fractionName = `${field.name}Fraction`;
      return `
        <div class="sm-dimension-row" ${condition}>
          <label>${label}</label>
          <div class="sm-number-pair">
            <span>Inches</span>
            ${inchesControlMarkup(field, inchesName, defaultValue)}
          </div>
          <div class="sm-number-pair">
            <span>Fraction</span>
            <select data-sm-field="${escapeHtml(fractionName)}" data-sm-fraction="true">${fractionOptionMarkup(field)}</select>
          </div>
        </div>
      `;
    }
    if (field.control === "number") {
      return `
        <div class="sm-row" ${condition}>
          <label>${label}</label>
          <input data-sm-field="${escapeHtml(field.name)}" type="number" min="${escapeHtml(field.min ?? 0)}" max="${escapeHtml(field.max ?? "")}" step="${escapeHtml(field.step ?? 1)}" value="${escapeHtml(defaultValue)}">
        </div>
      `;
    }
    if (field.control === "swatch") {
      return `
        <div class="sm-row sm-swatch-row" data-sm-swatch-row="${escapeHtml(field.name)}" ${condition}>
          <label>
            <span>${label}</span>
            <strong data-sm-swatch-label="${escapeHtml(field.name)}">${escapeHtml(defaultValue)}</strong>
          </label>
          <div class="sm-swatch-group">
            <input data-sm-field="${escapeHtml(field.name)}" type="hidden" value="${escapeHtml(defaultValue)}">
            ${swatchMarkup(field)}
          </div>
        </div>
      `;
    }
    return `
      <div class="sm-row" ${condition}>
        <label>${label}</label>
        <select data-sm-field="${escapeHtml(field.name)}">${optionMarkup(field.options || [])}</select>
      </div>
    `;
  }

  function conditionMatches(root, fieldName, expectedValue) {
    const field = qs(root, `[data-sm-field='${fieldName}']`);
    return String(field?.value ?? "") === String(expectedValue ?? "");
  }

  function syncConditionalFields(root) {
    root.querySelectorAll("[data-sm-visible-when-field], [data-sm-hidden-when-field]").forEach((row) => {
      const visibleField = row.dataset.smVisibleWhenField;
      const visibleValue = row.dataset.smVisibleWhenValue;
      const hiddenField = row.dataset.smHiddenWhenField;
      const hiddenValue = row.dataset.smHiddenWhenValue;
      const hiddenByVisibleRule = visibleField ? !conditionMatches(root, visibleField, visibleValue) : false;
      const hiddenByHiddenRule = hiddenField ? conditionMatches(root, hiddenField, hiddenValue) : false;
      const shouldHide = hiddenByVisibleRule || hiddenByHiddenRule;

      row.hidden = shouldHide;
      row.classList.toggle("sm-row--hidden", shouldHide);
      row.setAttribute("aria-hidden", shouldHide ? "true" : "false");
      row.querySelectorAll("[data-sm-field]").forEach((field) => {
        field.disabled = shouldHide;
      });
    });
  }

  function renderShell(root, config, options) {
    const fields = config.fields || [
      { name: "item", label: "Finishing", control: "select", options: config.items || [], default: (config.items || [])[0] },
      { name: "width", label: "Width", control: "dimension", defaultInches: 24, min: 12, max: 96 },
      { name: "height", label: "Height", control: "dimension", defaultInches: 36, min: 12, max: 96 },
      { name: "edgeWork", label: "Edge Work", control: "select", options: config.edgeWorks || [], default: (config.edgeWorks || [])[0] },
      {
        name: "shatterStop",
        label: "Shatter Stop",
        control: "select",
        options: config.shatterStopOptions || [],
        default: (config.shatterStopOptions || [])[0],
      },
    ];
    const customerGroups = config.customerGroups || ["House", "Guest", "Contractor", "Special", "Elite", "Platinum"];
    root.className = "sm-calculator";
    root.innerHTML = `
      <div class="sm-calculator__controls">
        <div class="sm-dimensions">
          ${fields.map(renderField).join("")}
        </div>

        <div class="sm-row sm-row--muted">
          <label>Price CAD</label>
          <strong data-sm-output="unitCad">0.00</strong>
        </div>

        <div class="sm-row sm-row--muted">
          <label>Price USD</label>
          <strong data-sm-output="unitUsd">0.00</strong>
        </div>

        <div class="sm-row" data-sm-row="customerGroup">
          <label>Customer</label>
          <select data-sm-field="customerGroup">${optionMarkup(customerGroups)}</select>
        </div>

        <div class="sm-row">
          <label>Quantity</label>
          <input data-sm-field="quantity" type="number" min="1" step="1" value="1">
        </div>

        <div class="sm-row sm-row--muted">
          <label>Subtotal CAD</label>
          <strong data-sm-output="subtotalCad">0.00</strong>
        </div>

        <div class="sm-row sm-row--muted">
          <label>Subtotal USD</label>
          <strong data-sm-output="subtotalUsd">0.00</strong>
        </div>

        <output class="sm-status" data-sm-output="status"></output>
        <output class="sm-code" data-sm-output="sku"></output>
        <output class="sm-code sm-code--description" data-sm-output="description"></output>

        <button class="sm-add" type="button" data-sm-action="add">Add to cart</button>
      </div>

      <div class="sm-calculator__media">
        <img data-sm-output="image" alt="">
        <div class="sm-thumb"><img data-sm-output="thumb" alt=""></div>
        <div class="sm-gallery" data-sm-output="gallery"></div>
        <div class="sm-docs">
          <a data-sm-output="datasheetEn" target="_blank" rel="noreferrer">Datasheet</a>
          <a data-sm-output="datasheetFr" target="_blank" rel="noreferrer">Datasheet (French)</a>
        </div>
      </div>

      <section class="sm-contact" data-sm-contact-panel hidden>
        <h3>Please provide your contact information below and one of our representatives will be in touch to assist you with your order.</h3>
        <form class="sm-contact__form" data-sm-contact-form>
          <label>
            <span>Name</span>
            <input data-sm-contact-field="name" autocomplete="name" required>
          </label>
          <label>
            <span>Street address</span>
            <input data-sm-contact-field="streetAddress" autocomplete="street-address">
          </label>
          <label>
            <span>Email</span>
            <input data-sm-contact-field="email" type="email" autocomplete="email" required>
          </label>
          <label>
            <span>City</span>
            <input data-sm-contact-field="city" autocomplete="address-level2">
          </label>
          <label>
            <span>Company</span>
            <input data-sm-contact-field="company" autocomplete="organization">
          </label>
          <div class="sm-contact__split">
            <label>
              <span>Province / State</span>
              <input data-sm-contact-field="provinceState" autocomplete="address-level1">
            </label>
            <label>
              <span>Postal / Zip Code</span>
              <input data-sm-contact-field="postalCode" autocomplete="postal-code">
            </label>
          </div>
          <label>
            <span>Phone</span>
            <input data-sm-contact-field="phone" type="tel" autocomplete="tel">
          </label>
          <label>
            <span>Country</span>
            <select data-sm-contact-field="country" autocomplete="country-name">
              <option value=""></option>
              <option value="Canada">Canada</option>
              <option value="United States">United States</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label class="sm-contact__comments">
            <span>Comments / questions :</span>
            <textarea data-sm-contact-field="comments" rows="3"></textarea>
          </label>
          <output class="sm-contact__status" data-sm-output="contactStatus"></output>
          <button class="sm-request" type="submit" data-sm-action="request">Request</button>
        </form>
      </section>
    `;

    for (const field of fields) {
      if (field.control !== "select" || field.default === undefined) continue;
      const select = qs(root, `[data-sm-field='${field.name}']`);
      if (select) select.value = String(field.default);
    }

    if (options.defaultItem) {
      const itemSelect = qs(root, "[data-sm-field='item']");
      if (itemSelect) itemSelect.value = options.defaultItem;
    }

    qs(root, "[data-sm-field='customerGroup']").value = options.customerGroup;
    if (options.hideCustomerField || options.lockCustomerGroup) {
      qs(root, "[data-sm-row='customerGroup']").classList.add("sm-row--hidden");
    }
    if (options.lockCustomerGroup) {
      qs(root, "[data-sm-field='customerGroup']").setAttribute("disabled", "disabled");
    }
    if (options.hideItemField) {
      const itemRow = qs(root, "[data-sm-field='item']")?.closest(".sm-row, .sm-dimension-row");
      if (itemRow) itemRow.classList.add("sm-row--hidden");
      const itemSelect = qs(root, "[data-sm-field='item']");
      if (itemSelect) itemSelect.setAttribute("disabled", "disabled");
    }

    applyAccessMode(root, options);
    syncConditionalFields(root);
  }

  function applyAccessMode(root, options) {
    const contactRequired = requiresContactRequest(options);
    const addButton = qs(root, "[data-sm-action='add']");
    const contactPanel = qs(root, "[data-sm-contact-panel]");

    root.dataset.smContactRequired = contactRequired ? "true" : "false";
    if (contactPanel) contactPanel.hidden = !contactRequired;
    if (!addButton) return;

    addButton.disabled = contactRequired;
    addButton.classList.toggle("sm-add--contact-required", contactRequired);
    addButton.title = contactRequired ? "Please submit your contact information to proceed." : "";
  }

  function applyQuote(root, quote) {
    if (!quote.ok) {
      qs(root, "[data-sm-output='status']").textContent = quote.message || "Not available";
      qs(root, "[data-sm-action='add']").disabled = true;
      root.dataset.smQuoteToken = "";
      return;
    }

    qs(root, "[data-sm-action='add']").disabled = requiresContactRequest(root.smOptions || {}) ? true : false;
    qs(root, "[data-sm-output='status']").textContent = "";
    qs(root, "[data-sm-output='unitCad']").textContent = money(quote.price.unitCad);
    qs(root, "[data-sm-output='unitUsd']").textContent = money(quote.price.unitUsd);
    qs(root, "[data-sm-output='subtotalCad']").textContent = money(quote.price.subtotalCad);
    qs(root, "[data-sm-output='subtotalUsd']").textContent = money(quote.price.subtotalUsd);
    qs(root, "[data-sm-output='sku']").textContent = quote.sku;
    qs(root, "[data-sm-output='description']").textContent = quote.description;
    const image = qs(root, "[data-sm-output='image']");
    const thumb = qs(root, "[data-sm-output='thumb']");
    const fallbackImageUrl = quote.assets.fallbackImageUrl || "/assets/frameless-mirror-placeholder.svg";
    root.dataset.smFallbackImageUrl = fallbackImageUrl;
    setImageSource(image, quote.assets.primaryImageUrl, fallbackImageUrl);
    setImageSource(thumb, quote.assets.primaryImageUrl, fallbackImageUrl);
    qs(root, "[data-sm-output='datasheetEn']").href = quote.assets.datasheets.en;
    qs(root, "[data-sm-output='datasheetFr']").href = quote.assets.datasheets.fr;
    root.dataset.smQuoteToken = quote.quoteToken || "";
    renderGallery(root, quote.assets?.gallery || [], fallbackImageUrl);
  }

  function renderGallery(root, gallery, fallbackImageUrl) {
    const media = qs(root, "[data-sm-output='gallery']");
    if (!media) return;

    const images = (gallery || []).filter(Boolean);
    if (images.length < 2) {
      media.hidden = true;
      media.innerHTML = "";
      root.dataset.smGallery = "[]";
      root.dataset.smActiveGalleryUrl = "";
      return;
    }

    media.hidden = false;
    root.dataset.smGallery = JSON.stringify(images);
    root.dataset.smActiveGalleryUrl = images[0];
    media.innerHTML = images
      .map(
        (url, index) => `
          <button class="sm-gallery__button${index === 0 ? " is-active" : ""}" type="button" data-sm-gallery-url="${escapeHtml(url)}" aria-label="View image ${index + 1}">
            <img src="${escapeHtml(url)}" alt="">
          </button>
        `,
      )
      .join("");
    media.querySelectorAll("img").forEach((image) => {
      const button = image.closest("button[data-sm-gallery-url]");
      image.onerror = () => {
        image.onerror = null;
        const wasActive = button?.classList.contains("is-active");
        const buttonUrl = button?.dataset.smGalleryUrl || "";
        button?.remove();

        const remainingButtons = media.querySelectorAll("button[data-sm-gallery-url]");
        if (!remainingButtons.length) {
          media.hidden = true;
          root.dataset.smGallery = "[]";
          root.dataset.smActiveGalleryUrl = "";
          return;
        }

        if (wasActive || root.dataset.smActiveGalleryUrl === buttonUrl) {
          const nextButton = remainingButtons[0];
          activateGalleryImage(root, nextButton.dataset.smGalleryUrl, fallbackImageUrl);
        }
      };
    });
  }

  function activateGalleryImage(root, imageUrl, fallbackImageUrl) {
    if (!imageUrl) return;

    const image = qs(root, "[data-sm-output='image']");
    const thumb = qs(root, "[data-sm-output='thumb']");
    const resolvedFallback = fallbackImageUrl || root.dataset.smFallbackImageUrl || "/assets/frameless-mirror-placeholder.svg";
    setImageSource(image, imageUrl, resolvedFallback);
    setImageSource(thumb, imageUrl, resolvedFallback);
    root.dataset.smActiveGalleryUrl = imageUrl;

    root.querySelectorAll("button[data-sm-gallery-url]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.smGalleryUrl === imageUrl);
    });
  }

  function activateSwatch(root, button) {
    const row = button.closest("[data-sm-swatch-row]");
    if (!row) return;
    const name = row.dataset.smSwatchRow;
    const input = qs(row, `[data-sm-field='${name}']`);
    if (!input) return;

    input.value = button.dataset.smSwatchValue || "";
    const label = qs(row, `[data-sm-swatch-label='${name}']`);
    if (label) label.textContent = input.value;

    row.querySelectorAll("button[data-sm-swatch-value]").forEach((swatchButton) => {
      const isActive = swatchButton === button;
      swatchButton.classList.toggle("is-active", isActive);
      swatchButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  async function updateQuote(root, options) {
    try {
      const quote = await requestJson(`${options.apiBase}/api/calculator/quote`, payload(root, options));
      root.smLastQuote = quote;
      applyQuote(root, quote);
    } catch (error) {
      applyQuote(root, error);
    }
  }

  async function addToCart(root, options) {
    if (requiresContactRequest(options)) {
      qs(root, "[data-sm-output='status']").textContent = "Please submit your contact information below to proceed.";
      applyAccessMode(root, options);
      return;
    }

    const button = qs(root, "[data-sm-action='add']");
    button.disabled = true;
    button.textContent = "Adding...";
    try {
      const requestPayload = payload(root, options);
      requestPayload.quoteToken = root.dataset.smQuoteToken || undefined;
      const existingCartId = loadCartId();
      if (existingCartId) requestPayload.cartId = existingCartId;
      let response;
      try {
        response = await requestJson(`${options.apiBase}/api/cart/add`, requestPayload);
      } catch (error) {
        // If the saved cart is gone (deleted/expired), drop it and retry once
        // so we create a fresh cart instead of surfacing a 404 to the shopper.
        if (existingCartId && (error.status === 404 || error.status === 422)) {
          saveCartId("");
          delete requestPayload.cartId;
          response = await requestJson(`${options.apiBase}/api/cart/add`, requestPayload);
        } else {
          throw error;
        }
      }
      const newCartId = extractCartId(response);
      if (newCartId) saveCartId(newCartId);
      const redirect =
        response.cart?.data?.redirect_urls?.cart_url ||
        response.cart?.data?.redirect_urls?.checkout_url ||
        response.cart?.redirect_urls?.cart_url;
      if (redirect) {
        window.location.assign(redirect);
        return;
      }
      qs(root, "[data-sm-output='status']").textContent = response.message || "Added.";
    } catch (error) {
      qs(root, "[data-sm-output='status']").textContent = error.message || "Cart is not configured yet.";
    } finally {
      button.disabled = false;
      button.textContent = "Add to cart";
    }
  }

  function contactPayload(root, options) {
    const contact = {};
    root.querySelectorAll("[data-sm-contact-field]").forEach((field) => {
      contact[field.dataset.smContactField] = field.value || "";
    });

    return {
      contact,
      pageUrl: window.location.href,
      customerId: options.customerId ?? null,
      customerGroup: options.customerGroup || "Guest",
      calculator: payload(root, options),
      calculation: root.smLastQuote || null,
    };
  }

  function emailBodyForRequest(root, options) {
    const request = contactPayload(root, options);
    const calculation = request.calculation || {};
    const lines = [
      "Security Mirror order assistance request",
      "",
      "Contact",
      `Name: ${request.contact.name || ""}`,
      `Email: ${request.contact.email || ""}`,
      `Company: ${request.contact.company || ""}`,
      `Phone: ${request.contact.phone || ""}`,
      `Street address: ${request.contact.streetAddress || ""}`,
      `City: ${request.contact.city || ""}`,
      `Province / State: ${request.contact.provinceState || ""}`,
      `Postal / Zip Code: ${request.contact.postalCode || ""}`,
      `Country: ${request.contact.country || ""}`,
      "",
      "Comments / questions",
      request.contact.comments || "",
      "",
      "Calculator details",
      `Page: ${request.pageUrl}`,
      `Customer group: ${request.customerGroup}`,
      `Calculator type: ${request.calculator.type || ""}`,
      `SKU: ${calculation.sku || ""}`,
      `Description: ${calculation.description || ""}`,
      `Price CAD: ${calculation.price?.subtotalCad ?? ""}`,
      `Price USD: ${calculation.price?.subtotalUsd ?? ""}`,
      `Selections: ${JSON.stringify(calculation.selections || request.calculator)}`,
    ];
    return lines.join("\n");
  }

  function openEmailFallback(root, options) {
    const subject = encodeURIComponent("Security Mirror order assistance request");
    const body = encodeURIComponent(emailBodyForRequest(root, options));
    window.location.href = `mailto:${options.contactEmail}?subject=${subject}&body=${body}`;
  }

  async function submitContactRequest(root, options) {
    const form = qs(root, "[data-sm-contact-form]");
    const status = qs(root, "[data-sm-output='contactStatus']");
    const button = qs(root, "[data-sm-action='request']");
    if (!form.reportValidity()) return;

    button.disabled = true;
    status.textContent = "Sending...";
    try {
      const response = await requestJson(`${options.apiBase}/api/contact/request`, contactPayload(root, options));
      status.textContent = response.message || "Thank you. We received your request.";
      form.reset();
    } catch (error) {
      if (error.status === "contact_request_not_configured") {
        status.textContent = "Opening your email app to send the request.";
        openEmailFallback(root, { ...options, contactEmail: error.recipient || options.contactEmail });
      } else {
        status.textContent = error.message || "Unable to send. Please try again.";
      }
    } finally {
      button.disabled = false;
    }
  }

  async function init(userOptions) {
    const urlOverridesAllowed = allowUrlOverrides();
    const urlCustomerGroup = urlOverridesAllowed ? customerGroupFromUrl() : "";
    const rootRef = (userOptions || {}).root || defaults.root;
    const root = typeof rootRef === "string" ? document.querySelector(rootRef) : rootRef;
    if (!root) return;
    const rootCustomerGroup = customerGroupFromRoot(root);
    const rootCustomerId = customerIdFromRoot(root);

    const urlType = urlOverridesAllowed ? new URLSearchParams(window.location.search).get("type") : null;
    const inferredType =
      (userOptions || {}).type ||
      root.dataset.smType ||
      urlType ||
      defaults.type;
    const options = {
      ...defaults,
      ...(userOptions || {}),
      type: inferredType,
      customerId: (userOptions || {}).customerId ?? rootCustomerId ?? null,
      defaultItem: (userOptions || {}).defaultItem || root.dataset.smDefaultItem || defaults.defaultItem,
      customerGroup: urlCustomerGroup || (userOptions && userOptions.customerGroup) || rootCustomerGroup || defaults.customerGroup,
      lockCustomerGroup:
        Boolean(urlCustomerGroup) ||
        Boolean(rootCustomerGroup) ||
        Boolean((userOptions || {}).lockCustomerGroup) ||
        Boolean((userOptions || {}).hideCustomerField),
      hideItemField: Boolean((userOptions || {}).hideItemField) || root.dataset.smHideItemField === "true",
      hideCustomerField:
        Boolean(urlCustomerGroup) ||
        Boolean(rootCustomerGroup) ||
        Boolean((userOptions || {}).hideCustomerField) ||
        Boolean((userOptions || {}).lockCustomerGroup),
    };
    root.smOptions = options;

    const configResponse = await fetch(`${options.apiBase}/api/calculator/config?type=${options.type}`).then((response) =>
      response.json(),
    );
    renderShell(root, configResponse.config, options);
    root.addEventListener("input", () => {
      syncConditionalFields(root);
      updateQuote(root, options);
    });
    root.addEventListener("change", () => {
      syncConditionalFields(root);
      updateQuote(root, options);
    });
    root.addEventListener("click", (event) => {
      const swatchButton = event.target.closest("button[data-sm-swatch-value]");
      if (swatchButton && root.contains(swatchButton)) {
        activateSwatch(root, swatchButton);
        syncConditionalFields(root);
        updateQuote(root, options);
        return;
      }

      const button = event.target.closest("button[data-sm-gallery-url]");
      if (!button || !root.contains(button)) return;
      activateGalleryImage(root, button.dataset.smGalleryUrl, root.dataset.smFallbackImageUrl);
    });
    qs(root, "[data-sm-action='add']").addEventListener("click", () => addToCart(root, options));
    qs(root, "[data-sm-contact-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      submitContactRequest(root, options);
    });
    await updateQuote(root, options);
  }

  window.SecurityMirrorCalculator = { init };
})();

(function () {
  const defaults = {
    root: "#security-mirror-calculator",
    apiBase: "",
    type: "frameless_mirror",
    customerGroup: "House",
    customerId: null,
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

  function createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label || value;
    return option;
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

  function payload(root, options) {
    const data = { type: options.type, customerId: options.customerId ?? null };
    root.querySelectorAll("[data-sm-field]").forEach((field) => {
      const name = field.dataset.smField;
      if (!name) return;
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

  async function requestJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) throw json;
    return json;
  }

  function setImageSource(image, imageUrl, fallbackImageUrl) {
    if (!image) return;
    image.onerror = () => {
      image.onerror = null;
      image.src = fallbackImageUrl;
    };
    image.src = imageUrl || fallbackImageUrl;
  }

  function renderField(field) {
    const label = escapeHtml(field.label || field.name);
    const defaultValue = field.default ?? "";
    if (field.control === "dimension") {
      const min = field.min ?? 0;
      const max = field.max ?? 120;
      const inchesName = `${field.name}Inches`;
      const fractionName = `${field.name}Fraction`;
      return `
        <div class="sm-dimension-row">
          <label>${label}</label>
          <div class="sm-number-pair">
            <span>Inches</span>
            <input data-sm-field="${escapeHtml(inchesName)}" type="number" min="${escapeHtml(min)}" max="${escapeHtml(max)}" step="1" value="${escapeHtml(field.defaultInches ?? defaultValue ?? 0)}">
          </div>
          <div class="sm-number-pair">
            <span>Fraction</span>
            <select data-sm-field="${escapeHtml(fractionName)}" data-sm-fraction="true"></select>
          </div>
        </div>
      `;
    }
    if (field.control === "number") {
      return `
        <div class="sm-row">
          <label>${label}</label>
          <input data-sm-field="${escapeHtml(field.name)}" type="number" min="${escapeHtml(field.min ?? 0)}" max="${escapeHtml(field.max ?? "")}" step="${escapeHtml(field.step ?? 1)}" value="${escapeHtml(defaultValue)}">
        </div>
      `;
    }
    return `
      <div class="sm-row">
        <label>${label}</label>
        <select data-sm-field="${escapeHtml(field.name)}">${optionMarkup(field.options || [])}</select>
      </div>
    `;
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
    `;

    root.querySelectorAll("[data-sm-fraction='true']").forEach((select) => {
      for (const [value, label] of fractionOptions) select.append(createOption(value, label));
    });
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
  }

  function applyQuote(root, quote) {
    if (!quote.ok) {
      qs(root, "[data-sm-output='status']").textContent = quote.message || "Not available";
      qs(root, "[data-sm-action='add']").disabled = true;
      root.dataset.smQuoteToken = "";
      return;
    }

    qs(root, "[data-sm-action='add']").disabled = false;
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
    const button = qs(root, "[data-sm-action='add']");
    button.disabled = true;
    button.textContent = "Adding...";
    try {
      const requestPayload = payload(root, options);
      requestPayload.quoteToken = root.dataset.smQuoteToken || undefined;
      const response = await requestJson(`${options.apiBase}/api/cart/add`, requestPayload);
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

    const configResponse = await fetch(`${options.apiBase}/api/calculator/config?type=${options.type}`).then((response) =>
      response.json(),
    );
    renderShell(root, configResponse.config, options);
    root.addEventListener("input", () => updateQuote(root, options));
    root.addEventListener("change", () => updateQuote(root, options));
    root.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-sm-gallery-url]");
      if (!button || !root.contains(button)) return;
      activateGalleryImage(root, button.dataset.smGalleryUrl, root.dataset.smFallbackImageUrl);
    });
    qs(root, "[data-sm-action='add']").addEventListener("click", () => addToCart(root, options));
    await updateQuote(root, options);
  }

  window.SecurityMirrorCalculator = { init };
})();

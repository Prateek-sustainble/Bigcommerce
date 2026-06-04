(function () {
  const defaults = {
    root: "#security-mirror-calculator",
    apiBase: "",
    type: "frameless_mirror",
    customerGroup: "House",
    hideCustomerField: false,
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

  function optionMarkup(values) {
    return values.map((value) => `<option value="${String(value)}">${String(value)}</option>`).join("");
  }

  function payload(root, options) {
    return {
      type: options.type,
      customerGroup: qs(root, "[data-sm-field='customerGroup']").value,
      item: qs(root, "[data-sm-field='item']").value,
      widthInches: Number(qs(root, "[data-sm-field='widthInches']").value),
      widthFraction: Number(qs(root, "[data-sm-field='widthFraction']").value),
      heightInches: Number(qs(root, "[data-sm-field='heightInches']").value),
      heightFraction: Number(qs(root, "[data-sm-field='heightFraction']").value),
      edgeWork: qs(root, "[data-sm-field='edgeWork']").value,
      shatterStop: qs(root, "[data-sm-field='shatterStop']").value,
      quantity: Number(qs(root, "[data-sm-field='quantity']").value),
    };
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

  function renderShell(root, config, options) {
    root.className = "sm-calculator";
    root.innerHTML = `
      <div class="sm-calculator__controls">
        <div class="sm-row">
          <label>Finishing</label>
          <select data-sm-field="item">${optionMarkup(config.items)}</select>
        </div>

        <div class="sm-dimensions">
          <div class="sm-dimension-row">
            <label>Width</label>
            <div class="sm-number-pair">
              <span>Inches</span>
              <input data-sm-field="widthInches" type="number" min="12" max="96" step="1" value="24">
            </div>
            <div class="sm-number-pair">
              <span>Fraction</span>
              <select data-sm-field="widthFraction"></select>
            </div>
          </div>
          <div class="sm-dimension-row">
            <label>Height</label>
            <div class="sm-number-pair">
              <span>Inches</span>
              <input data-sm-field="heightInches" type="number" min="12" max="96" step="1" value="36">
            </div>
            <div class="sm-number-pair">
              <span>Fraction</span>
              <select data-sm-field="heightFraction"></select>
            </div>
          </div>
        </div>

        <div class="sm-row">
          <label>Edge Work</label>
          <select data-sm-field="edgeWork">${optionMarkup(config.edgeWorks)}</select>
        </div>

        <div class="sm-row">
          <label>Shatter Stop</label>
          <select data-sm-field="shatterStop">${optionMarkup(config.shatterStopOptions)}</select>
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
          <select data-sm-field="customerGroup">
            <option>House</option>
            <option>Guest</option>
            <option>Contractor</option>
            <option>Special</option>
            <option>Elite</option>
            <option>Platinum</option>
          </select>
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

    for (const [, label] of fractionOptions) {
      qs(root, "[data-sm-field='widthFraction']").append(createOption(fractionOptions.find((entry) => entry[1] === label)[0], label));
      qs(root, "[data-sm-field='heightFraction']").append(createOption(fractionOptions.find((entry) => entry[1] === label)[0], label));
    }

    qs(root, "[data-sm-field='customerGroup']").value = options.customerGroup;
    if (options.hideCustomerField || options.lockCustomerGroup) {
      qs(root, "[data-sm-row='customerGroup']").classList.add("sm-row--hidden");
    }
    if (options.lockCustomerGroup) {
      qs(root, "[data-sm-field='customerGroup']").setAttribute("disabled", "disabled");
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

    const images = gallery.length ? gallery : [fallbackImageUrl];
    root.dataset.smGallery = JSON.stringify(images);
    root.dataset.smActiveGalleryIndex = "0";
    media.innerHTML = images
      .map(
        (url, index) => `
          <button class="sm-gallery__button${index === 0 ? " is-active" : ""}" type="button" data-sm-gallery-index="${index}" aria-label="View image ${index + 1}">
            <img src="${url}" alt="">
          </button>
        `,
      )
      .join("");
    media.querySelectorAll("img").forEach((image) => {
      image.onerror = () => {
        image.onerror = null;
        image.src = fallbackImageUrl;
      };
    });
  }

  function activateGalleryImage(root, index) {
    const gallery = JSON.parse(root.dataset.smGallery || "[]");
    const imageUrl = gallery[index];
    if (!imageUrl) return;

    const image = qs(root, "[data-sm-output='image']");
    const thumb = qs(root, "[data-sm-output='thumb']");
    const fallbackImageUrl = root.dataset.smFallbackImageUrl || "/assets/frameless-mirror-placeholder.svg";
    setImageSource(image, imageUrl, fallbackImageUrl);
    setImageSource(thumb, imageUrl, fallbackImageUrl);
    root.dataset.smActiveGalleryIndex = String(index);

    root.querySelectorAll("[data-sm-gallery-index]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.smGalleryIndex === String(index));
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
    const urlCustomerGroup = customerGroupFromUrl();
    const options = {
      ...defaults,
      ...(userOptions || {}),
      customerGroup: urlCustomerGroup || (userOptions && userOptions.customerGroup) || defaults.customerGroup,
      lockCustomerGroup:
        Boolean(urlCustomerGroup) ||
        Boolean((userOptions || {}).lockCustomerGroup) ||
        Boolean((userOptions || {}).hideCustomerField),
      hideCustomerField:
        Boolean(urlCustomerGroup) ||
        Boolean((userOptions || {}).hideCustomerField) ||
        Boolean((userOptions || {}).lockCustomerGroup),
    };
    const root = typeof options.root === "string" ? document.querySelector(options.root) : options.root;
    if (!root) return;

    const configResponse = await fetch(`${options.apiBase}/api/calculator/config?type=${options.type}`).then((response) =>
      response.json(),
    );
    renderShell(root, configResponse.config, options);
    root.addEventListener("input", () => updateQuote(root, options));
    root.addEventListener("change", () => updateQuote(root, options));
    root.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-sm-gallery-index]");
      if (!button || !root.contains(button)) return;
      activateGalleryImage(root, Number(button.dataset.smGalleryIndex));
    });
    qs(root, "[data-sm-action='add']").addEventListener("click", () => addToCart(root, options));
    await updateQuote(root, options);
  }

  window.SecurityMirrorCalculator = { init };
})();

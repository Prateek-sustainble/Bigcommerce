import { CAD_TO_USD, CUSTOMER_DISCOUNTS } from "../data/common.js";
import { FRAMELESS_MIRROR_CONFIG } from "../data/framelessMirror.js";

const FRACTION_LABELS = new Map([
  [0, ""],
  [1 / 16, "1/16"],
  [1 / 8, "1/8"],
  [3 / 16, "3/16"],
  [1 / 4, "1/4"],
  [5 / 16, "5/16"],
  [3 / 8, "3/8"],
  [7 / 16, "7/16"],
  [1 / 2, "1/2"],
  [9 / 16, "9/16"],
  [5 / 8, "5/8"],
  [11 / 16, "11/16"],
  [3 / 4, "3/4"],
  [13 / 16, "13/16"],
  [7 / 8, "7/8"],
  [15 / 16, "15/16"],
]);

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function numberOrZero(value) {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parseFraction(value) {
  if (typeof value === "string" && value.includes("/")) {
    const [numerator, denominator] = value.split("/").map(Number);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
  }
  return numberOrZero(value);
}

function roundUpToEvenInches(value) {
  if (Math.abs(value % 2) < 1e-9 && Number.isInteger(value)) return value;
  return Math.ceil(value / 2) * 2;
}

function formatDimension(inches, fraction) {
  const whole = numberOrZero(inches);
  const fractionValue = parseFraction(fraction);
  const label = FRACTION_LABELS.get(fractionValue) || "";
  return label ? `${whole}-${label}` : `${whole}`;
}

function slugifyForImage(value, mode = "lower") {
  const normalized = value.replaceAll(/\s+/g, "_");
  return mode === "upper" ? normalized.toUpperCase() : normalized.toLowerCase();
}

function findItem(label) {
  return FRAMELESS_MIRROR_CONFIG.items.find((item) => item.label === label);
}

function customerMultiplier(customerGroup) {
  const normalizedGroup = customerGroup && CUSTOMER_DISCOUNTS[customerGroup] ? customerGroup : "Guest";
  return {
    group: normalizedGroup,
    multiplier: CUSTOMER_DISCOUNTS[normalizedGroup].frameless_mirror,
  };
}

function imageUrls(itemLabel) {
  const baseUrl = FRAMELESS_MIRROR_CONFIG.images.baseUrl;
  const lower = slugifyForImage(itemLabel, "lower");
  const upper = slugifyForImage(itemLabel, "upper");

  return {
    primaryImageUrl: `${baseUrl}/FRAMELSS_MIRROR_${lower}.png`,
    gallery: [1, 2, 3, 4].map((index) => `${baseUrl}/FRAMELSS_MIRROR_${upper}-${index}.png`),
  };
}

function unavailable(message) {
  return {
    ok: false,
    status: "unavailable",
    message,
    price: null,
  };
}

export function calculateFramelessMirrorQuote(input = {}) {
  const itemLabel = input.item || input.finishing || "Clear Mirror 5mm";
  const item = findItem(itemLabel);
  if (!item) {
    return unavailable(`Unsupported frameless mirror item: ${itemLabel}`);
  }

  const widthInches = numberOrZero(input.widthInches ?? input.width?.inches);
  const widthFraction = parseFraction(input.widthFraction ?? input.width?.fraction);
  const heightInches = numberOrZero(input.heightInches ?? input.height?.inches);
  const heightFraction = parseFraction(input.heightFraction ?? input.height?.fraction);
  const width = widthInches + widthFraction;
  const height = heightInches + heightFraction;
  const edgeWork = input.edgeWork || "No";
  const shatterStop = input.shatterStop || "No";
  const quantity = Math.max(1, Math.trunc(numberOrZero(input.quantity) || 1));
  const { group, multiplier } = customerMultiplier(input.customerGroup);
  const dimensions = FRAMELESS_MIRROR_CONFIG.dimensions;

  if (!FRAMELESS_MIRROR_CONFIG.edgeWorks.includes(edgeWork)) {
    return unavailable(`Unsupported edge work option: ${edgeWork}`);
  }
  if (!FRAMELESS_MIRROR_CONFIG.shatterStopOptions.includes(shatterStop)) {
    return unavailable(`Unsupported shatter stop option: ${shatterStop}`);
  }
  if (width <= 0 || height <= 0) {
    return unavailable("Width and height are required.");
  }
  if (width < dimensions.minWidthInches || height < dimensions.minHeightInches) {
    return unavailable("Size outside min/max allowed");
  }
  if (width > dimensions.maxOneSideInches || height > dimensions.maxOneSideInches) {
    return unavailable("Size outside min/max allowed");
  }
  if (width > dimensions.maxBothSidesInches && height > dimensions.maxBothSidesInches) {
    return unavailable("Size outside min/max allowed");
  }
  if (item.itemType === "Acrylic" && edgeWork !== "No") {
    return unavailable("Polished Not Available");
  }
  if (item.itemType === "Acrylic" && shatterStop === "Yes") {
    return unavailable("Shatter Stop Not Available");
  }

  const normalizedWidth = roundUpToEvenInches(width);
  const normalizedHeight = roundUpToEvenInches(height);
  const squareFeet = (normalizedWidth * normalizedHeight) / 144;
  const basePrice = item.pricePerSquareFoot * squareFeet;
  const perimeterInches = (width + height) * 2;
  const edgeWorkPrice = perimeterInches * item.edgeWorkPerInch[edgeWork];

  // Matches the workbook formula, which uses the whole-inch cells for this add-on.
  const shatterStopSquareFeet = (widthInches * heightInches) / 144;
  const shatterStopPrice = shatterStop === "Yes" ? shatterStopSquareFeet * item.shatterStopPerSquareFoot : 0;
  const priceBeforeSurchargeCad = basePrice + edgeWorkPrice + shatterStopPrice;
  const surchargeCad = priceBeforeSurchargeCad * FRAMELESS_MIRROR_CONFIG.surchargeRate;
  const listCadBeforeCustomerDiscount = priceBeforeSurchargeCad + surchargeCad;
  const unitCad = roundCurrency(listCadBeforeCustomerDiscount * multiplier);
  const unitUsd = roundCurrency(unitCad * CAD_TO_USD);
  const subtotalCad = roundCurrency(unitCad * quantity);
  const subtotalUsd = roundCurrency(unitUsd * quantity);
  const widthLabel = formatDimension(widthInches, widthFraction);
  const heightLabel = formatDimension(heightInches, heightFraction);
  const shatterStopText = shatterStop === "Yes" ? "Shatter Stop Yes" : "No Shatter Stop";
  const sku = `FRAMELESS-${item.abbreviation}-CUSTOM`;
  const description = `FRAMELESS-Series-Item ${item.label}-Width${widthLabel}xHeight${heightLabel}- ${edgeWork}- ${shatterStopText}`;

  return {
    ok: true,
    status: "quoted",
    type: FRAMELESS_MIRROR_CONFIG.key,
    customerGroup: group,
    discountMultiplier: multiplier,
    selections: {
      item: item.label,
      itemType: item.itemType,
      widthInches,
      widthFraction,
      heightInches,
      heightFraction,
      width,
      height,
      edgeWork,
      shatterStop,
      quantity,
    },
    calculation: {
      normalizedWidth,
      normalizedHeight,
      squareFeet,
      basePriceCad: roundCurrency(basePrice),
      edgeWorkPriceCad: roundCurrency(edgeWorkPrice),
      shatterStopPriceCad: roundCurrency(shatterStopPrice),
      priceBeforeSurchargeCad: roundCurrency(priceBeforeSurchargeCad),
      surchargeCad: roundCurrency(surchargeCad),
      listCadBeforeCustomerDiscount: roundCurrency(listCadBeforeCustomerDiscount),
    },
    price: {
      unitCad,
      unitUsd,
      subtotalCad,
      subtotalUsd,
      currency: "CAD",
    },
    sku,
    description,
    assets: {
      ...imageUrls(item.label),
      fallbackImageUrl: FRAMELESS_MIRROR_CONFIG.fallbackImageUrl,
      datasheets: FRAMELESS_MIRROR_CONFIG.datasheets,
    },
  };
}

export function getFramelessMirrorPublicConfig() {
  return {
    type: FRAMELESS_MIRROR_CONFIG.key,
    label: FRAMELESS_MIRROR_CONFIG.label,
    items: FRAMELESS_MIRROR_CONFIG.items.map((item) => item.label),
    edgeWorks: FRAMELESS_MIRROR_CONFIG.edgeWorks,
    shatterStopOptions: FRAMELESS_MIRROR_CONFIG.shatterStopOptions,
    dimensions: FRAMELESS_MIRROR_CONFIG.dimensions,
    datasheets: FRAMELESS_MIRROR_CONFIG.datasheets,
    fallbackImageUrl: FRAMELESS_MIRROR_CONFIG.fallbackImageUrl,
  };
}

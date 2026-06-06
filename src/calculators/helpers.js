import { CAD_TO_USD, CUSTOMER_DISCOUNTS } from "../data/common.js";

export const FRACTION_OPTIONS = [
  0,
  1 / 16,
  1 / 8,
  3 / 16,
  1 / 4,
  5 / 16,
  3 / 8,
  7 / 16,
  1 / 2,
  9 / 16,
  5 / 8,
  11 / 16,
  3 / 4,
  13 / 16,
  7 / 8,
  15 / 16,
];

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

export function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function numberOrZero(value) {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function parseFraction(value) {
  if (typeof value === "string" && value.includes("/")) {
    const [numerator, denominator] = value.split("/").map(Number);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
  }
  return numberOrZero(value);
}

export function dimensionValue(input, name) {
  return numberOrZero(input[`${name}Inches`] ?? input[name]?.inches ?? input[name]) +
    parseFraction(input[`${name}Fraction`] ?? input[name]?.fraction);
}

export function roundUpToEvenInches(value) {
  if (Math.abs(value % 2) < 1e-9 && Number.isInteger(value)) return value;
  return Math.ceil(value / 2) * 2;
}

export function formatDimension(inches, fraction = 0) {
  const whole = numberOrZero(inches);
  const fractionValue = parseFraction(fraction);
  const label = FRACTION_LABELS.get(fractionValue) || "";
  return label ? `${whole}-${label}` : `${whole}`;
}

export function quantityFromInput(input = {}) {
  return Math.max(1, Math.trunc(numberOrZero(input.quantity) || 1));
}

export function resolveCustomerMultiplier(customerGroup, familyKey) {
  const normalizedGroup = customerGroup && CUSTOMER_DISCOUNTS[customerGroup] ? customerGroup : "Guest";
  const multiplier = CUSTOMER_DISCOUNTS[normalizedGroup]?.[familyKey] ?? CUSTOMER_DISCOUNTS.Guest[familyKey] ?? 1;
  return { group: normalizedGroup, multiplier };
}

export function priceBlock(unitCadBeforeCustomerDiscount, input, familyKey) {
  const quantity = quantityFromInput(input);
  const { group, multiplier } = resolveCustomerMultiplier(input.customerGroup, familyKey);
  const unitCad = roundCurrency(unitCadBeforeCustomerDiscount * multiplier);
  const unitUsd = roundCurrency(unitCad * CAD_TO_USD);
  return {
    customerGroup: group,
    discountMultiplier: multiplier,
    quantity,
    price: {
      unitCad,
      unitUsd,
      subtotalCad: roundCurrency(unitCad * quantity),
      subtotalUsd: roundCurrency(unitUsd * quantity),
      currency: "CAD",
    },
  };
}

export function priceBlockFromCustomerPrices(customerPrices, input) {
  const quantity = quantityFromInput(input);
  const requestedGroup = input.customerGroup && customerPrices[input.customerGroup] !== undefined ? input.customerGroup : "Guest";
  const unitCad = roundCurrency(customerPrices[requestedGroup] ?? customerPrices.Guest ?? 0);
  const unitUsd = roundCurrency(unitCad * CAD_TO_USD);
  return {
    customerGroup: requestedGroup,
    discountMultiplier:
      customerPrices.Guest && customerPrices.Guest !== 0 ? roundCurrency(unitCad / customerPrices.Guest) : 1,
    quantity,
    price: {
      unitCad,
      unitUsd,
      subtotalCad: roundCurrency(unitCad * quantity),
      subtotalUsd: roundCurrency(unitUsd * quantity),
      currency: "CAD",
    },
  };
}

export function unavailable(message, status = "unavailable") {
  return {
    ok: false,
    status,
    message,
    price: null,
  };
}

export function slug(value, separator = "_", mode = "lower") {
  const normalized = String(value || "")
    .trim()
    .replaceAll(/[^\w]+/g, separator)
    .replaceAll(new RegExp(`${separator}+`, "g"), separator)
    .replaceAll(new RegExp(`^${separator}|${separator}$`, "g"), "");
  return mode === "upper" ? normalized.toUpperCase() : normalized.toLowerCase();
}

export function imageSet({ prefix, value, baseUrl, fallbackImageUrl, datasheets }) {
  const lower = slug(value, "_", "lower");
  const upper = slug(value, "_", "upper");
  const primaryImageUrl = `${baseUrl}/${prefix}_${lower}.png`;
  return {
    primaryImageUrl,
    gallery: [1, 2, 3, 4].map((index) => `${baseUrl}/${prefix}_${upper}-${index}.png`),
    fallbackImageUrl,
    datasheets,
  };
}

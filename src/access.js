import { normalizeCustomerGroupName } from "./calculators/helpers.js";

function hasCustomerId(customerId) {
  const normalized = String(customerId ?? "").trim();
  return Boolean(normalized) && normalized !== "0" && normalized !== "null" && normalized !== "undefined";
}

export function usesGuestPricing(customerGroup) {
  return (normalizeCustomerGroupName(customerGroup) || "Guest") === "Guest";
}

export function canAddCalculatedItemToCart({ customerId } = {}) {
  return hasCustomerId(customerId);
}

import { normalizeCustomerGroupName } from "./calculators/helpers.js";

export function usesGuestPricing(customerGroup) {
  return (normalizeCustomerGroupName(customerGroup) || "Guest") === "Guest";
}

export function canAddCalculatedItemToCart({ customerId, customerGroup } = {}) {
  return Boolean(customerId) && !usesGuestPricing(customerGroup);
}

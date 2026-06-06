import {
  calculateFramelessMirrorQuote,
  getFramelessMirrorPublicConfig,
} from "./framelessMirror.js";
import {
  calculateWorkbookQuote,
  getWorkbookCalculatorTypes,
  getWorkbookPublicConfig,
} from "./workbookProducts.js";

export function calculateQuote(payload = {}) {
  const type = payload.type || "frameless_mirror";
  if (type === "frameless_mirror") return calculateFramelessMirrorQuote(payload);
  return calculateWorkbookQuote({ ...payload, type });
}

export function getCalculatorPublicConfig(type = "frameless_mirror") {
  if (type === "frameless_mirror") return getFramelessMirrorPublicConfig();
  return getWorkbookPublicConfig(type);
}

export function getSupportedCalculatorTypes() {
  return ["frameless_mirror", ...getWorkbookCalculatorTypes()];
}

import { SKU_CATALOG } from "../data/skuCatalog.js";
import { WORKBOOK_IMAGE_ASSETS } from "../data/workbookImageAssets.js";
import {
  ANTIQUE_ITEMS,
  ANTIQUE_THICKNESS,
  CUSTOMER_GROUP_OPTIONS,
  CUT_GLASS_ITEMS,
  DATASHEET_BASE_URL,
  DATASHEET_FR_BASE_URL,
  FALLBACK_IMAGE_URL,
  FIXED_PRICE_TABLES,
  GUARD_ITEMS,
  IMAGE_BASE_URL,
  KICK_PLATE_EXTRAS,
  KICK_PLATE_ITEMS,
  SHELF_FINISHES,
  SHELF_ITEMS,
  STANDARD_CUSTOMER_GROUP_OPTIONS,
} from "../data/workbookProducts.js";
import {
  dimensionValue,
  formatDimension,
  imageSet,
  numberOrZero,
  parseFraction,
  priceBlock,
  priceBlockFromCustomerPrices,
  quantityFromInput,
  roundCurrency,
  roundUpToEvenInches,
  slug,
  unavailable,
} from "./helpers.js";

const EDGE_WORKS = ["No", "Clean Cut", "Arrised Edge", "Polished Edge"];
const YES_NO = ["No", "Yes"];

const CATALOG_IMAGE_FIELDS = {
  series_850: { prefix: "SERIES_850", field: "frameFinishing" },
  series_850_ft: { prefix: "SERIES_850FT", field: "frameFinishing" },
  series_3200: { prefix: "SERIES_3200", field: "frameFinishing" },
  series_3200_ft: { prefix: "SERIES_3200FT", field: "frameFinishing" },
  series_3300: { prefix: "SERIES_3300", field: "sku" },
  series_4100: { prefix: "SERIES_4100", field: "frameFinishing" },
  convex_domes: { prefix: "ANTIQUE", field: "category" },
};

function normalizedOption(value) {
  return String(value ?? "").trim().toLowerCase();
}

const CATALOG_VALUE_ALIASES = {
  packaging: {
    "standard packaging": "standard box",
    "standard 1 per box": "courier box",
  },
  frameFinishing: {
    "brushed stainless steel fixed tilt frame": "brushed s/s fixed tilt frame",
    "powder coat black stainless steel fixed tilt frame": "powder coat black s/s fixed tilt frame",
    "powder coat white stainless steel fixed tilt frame": "powder coat white s/s fixed tilt frame",
  },
  shelf: {
    "integral shelf": "integral",
  },
};

function canonicalOption(field, value) {
  const normalized = normalizedOption(value);
  return CATALOG_VALUE_ALIASES[field]?.[normalized] || normalized;
}

function valuesEqual(rowValue, inputValue, field) {
  if (typeof rowValue === "number") return Number(inputValue) === rowValue;
  return canonicalOption(field, rowValue) === canonicalOption(field, inputValue);
}

function displayOptionsFromInput(catalog, candidate, input) {
  return Object.fromEntries(
    catalog.fields.map((field) => [
      field,
      valuesEqual(candidate.options[field], input[field], field) ? input[field] : candidate.options[field],
    ]),
  );
}

function descriptionWithDisplayOptions(description, candidateOptions, displayOptions) {
  return Object.entries(displayOptions).reduce((result, [field, displayValue]) => {
    const sourceValue = candidateOptions[field];
    if (sourceValue === displayValue || sourceValue === undefined || sourceValue === null) return result;
    return result.replace(String(sourceValue), String(displayValue));
  }, description);
}

function findByLabel(items, label, fallback = items[0]) {
  const normalized = normalizedOption(label);
  return items.find((item) => normalizedOption(item.label) === normalized || normalizedOption(item.imageLabel) === normalized) || fallback;
}

function fixedPrice(tableName, dimensions) {
  return FIXED_PRICE_TABLES[tableName]?.find((entry) =>
    Object.entries(dimensions).every(([key, value]) => entry[key] === value),
  )?.price;
}

// Hostinger uses product-facing filenames rather than the calculator type names.
const DATASHEET_FILE_NAMES = {
  CUT_GLASS: "Datasheet_Cut-Glass.pdf",
  SERIES_850: "Datasheet_850.pdf",
  SERIES_850_FT: "Datasheet_850FT.pdf",
  SERIES_855: "Datasheet_855-Steel-Shelf.pdf",
  SERIES_3205: "Datasheet_3205-Steel-Shelf.pdf",
  SERIES_3200: "Datasheet_3200.pdf",
  SERIES_3200_FT: "Datasheet_3200FT.pdf",
  SERIES_3300: "Datasheet_3300-Frameless-Mirror.pdf",
  U_GUARD: "Datasheet_U-Guard.pdf",
  U_GUARDS: "Datasheet_U-Guard.pdf",
  KICK_PLATES: "Datasheet_Kick-Plate.pdf",
  J_MOULD: "Datasheet_J-Mould.pdf",
  FRAMLESS_MIRROR: "Datasheet_Frameless-Mirror.pdf",
  CORNER_GUARD: "Datasheet_Corner-Guard.pdf",
  CORNER_GUARDS: "Datasheet_Corner-Guard.pdf",
  SHELVES: "Datasheet_855-Steel-Shelf.pdf",
  STEEL_BACK_EXTERIOR_ACRYLIC_CONVEX_MIRROR: "STEEL_BACK_EXTERIOR_ACRYLIC_CONVEX_MIRROR.pdf",
  QUARTER_HEMISPHERIC_DOME: "QUARTER_HEMISPHERIC_DOME.pdf",
  INDOOR_ACRYLIC_CONVEX_MIRROR: "INDOOR_ACRYLIC_CONVEX_MIRROR.pdf",
  HALF_HEMISPHERIC_DOME: "HALF_HEMISPHERIC_DOME.pdf",
  FULL_HEMISPHERIC_DOME: "FULL_HEMISPHERIC_DOME.pdf",
  EXTERIOR_ACRYLIC_CONVEX_MIRROR: "EXTERIOR_ACRYLIC_CONVEX_MIRROR.pdf",
};

function datasheets(name) {
  const key = slug(name, "_", "upper");
  const englishFile = DATASHEET_FILE_NAMES[key] || `${key}.pdf`;
  const frenchFile = englishFile.replace(/\.pdf$/i, "_FR.pdf");
  return {
    en: `${DATASHEET_BASE_URL}/${englishFile}`,
    fr: `${DATASHEET_FR_BASE_URL}/${frenchFile}`,
  };
}

function productAssets({ type, prefix, value, datasheetName }) {
  const assetConfig = WORKBOOK_IMAGE_ASSETS[type] || WORKBOOK_IMAGE_ASSETS[prefixToType(prefix)];
  const assetSet = assetConfig?.variants ? assetConfig.variants[value] : assetConfig;
  const fallbackImageUrl = assetSet?.fallbackImageUrl || assetConfig?.fallbackImageUrl || FALLBACK_IMAGE_URL;
  return imageSet({
    prefix,
    value,
    baseUrl: IMAGE_BASE_URL,
    fallbackImageUrl,
    datasheets: datasheets(datasheetName || value),
    primaryImageUrl: assetSet?.primaryImageUrl || fallbackImageUrl,
    galleryUrls: assetSet?.galleryUrls || [],
  });
}

function prefixToType(prefix) {
  const lookup = {
    SERIES_850: "series_850",
    SERIES_850FT: "series_850_ft",
    SERIES_3200: "series_3200",
    SERIES_3200FT: "series_3200_ft",
    SERIES_3300: "series_3300",
    SERIES_4100: "series_4100",
    ANTIQUE: "antique",
    CUT_GLASS: "cut_glass",
    U_GUARDS: "u_guard",
    CORNER_GUARDS: "corner_guard",
    J_MOULD: "j_mould",
    SHELVES: "shelves",
    KICK_PLATE: "kick_plates",
  };
  return lookup[prefix] || prefix;
}

function quoteResponse({
  input,
  type,
  familyKey = type,
  unitListCad,
  sku,
  description,
  selections,
  calculation,
  assetPrefix,
  assetValue,
  datasheetName,
}) {
  const price = priceBlock(unitListCad, input, familyKey);
  return {
    ok: true,
    status: "quoted",
    type,
    customerId: input.customerId ?? null,
    customerGroup: price.customerGroup,
    discountMultiplier: price.discountMultiplier,
    selections: { ...selections, quantity: price.quantity },
    calculation,
    price: price.price,
    sku,
    description,
    assets: productAssets({
      type,
      prefix: assetPrefix,
      value: assetValue,
      datasheetName,
    }),
  };
}

function inputDimensionLabels(input, widthName = "width", heightName = "height") {
  return {
    widthLabel: formatDimension(input[`${widthName}Inches`] ?? input[widthName], input[`${widthName}Fraction`]),
    heightLabel: formatDimension(input[`${heightName}Inches`] ?? input[heightName], input[`${heightName}Fraction`]),
  };
}

function validateSheetSize({ width, height, minWidth, minHeight, maxBothSides, maxOneSide }) {
  if (width <= 0 || height <= 0) return "Width and height are required.";
  if (width < minWidth || height < minHeight) return "Size outside min/max allowed";
  if (width > maxOneSide || height > maxOneSide) return "Size outside min/max allowed";
  if (width > maxBothSides && height > maxBothSides) return "Size outside min/max allowed";
  return "";
}

function calculateCutGlass(input = {}) {
  const item = findByLabel(CUT_GLASS_ITEMS, input.item);
  const edgeWork = input.edgeWork || "Polished Edge";
  if (!item.edgeWorkPerInch[edgeWork] && item.edgeWorkPerInch[edgeWork] !== 0) {
    return unavailable(`Unsupported edge work option: ${edgeWork}`);
  }

  const width = dimensionValue(input, "width");
  const height = dimensionValue(input, "height");
  const message = validateSheetSize({ width, height, minWidth: 12, minHeight: 12, maxBothSides: 48, maxOneSide: 120 });
  if (message) return unavailable(message);

  const normalizedWidth = roundUpToEvenInches(width);
  const normalizedHeight = roundUpToEvenInches(height);
  const actualSquareFeet = (normalizedWidth * normalizedHeight) / 144;
  const calculatedSquareFeet = item.type === "Tempered" ? Math.max(2, actualSquareFeet) : actualSquareFeet;
  const polishedLength = (width + height) * 2;
  const edgeWorkPriceCad = polishedLength * item.edgeWorkPerInch[edgeWork];
  const priceBeforeSurchargeCad = item.psf * calculatedSquareFeet + edgeWorkPriceCad;
  const listCad = priceBeforeSurchargeCad * 1.16;
  const { widthLabel, heightLabel } = inputDimensionLabels(input);

  return quoteResponse({
    input,
    type: "cut_glass",
    unitListCad: listCad,
    sku: `GLASS-${item.abbreviation}-CUSTOM`,
    description: `GLASS-Series-Item ${item.label}-Width${widthLabel}xHeight${heightLabel}- ${edgeWork}`,
    selections: { item: item.label, width, height, edgeWork },
    calculation: {
      normalizedWidth,
      normalizedHeight,
      actualSquareFeet: roundCurrency(actualSquareFeet),
      calculatedSquareFeet: roundCurrency(calculatedSquareFeet),
      basePriceCad: roundCurrency(item.psf * calculatedSquareFeet),
      edgeWorkPriceCad: roundCurrency(edgeWorkPriceCad),
      priceBeforeSurchargeCad: roundCurrency(priceBeforeSurchargeCad),
      surchargeCad: roundCurrency(priceBeforeSurchargeCad * 0.16),
      listCadBeforeCustomerDiscount: roundCurrency(listCad),
    },
    assetPrefix: "CUT_GLASS",
    assetValue: item.label,
    datasheetName: "CUT_GLASS",
  });
}

function calculateShelvesForItem(itemLabel, input = {}, type = "shelves") {
  const item = findByLabel(SHELF_ITEMS, itemLabel || input.item);
  const finish = findByLabel(SHELF_FINISHES, input.finish);
  const length = dimensionValue(input, "length");
  const depth = dimensionValue(input, "depth");
  if (length < 12 || depth < 4 || length > 96 || depth > 12) return unavailable("Size outside min/max allowed");

  const exactFixedPrice = item.label === "Series 855" ? fixedPrice("shelves", { length, depth }) : undefined;
  const squareFeet = (length * depth) / 144;
  const basePriceCad = item.psf * squareFeet;
  const finishPriceCad = exactFixedPrice !== undefined ? 0 : basePriceCad * (item.finishAdd + finish.add);
  const customChargeCad = exactFixedPrice !== undefined ? 0 : 33.5;
  const listCad = exactFixedPrice ?? basePriceCad + finishPriceCad + customChargeCad;

  return quoteResponse({
    input,
    type,
    familyKey: "shelves",
    unitListCad: listCad,
    sku: `SHELF-${item.abbreviation}-${finish.abbreviation}-CUSTOM`,
    description: `SHELF-Series-Item ${item.label}-Length${formatDimension(input.lengthInches ?? length, input.lengthFraction)}xDepth${formatDimension(input.depthInches ?? depth, input.depthFraction)}- ${finish.label}`,
    selections: { item: item.label, length, depth, finish: finish.label },
    calculation: {
      squareFeet: roundCurrency(squareFeet),
      fixedPriceCad: exactFixedPrice === undefined ? null : roundCurrency(exactFixedPrice),
      basePriceCad: roundCurrency(basePriceCad),
      finishPriceCad: roundCurrency(finishPriceCad),
      customChargeCad: roundCurrency(customChargeCad),
      listCadBeforeCustomerDiscount: roundCurrency(listCad),
    },
    assetPrefix: "SHELVES",
    assetValue: `${item.label}_${finish.label}`,
    datasheetName: item.label,
  });
}

function calculateShelves(input = {}) {
  return calculateShelvesForItem(input.item, input, "shelves");
}

function calculateSeries855Shelves(input = {}) {
  return calculateShelvesForItem("Series 855", input, "series_855");
}

function calculateSeries3205Shelves(input = {}) {
  return calculateShelvesForItem("Series 855", input, "series_3205");
}

function calculateKickPlates(input = {}) {
  const item = findByLabel(KICK_PLATE_ITEMS, input.item);
  const holesTape = findByLabel(KICK_PLATE_EXTRAS, input.holesTape);
  const width = dimensionValue(input, "width");
  const height = dimensionValue(input, "height");
  const message = validateSheetSize({ width, height, minWidth: 6, minHeight: 6, maxBothSides: 48, maxOneSide: 96 });
  if (message) return unavailable(message);

  const normalizedWidth = roundUpToEvenInches(width);
  const normalizedHeight = roundUpToEvenInches(height);
  const squareFeet = Math.max(2, (normalizedWidth * normalizedHeight) / 144);
  const exactFixedPrice = item.abbreviation === "18G"
    ? fixedPrice("kick_plates", { width: normalizedWidth, height: normalizedHeight })
    : undefined;
  const sizePriceCad = exactFixedPrice ?? item.psf * squareFeet;
  const holesPriceCad = Math.ceil(normalizedWidth / 12) * holesTape.holesPerWidth;
  const tapePriceCad = normalizedWidth * holesTape.tapePerInch;
  const listCad = sizePriceCad + holesPriceCad + tapePriceCad;
  const { widthLabel, heightLabel } = inputDimensionLabels(input);

  return quoteResponse({
    input,
    type: "kick_plates",
    unitListCad: listCad,
    sku: `KICK-${item.abbreviation}-CUSTOM`,
    description: `KICK-Series-Item ${item.label}-Width${widthLabel}xHeight${heightLabel}- ${holesTape.label}`,
    selections: { item: item.label, width, height, holesTape: holesTape.label },
    calculation: {
      normalizedWidth,
      normalizedHeight,
      squareFeet: roundCurrency(squareFeet),
      fixedPriceCad: exactFixedPrice === undefined ? null : roundCurrency(exactFixedPrice),
      sizePriceCad: roundCurrency(sizePriceCad),
      holesPriceCad: roundCurrency(holesPriceCad),
      tapePriceCad: roundCurrency(tapePriceCad),
      listCadBeforeCustomerDiscount: roundCurrency(listCad),
    },
    assetPrefix: "KICK_PLATE",
    assetValue: item.imageLabel,
    datasheetName: "KICK_PLATES",
  });
}

function calculateSeries3300(input = {}) {
  const width = dimensionValue(input, "width");
  const height = dimensionValue(input, "height");
  const message = validateSheetSize({ width, height, minWidth: 12, minHeight: 12, maxBothSides: 48, maxOneSide: 48 });
  if (message) return unavailable(message);

  const normalizedWidth = roundUpToEvenInches(width);
  const normalizedHeight = roundUpToEvenInches(height);
  const squareFeet = Math.max(2, (normalizedWidth * normalizedHeight) / 144);
  const exactFixedPrice = fixedPrice("series_3300", { width: normalizedWidth, height: normalizedHeight });
  const listCad = exactFixedPrice ?? squareFeet * 53.5;
  const sku = `M-3300-${formatDimension(input.widthInches ?? width, input.widthFraction)}X${formatDimension(input.heightInches ?? height, input.heightFraction)}`;

  return quoteResponse({
    input,
    type: "series_3300",
    familyKey: "series_3300",
    unitListCad: listCad,
    sku,
    description: `${sku}-Stainless Steel Mirror`,
    selections: { width, height },
    calculation: {
      normalizedWidth,
      normalizedHeight,
      squareFeet: roundCurrency(squareFeet),
      fixedPriceCad: exactFixedPrice === undefined ? null : roundCurrency(exactFixedPrice),
      listCadBeforeCustomerDiscount: roundCurrency(listCad),
    },
    assetPrefix: "SERIES_3300",
    assetValue: "SERIES_3300",
    datasheetName: "SERIES_3300",
  });
}

function calculateAntique(input = {}) {
  const item = findByLabel(ANTIQUE_ITEMS, String(input.item || "9100"));
  const thickness = String(input.thickness || "3MM").toUpperCase();
  const profile = ANTIQUE_THICKNESS[item.type]?.[thickness];
  if (!profile) return unavailable(`Unsupported antique thickness: ${thickness}`);
  const edgeWork = input.edgeWork || input.polishedEdge || "No";
  if (!profile.edgeWorkPerInch[edgeWork] && profile.edgeWorkPerInch[edgeWork] !== 0) {
    return unavailable(`Unsupported edge work option: ${edgeWork}`);
  }

  const width = dimensionValue(input, "width");
  const height = dimensionValue(input, "height");
  const message = validateSheetSize({ width, height, minWidth: 6, minHeight: 6, maxBothSides: 48, maxOneSide: 96 });
  if (message) return unavailable(message);

  const normalizedWidth = roundUpToEvenInches(width);
  const normalizedHeight = roundUpToEvenInches(height);
  const actualSquareFeet = (normalizedWidth * normalizedHeight) / 144;
  const calculatedSquareFeet = Math.max(1, actualSquareFeet);
  const overSizePsf = calculatedSquareFeet > 20 ? 3.35 : 0;
  const goldVeiningPsf = normalizedOption(input.goldVeining || input.goldVein) === "yes" ? 17.7 : 0;
  const psf = profile.psf + overSizePsf + goldVeiningPsf;
  const polishedLength = width + height;
  const edgeWorkPriceCad = polishedLength * profile.edgeWorkPerInch[edgeWork];
  const shatterStopSquareFeet = (numberOrZero(input.widthInches) * numberOrZero(input.heightInches)) / 144;
  const shatterStopPriceCad = normalizedOption(input.shatterStop) === "yes" ? shatterStopSquareFeet * 7.25 : 0;
  const priceBeforeSurchargeCad = psf * calculatedSquareFeet + edgeWorkPriceCad + shatterStopPriceCad;
  const listCad = priceBeforeSurchargeCad * 1.16;
  const { widthLabel, heightLabel } = inputDimensionLabels(input);

  return quoteResponse({
    input,
    type: "antique",
    familyKey: "frameless_mirror",
    unitListCad: listCad,
    sku: `ANT-${item.abbreviation}-${thickness}-CUSTOM`,
    description: `ANT-Series-Item ${item.label}-${thickness}-Width${widthLabel}xHeight${heightLabel}- ${edgeWork}`,
    selections: {
      item: item.label,
      type: item.type,
      thickness,
      width,
      height,
      edgeWork,
      goldVeining: normalizedOption(input.goldVeining || input.goldVein) === "yes" ? "Yes" : "No",
      shatterStop: normalizedOption(input.shatterStop) === "yes" ? "Yes" : "No",
    },
    calculation: {
      normalizedWidth,
      normalizedHeight,
      calculatedSquareFeet: roundCurrency(calculatedSquareFeet),
      psf: roundCurrency(psf),
      edgeWorkPriceCad: roundCurrency(edgeWorkPriceCad),
      shatterStopPriceCad: roundCurrency(shatterStopPriceCad),
      priceBeforeSurchargeCad: roundCurrency(priceBeforeSurchargeCad),
      surchargeCad: roundCurrency(priceBeforeSurchargeCad * 0.16),
      listCadBeforeCustomerDiscount: roundCurrency(listCad),
    },
    assetPrefix: "ANTIQUE",
    assetValue: item.label,
    datasheetName: "ANTIQUE",
  });
}

function guardBasePrice(totalWidth, pricingLength) {
  return (totalWidth * pricingLength) / 144 * 18.85 + 4.45 + pricingLength * 0.1125;
}

function yesNoOption(value, yesLabel, noLabel) {
  const normalized = normalizedOption(value);
  if (normalized === "yes") return yesLabel;
  if (normalized === "no") return noLabel;
  return value || noLabel;
}

function holesOption(value) {
  const normalized = normalizedOption(value);
  if (normalized === "yes") return "Holes";
  if (normalized === "no") return "No Holes";
  if (normalized === "countersunk") return "Countersunk";
  return value || "No Holes";
}

function calculateUGuards(input = {}) {
  const guard = findByLabel(GUARD_ITEMS, input.guard);
  const wing1 = numberOrZero(input.wing1);
  const center = numberOrZero(input.center);
  const wing2 = numberOrZero(input.wing2);
  const length = numberOrZero(input.length);
  if (center < 4 || center > 12 || length < 4 || length > 120) return unavailable("Size outside min/max allowed");
  if ((wing1 > center * 0.75 && wing2 > center * 0.75) || wing1 > center * 2 || wing2 > center * 2) {
    return unavailable("Size outside min/max allowed");
  }

  const pricingLength = Math.max(48, length);
  const basePriceCad = guardBasePrice(wing1 + center + wing2, pricingLength);
  const guardPriceCad = basePriceCad + basePriceCad * guard.add;
  const easedEdge = yesNoOption(input.easedEdge, "Eased Edge", "No Eased Edge");
  const holes = holesOption(input.holes);
  const tape = yesNoOption(input.tape, "Tape", "No Tape");
  const easedEdgePriceCad = easedEdge === "Eased Edge" ? length * 0.05 : 0;
  const holesPriceCad = holes === "Holes" ? 0.1 * length / 6 : holes === "Countersunk" ? 0.25 * length / 6 : 0;
  const tapePriceCad = tape === "Tape" ? 0.1 * length : 0;
  const listCad = guardPriceCad + easedEdgePriceCad + holesPriceCad + tapePriceCad;

  return quoteResponse({
    input,
    type: "u_guard",
    unitListCad: listCad,
    sku: `UGUARD-${guard.abbreviation}-CUSTOM`,
    description: `UGUARD-Wing (1) ${wing1}-Center ${center}-Wing (2) ${wing2}-Length ${length}- ${guard.label}- ${easedEdge}- ${holes}- ${tape === "Tape" ? "TapeYes" : "No Tape"}`,
    selections: { wing1, center, wing2, length, guard: guard.label, easedEdge, holes, tape },
    calculation: {
      pricingLength,
      basePriceCad: roundCurrency(basePriceCad),
      guardPriceCad: roundCurrency(guardPriceCad),
      easedEdgePriceCad: roundCurrency(easedEdgePriceCad),
      holesPriceCad: roundCurrency(holesPriceCad),
      tapePriceCad: roundCurrency(tapePriceCad),
      listCadBeforeCustomerDiscount: roundCurrency(listCad),
    },
    assetPrefix: "U_GUARDS",
    assetValue: guard.label,
    datasheetName: "U_GUARDS",
  });
}

function calculateCornerGuards(input = {}) {
  const guard = findByLabel(GUARD_ITEMS, input.guard);
  const wing1 = numberOrZero(input.wing1);
  const wing2 = numberOrZero(input.wing2);
  const length = numberOrZero(input.length);
  const angle = numberOrZero(input.angle || 90);
  if (wing1 < 0.5 || wing2 < 0.5 || wing1 > 12 || wing2 > 12 || length < 4 || length > 120) {
    return unavailable("Size outside min/max allowed");
  }

  const pricingLength = Math.max(48, length);
  const basePriceCad = guardBasePrice(wing1 + wing2, pricingLength);
  const guardPriceCad = basePriceCad + basePriceCad * guard.add;
  const easedEdge = yesNoOption(input.easedEdge, "Eased Edge", "No Eased Edge");
  const holes = holesOption(input.holes);
  const tape = yesNoOption(input.tape, "Tape", "No Tape");
  const easedEdgePriceCad = easedEdge === "Eased Edge" ? length * 0.1125 : 0;
  const holesPriceCad = holes === "Holes" ? 0.225 * length / 6 : holes === "Countersunk" ? 0.5625 * length / 6 : 0;
  const tapePriceCad = tape === "Tape" ? 0.225 * length : 0;
  const nonStandardAngleFeeCad = angle === 90 ? 0 : (guardPriceCad + holesPriceCad) * 0.05;
  const listCad = guardPriceCad + easedEdgePriceCad + holesPriceCad + tapePriceCad + nonStandardAngleFeeCad;

  return quoteResponse({
    input,
    type: "corner_guard",
    unitListCad: listCad,
    sku: `CORNER-${guard.abbreviation}-CUSTOM`,
    description: `CORNER-Series-Wing (1) ${wing1}-Wing (2) ${wing2}-Length ${length}-Guard ${guard.label}- ${easedEdge}- ${holes}- ${tape}- Angle ${angle}`,
    selections: { wing1, wing2, length, guard: guard.label, easedEdge, holes, tape, angle },
    calculation: {
      pricingLength,
      basePriceCad: roundCurrency(basePriceCad),
      guardPriceCad: roundCurrency(guardPriceCad),
      easedEdgePriceCad: roundCurrency(easedEdgePriceCad),
      holesPriceCad: roundCurrency(holesPriceCad),
      tapePriceCad: roundCurrency(tapePriceCad),
      nonStandardAngleFeeCad: roundCurrency(nonStandardAngleFeeCad),
      listCadBeforeCustomerDiscount: roundCurrency(listCad),
    },
    assetPrefix: "CORNER_GUARDS",
    assetValue: guard.label,
    datasheetName: "CORNER_GUARDS",
  });
}

function calculateJMould(input = {}) {
  const guard = findByLabel(GUARD_ITEMS, input.guard);
  const face = numberOrZero(input.face);
  const center = numberOrZero(input.center);
  const back = numberOrZero(input.back);
  const length = numberOrZero(input.length);
  if (center < 0.3125 || center > 0.5625 || length < 4 || length > 120) return unavailable("Size outside min/max allowed");

  const pricingLength = Math.max(48, length);
  const basePriceCad = ((face + center + back) * pricingLength) / 144 * 18.85 + 4.45;
  const listCad = basePriceCad + basePriceCad * guard.add;

  return quoteResponse({
    input,
    type: "j_mould",
    familyKey: "u_guard",
    unitListCad: listCad,
    sku: `JMOULD-${guard.abbreviation}-CUSTOM`,
    description: `JMOULD-Face ${face}-Center ${center}-Back ${back}-Length ${length}-Guard ${guard.label}`,
    selections: { face, center, back, length, guard: guard.label },
    calculation: {
      pricingLength,
      basePriceCad: roundCurrency(basePriceCad),
      guardAddCad: roundCurrency(basePriceCad * guard.add),
      listCadBeforeCustomerDiscount: roundCurrency(listCad),
    },
    assetPrefix: "J_MOULD",
    assetValue: guard.label,
    datasheetName: "J_MOULD",
  });
}

function uniqueOptions(rows, field) {
  return [...new Set(rows.map((row) => row.options[field]).filter((value) => value !== null && value !== undefined))]
    .sort((a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))));
}

function catalogConfig(type) {
  const catalog = SKU_CATALOG[type];
  const fields = catalog.fields.map((field) => {
    const rawOptions = uniqueOptions(catalog.rows, field);
    const configuredOptions = CATALOG_OPTION_OVERRIDES[type]?.[field] || rawOptions;
    const swatchConfig = CATALOG_SWATCH_FIELDS[type]?.[field];
    const optionOrder = CATALOG_OPTION_ORDERS[type]?.[field];
    const sortedOptions = optionOrder
      ? optionOrder.filter((value) => configuredOptions.includes(value))
      : configuredOptions;
    const orderedOptions = swatchConfig
      ? swatchConfig.swatches.map((swatch) => swatch.value).filter((value) => configuredOptions.includes(value))
      : sortedOptions;
    return {
      name: field,
      label: fieldLabels[field] || field,
      control: swatchConfig ? "swatch" : "select",
      options: orderedOptions,
      swatches: swatchConfig?.swatches.filter((swatch) => orderedOptions.includes(swatch.value)),
      default: preferredDefault(type, field, orderedOptions),
    };
  });
  return {
    type,
    label: catalog.label,
    customerGroups: type === "convex_domes" ? CUSTOMER_GROUP_OPTIONS : STANDARD_CUSTOMER_GROUP_OPTIONS,
    fields,
    fallbackImageUrl: FALLBACK_IMAGE_URL,
    datasheets: datasheets(type),
  };
}

function series850Config() {
  const swatchConfig = CATALOG_SWATCH_FIELDS.series_850.frameFinishing;
  return {
    type: "series_850",
    label: SKU_CATALOG.series_850.label,
    customerGroups: STANDARD_CUSTOMER_GROUP_OPTIONS,
    fields: [
      {
        name: "width",
        label: "Width",
        control: "dimension",
        defaultInches: 24,
        min: 12,
        max: 96,
        hiddenWhen: { field: "glazing", value: "6mm Tempered" },
      },
      {
        name: "height",
        label: "Height",
        control: "dimension",
        defaultInches: 36,
        min: 12,
        max: 96,
        hiddenWhen: { field: "glazing", value: "6mm Tempered" },
      },
      {
        name: "temperedSize",
        label: "Size",
        control: "select",
        options: SERIES_850_TEMPERED_SIZE_OPTIONS,
        default: "24x36",
        visibleWhen: { field: "glazing", value: "6mm Tempered" },
      },
      {
        name: "glazing",
        label: "Glazing",
        control: "select",
        options: SERIES_850_GLAZING_OPTIONS,
        default: "5mm Standard",
      },
      {
        name: "frameFinishing",
        label: "Frame Finishing",
        control: "swatch",
        options: swatchConfig.swatches.map((swatch) => swatch.value),
        swatches: swatchConfig.swatches,
        default: "Stainless Steel Channel Frame",
      },
      {
        name: "shelf",
        label: "Shelf",
        control: "select",
        options: ["No Shelf", "Standard Shelf"],
        default: "No Shelf",
      },
      {
        name: "packaging",
        label: "Packaging",
        control: "select",
        options: STANDARD_PACKAGING_OPTIONS,
        default: "Standard Packaging",
      },
    ],
    fallbackImageUrl: FALLBACK_IMAGE_URL,
    datasheets: datasheets("series_850"),
  };
}

const MIRROR_GLAZING_OPTIONS = [
  "5mm Standard",
  "6mm Mirror",
  "6mm Tempered",
  "S/S Mirror",
  "3mm Acrylic",
  "6mm Acrylic",
  "5mm w/ Shatter Stop",
  "6mm w/ Shatter Stop",
];
const SERIES_850_GLAZING_OPTIONS = MIRROR_GLAZING_OPTIONS.filter((option) => option !== "6mm w/ Shatter Stop");
const STANDARD_PACKAGING_OPTIONS = ["Standard Packaging", "Standard 1 Per Box"];

const CATALOG_SWATCH_FIELDS = {
  series_850: {
    frameFinishing: {
      swatches: [
        {
          value: "Stainless Steel Channel Frame",
          label: "Stainless Steel",
          color: "linear-gradient(135deg, #f7f7f4 0%, #bfc2bf 52%, #ffffff 100%)",
        },
        {
          value: "Brushed Steel Gold",
          label: "Gold",
          color: "linear-gradient(135deg, #6d551e 0%, #d1b153 45%, #f0df99 100%)",
        },
        {
          value: "Brushed Steel Bronze",
          label: "Bronze",
          color: "linear-gradient(135deg, #6d4335 0%, #b88b73 48%, #d7baa8 100%)",
        },
        {
          value: "Brushed Steel Black",
          label: "Black",
          color: "linear-gradient(135deg, #030303 0%, #272625 52%, #070707 100%)",
        },
      ],
    },
  },
  series_850_ft: {
    frameFinishing: {
      swatches: [
        {
          value: "SS Fixed Tilt Channel Frame",
          label: "Stainless Steel",
          color: "linear-gradient(135deg, #f7f7f4 0%, #bfc2bf 52%, #ffffff 100%)",
        },
        {
          value: "Brushed Steel Gold",
          label: "Gold",
          color: "linear-gradient(135deg, #6d551e 0%, #d1b153 45%, #f0df99 100%)",
        },
        {
          value: "Brushed Steel Bronze",
          label: "Bronze",
          color: "linear-gradient(135deg, #6d4335 0%, #b88b73 48%, #d7baa8 100%)",
        },
        {
          value: "Brushed Steel Black",
          label: "Black",
          color: "linear-gradient(135deg, #030303 0%, #272625 52%, #070707 100%)",
        },
      ],
    },
  },
  series_3200: {
    frameFinishing: {
      swatches: [
        {
          value: "Brushed Stainless Frame",
          label: "Brushed Stainless",
          imageUrl: "https://grid-is.imgix.net/securitymirror/78a91e80-2244-41ca-bd19-e8905caaa2de-Brushed%20steel.png",
        },
        {
          value: "Powder Coat Black Frame",
          label: "Black",
          imageUrl: "https://grid-is.imgix.net/securitymirror/f1917252-4762-4e64-b7d4-89754ddf557b-Black%20Powder%20Coat.png",
        },
        {
          value: "Powder Coat White Frame",
          label: "White",
          imageUrl: "https://grid-is.imgix.net/securitymirror/d0a2ed00-b61a-4a4e-b4f8-9d927ebbc41a-White%20Powder%20Coat.png",
        },
      ],
    },
  },
  series_3200_ft: {
    frameFinishing: {
      swatches: [
        {
          value: "Brushed Stainless Steel Fixed Tilt Frame",
          label: "Brushed Stainless",
          imageUrl: "https://grid-is.imgix.net/securitymirror/95585cf5-8f76-4999-8974-4cb245f321d8-Brushed%20steel.png",
        },
        {
          value: "Powder Coat White Stainless Steel Fixed Tilt Frame",
          label: "White",
          imageUrl: "https://grid-is.imgix.net/securitymirror/f3974792-bd1c-475d-b327-449585d39585-White%20Powder%20Coat.png",
        },
        {
          value: "Powder Coat Black Stainless Steel Fixed Tilt Frame",
          label: "Black",
          imageUrl: "https://grid-is.imgix.net/securitymirror/3dd16474-c6a5-4323-8c9a-3123f2781247-Black%20Powder%20Coat.png",
        },
      ],
    },
  },
  series_4100: {
    frameFinishing: {
      swatches: [
        {
          value: "Brushed Stainless Steel",
          label: "Brushed Stainless",
          imageUrl: "https://grid-is.imgix.net/securitymirror/754254f3-30b4-46ce-968d-657eb939d2f1-Brushed%20steel.png",
        },
        {
          value: "Mirror Polished Stainless Steel",
          label: "Mirror Polished",
          imageUrl: "https://grid-is.imgix.net/securitymirror/0569f300-eaad-4f6f-8e89-68ce833696c2-Mirror%20Polished.png",
        },
        {
          value: "Brushed Copper Stainless Steel",
          label: "Brushed Copper",
          imageUrl: "https://grid-is.imgix.net/jackroelfsema/ba5654ba-7a40-4691-acc9-bd22fa0a0015-brushed%20bronze.jpg",
        },
        {
          value: "Brushed Black Stainless Steel",
          label: "Brushed Black",
          imageUrl: "https://grid-is.imgix.net/securitymirror/d5f2d77d-f726-4928-a4e4-897e7a435220-Brushed%20Black.png",
        },
      ],
    },
  },
};

const CATALOG_OPTION_OVERRIDES = {
  series_850: {
    glazing: SERIES_850_GLAZING_OPTIONS,
    frameFinishing: [
      "Stainless Steel Channel Frame",
      "Brushed Steel Gold",
      "Brushed Steel Bronze",
      "Brushed Steel Black",
    ],
    shelf: ["No Shelf", "Standard Shelf"],
    packaging: STANDARD_PACKAGING_OPTIONS,
  },
  series_3200: {
    glazing: MIRROR_GLAZING_OPTIONS,
    frameFinishing: ["Brushed Stainless Frame", "Powder Coat Black Frame", "Powder Coat White Frame"],
    shelf: ["No Shelf", "Standard Shelf", "Integral Shelf"],
    packaging: STANDARD_PACKAGING_OPTIONS,
  },
  series_3200_ft: {
    glazing: MIRROR_GLAZING_OPTIONS,
    frameFinishing: [
      "Brushed Stainless Steel Fixed Tilt Frame",
      "Powder Coat White Stainless Steel Fixed Tilt Frame",
      "Powder Coat Black Stainless Steel Fixed Tilt Frame",
    ],
    shelf: ["No Shelf", "Standard Shelf", "Integral"],
    packaging: STANDARD_PACKAGING_OPTIONS,
  },
  series_4100: {
    glazing: ["5mm Mirror", "6mm Mirror", "6mm Tempered", "6mm Laminated", "5mm w/ Shatter Stop", "6mm w/ Shatter Stop"],
    frameFinishing: [
      "Brushed Stainless Steel",
      "Mirror Polished Stainless Steel",
      "Brushed Copper Stainless Steel",
      "Brushed Black Stainless Steel",
    ],
    packaging: ["Courier Box"],
  },
};

const CATALOG_OPTION_ORDERS = {
  series_850: {
    glazing: SERIES_850_GLAZING_OPTIONS,
    shelf: ["No Shelf", "Standard Shelf"],
    packaging: STANDARD_PACKAGING_OPTIONS,
  },
  series_850_ft: {
    glazing: MIRROR_GLAZING_OPTIONS,
    shelf: ["No Shelf", "Standard Shelf"],
    packaging: STANDARD_PACKAGING_OPTIONS,
  },
  series_3200: {
    glazing: MIRROR_GLAZING_OPTIONS,
    shelf: ["No Shelf", "Standard Shelf", "Integral Shelf"],
    packaging: STANDARD_PACKAGING_OPTIONS,
  },
  series_3200_ft: {
    glazing: MIRROR_GLAZING_OPTIONS,
    shelf: ["No Shelf", "Standard Shelf", "Integral"],
    packaging: STANDARD_PACKAGING_OPTIONS,
  },
};

function preferredDefault(type, field, options) {
  const defaultFrameFinishing = {
    series_850: "Stainless Steel Channel Frame",
    series_850_ft: "SS Fixed Tilt Channel Frame",
    series_3200: "Brushed Stainless Frame",
    series_3200_ft: "Brushed Stainless Steel Fixed Tilt Frame",
    series_4100: "Brushed Black Stainless Steel",
  };
  const defaults = {
    width: 24,
    height: 36,
    glazing: type === "series_4100" ? "5mm Mirror" : "5mm Standard",
    frameFinishing: defaultFrameFinishing[type] || options[0],
    shelf: "No Shelf",
    packaging: options.includes("Standard Packaging") ? "Standard Packaging" : options.includes("Standard Box") ? "Standard Box" : options[0],
    category: "Indoor Acrylic Convex Mirror",
    itemCode: "ICM-26",
  };
  return options.includes(defaults[field]) ? defaults[field] : options[0];
}

const fieldLabels = {
  item: "Finishing",
  width: "Width",
  height: "Height",
  length: "Length",
  depth: "Depth",
  glazing: "Glazing",
  frameFinishing: "Frame Finishing",
  shelf: "Shelf",
  packaging: "Packaging",
  category: "Category",
  itemCode: "Item Code",
  edgeWork: "Edge Work",
  shatterStop: "Shatter Stop",
  finish: "Finish",
  holesTape: "Holes / Tape",
  thickness: "Thickness",
  goldVeining: "Gold Veining",
  guard: "Guard",
  easedEdge: "Eased Edge",
  holes: "Holes",
  tape: "Tape",
  wing1: "Wing 1",
  wing2: "Wing 2",
  center: "Center",
  face: "Face",
  back: "Back",
  angle: "Angle",
};

function calculateCatalogQuote(type, input = {}) {
  const catalog = SKU_CATALOG[type];
  if (!catalog) return unavailable(`Unsupported calculator type: ${type}`, "unsupported");
  if (type === "series_850") return calculateSeries850CatalogQuote(catalog, input);
  if (type === "series_3200" || type === "series_3200_ft") {
    return calculateAdjustedCatalogQuote(type, catalog, input);
  }
  const candidate = catalog.rows.find((row) => {
    if (type === "convex_domes" && input.itemCode) return valuesEqual(row.options.itemCode, input.itemCode, "itemCode");
    return catalog.fields.every((field) => valuesEqual(row.options[field], input[field], field));
  });
  if (!candidate) return unavailable("No matching workbook SKU price row for the selected options.");

  const price = priceBlockFromCustomerPrices(candidate.prices, input);
  const imageConfig = CATALOG_IMAGE_FIELDS[type];
  const assetValue = imageConfig.field === "sku" ? type : candidate.options[imageConfig.field];
  return {
    ok: true,
    status: "quoted",
    type,
    customerId: input.customerId ?? null,
    customerGroup: price.customerGroup,
    discountMultiplier: price.discountMultiplier,
    selections: { ...candidate.options, quantity: price.quantity },
    calculation: {
      source: "workbook_sku_catalog",
      squareFeet: candidate.squareFeet,
      lbsPerSquareFoot: candidate.lbsPerSquareFoot,
      totalLbs: candidate.totalLbs,
    },
    price: price.price,
    sku: candidate.sku,
    description: candidate.description,
    assets: productAssets({
      type,
      prefix: imageConfig.prefix,
      value: assetValue,
      datasheetName: type === "convex_domes" ? candidate.options.category : type,
    }),
  };
}

const CURRENT_CATALOG_PRICE_FACTORS = {
  series_3200: 1.04,
  series_3200_ft: 1.04,
};

function calculateAdjustedCatalogQuote(type, catalog, input = {}) {
  const candidate = catalog.rows.find((row) =>
    catalog.fields.every((field) => valuesEqual(row.options[field], input[field], field)),
  );
  if (!candidate) return unavailable("No matching workbook SKU price row for the selected options.");

  const workbookFactor = CURRENT_CATALOG_PRICE_FACTORS[type] ?? 1;
  const unitListCad = roundToQuarter(candidate.prices.Guest * workbookFactor);
  const price = priceBlock(unitListCad, input, type);
  const imageConfig = CATALOG_IMAGE_FIELDS[type];
  const displayOptions = displayOptionsFromInput(catalog, candidate, input);
  const assetValue = imageConfig.field === "sku" ? type : displayOptions[imageConfig.field];
  const description = descriptionWithDisplayOptions(candidate.description, candidate.options, displayOptions);

  return {
    ok: true,
    status: "quoted",
    type,
    customerId: input.customerId ?? null,
    customerGroup: price.customerGroup,
    discountMultiplier: price.discountMultiplier,
    selections: { ...displayOptions, quantity: price.quantity },
    calculation: {
      source: "workbook_2026_adjusted_catalog",
      squareFeet: candidate.squareFeet,
      lbsPerSquareFoot: candidate.lbsPerSquareFoot,
      totalLbs: candidate.totalLbs,
      importedListCad: candidate.prices.Guest,
      workbookFactor,
      listCadBeforeCustomerDiscount: roundCurrency(unitListCad),
    },
    price: price.price,
    sku: candidate.sku,
    description,
    assets: productAssets({
      type,
      prefix: imageConfig.prefix,
      value: assetValue,
      datasheetName: type,
    }),
  };
}

const SERIES_850_FRAME_CODES = {
  "Stainless Steel Channel Frame": "SSCH",
  "Brushed Steel Gold": "BRGO",
  "Brushed Steel Bronze": "BRBR",
  "Brushed Steel Black": "BRBL",
};

const SERIES_850_FRAME_SURCHARGES = {
  "Stainless Steel Channel Frame": 0,
  "Brushed Steel Gold": 0.15,
  "Brushed Steel Bronze": 0.15,
  "Brushed Steel Black": 0.15,
};

const SERIES_850_TEMPERED_SIZES = [
  { width: 18, height: 24 },
  { width: 18, height: 30 },
  { width: 18, height: 36 },
  { width: 24, height: 30 },
  { width: 24, height: 36 },
  { width: 24, height: 48 },
  { width: 24, height: 60 },
  { width: 24, height: 72 },
  { width: 36, height: 36 },
  { width: 36, height: 48 },
  { width: 36, height: 72 },
];

const SERIES_850_TEMPERED_SIZE_OPTIONS = SERIES_850_TEMPERED_SIZES.map(({ width, height }) => `${width}x${height}`);

const SERIES_850_GLAZING = {
  "5mm Standard": { code: "5MM", psfAdd: 0 },
  "6mm Mirror": { code: "6MM", psfAdd: 3.15 },
  "6mm Tempered": { code: "6MMT", psfAdd: 31.85 },
  "S/S Mirror": { code: "SSGL", psfAdd: 39.5 },
  "3mm Acrylic": { code: "3MMA", psfAdd: 22 },
  "6mm Acrylic": { code: "6MMA", psfAdd: 39.5 },
  "5mm w/ Shatter Stop": { code: "5SHS", psfAdd: 7.25 },
};

const SERIES_850_SHELF = {
  "No Shelf": { code: "NS", multiplier: 0 },
  "Standard Shelf": { code: "SH", multiplier: 1.5 },
};

const SERIES_850_PACKAGING = {
  "Standard Packaging": { code: "S2", addCad: 0 },
  "Standard 1 Per Box": { code: "C1", addCad: 12 },
};

function roundToQuarter(value) {
  return Math.round((Number(value) + Number.EPSILON) / 0.25) * 0.25;
}

function resolveSeries850MapOption(options, value, fallbackLabel) {
  const label = Object.keys(options).find((option) => normalizedOption(option) === normalizedOption(value)) || fallbackLabel;
  return { label, ...options[label] };
}

function resolveSeries850Packaging(value) {
  const normalized = canonicalOption("packaging", value);
  if (normalized === "standard box" || normalized === "standard packaging") {
    return { label: "Standard Packaging", ...SERIES_850_PACKAGING["Standard Packaging"] };
  }
  if (normalized === "standard 1 per box" || normalized === "courier box") {
    return { label: "Standard 1 Per Box", ...SERIES_850_PACKAGING["Standard 1 Per Box"] };
  }
  return { label: "Standard Packaging", ...SERIES_850_PACKAGING["Standard Packaging"] };
}

function parseSeries850TemperedSize(value) {
  const match = String(value || "").match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function resolveSeries850Dimensions(input = {}) {
  const temperedSize = parseSeries850TemperedSize(input.temperedSize);
  if (temperedSize) return temperedSize;
  return {
    width: dimensionValue(input, "width"),
    height: dimensionValue(input, "height"),
  };
}

function series850TemperedSizeAllowed(width, height) {
  return SERIES_850_TEMPERED_SIZES.some((size) => size.width === width && size.height === height);
}

function series850FixedBasePrice(catalog, width, height) {
  const candidate = catalog.rows.find((row) =>
    row.options.width === width &&
    row.options.height === height &&
    valuesEqual(row.options.glazing, "5mm Standard", "glazing") &&
    valuesEqual(row.options.frameFinishing, "Stainless Steel Channel Frame", "frameFinishing") &&
    valuesEqual(row.options.shelf, "No Shelf", "shelf") &&
    valuesEqual(row.options.packaging, "Standard Packaging", "packaging"),
  );
  return candidate ? roundToQuarter(candidate.prices.Guest * 1.04) : 0;
}

function calculateSeries850CatalogQuote(catalog, input = {}) {
  const frameFinishing = Object.hasOwn(SERIES_850_FRAME_CODES, input.frameFinishing)
    ? input.frameFinishing
    : "Stainless Steel Channel Frame";
  const glazing = resolveSeries850MapOption(SERIES_850_GLAZING, input.glazing, "5mm Standard");
  const shelf = resolveSeries850MapOption(SERIES_850_SHELF, input.shelf, "No Shelf");
  const packaging = resolveSeries850Packaging(input.packaging);
  const { width, height } = resolveSeries850Dimensions(input);
  if (width <= 0 || height <= 0) return unavailable("Width and height are required.");

  const isTempered = normalizedOption(glazing.label) === "6mm tempered";
  if (isTempered && !series850TemperedSizeAllowed(width, height)) {
    return unavailable("Tempered glazing is only available in the listed stock sizes.");
  }

  const normalizedWidth = roundUpToEvenInches(width);
  const normalizedHeight = roundUpToEvenInches(height);
  if (normalizedWidth < 12 || normalizedHeight < 12) return unavailable("Size outside min/max allowed");
  if (normalizedWidth > 96 || normalizedHeight > 96) return unavailable("Size outside min/max allowed");
  if (normalizedWidth > 48 && normalizedHeight > 48) return unavailable("Size outside min/max allowed");

  const squareFeet = (normalizedWidth * normalizedHeight) / 144;
  const fixedBaseCad = series850FixedBasePrice(catalog, width, height);
  const normalBaseCad = 40 + squareFeet * (20 + (normalizedWidth * normalizedHeight) / 360);
  const isOversizeBothSides = normalizedWidth > 36 && normalizedHeight > 36;
  const oversizeBaseCad = squareFeet * 30.9;
  const baseListCad = isOversizeBothSides ? oversizeBaseCad : fixedBaseCad || normalBaseCad;
  const frameSurchargeRate = SERIES_850_FRAME_SURCHARGES[frameFinishing] ?? 0;
  const frameSurchargeBaseCad = fixedBaseCad || normalBaseCad;
  const frameSurchargeCad = frameSurchargeBaseCad * frameSurchargeRate;
  const glazingCad = squareFeet * glazing.psfAdd;
  const shelfCad = normalizedWidth * shelf.multiplier;
  const packagingCad = packaging.addCad;
  const listCad = baseListCad + frameSurchargeCad + glazingCad + shelfCad + packagingCad;
  const price = priceBlock(listCad, input, "series_850");
  const imageConfig = CATALOG_IMAGE_FIELDS.series_850;
  const frameCode = SERIES_850_FRAME_CODES[frameFinishing] || "SSCH";
  const widthLabel = formatDimension(input.widthInches ?? width, input.widthFraction);
  const heightLabel = formatDimension(input.heightInches ?? height, input.heightFraction);
  const skuSize = fixedBaseCad ? `${widthLabel}X${heightLabel}` : "CUSTOM";
  const sku = `M-850-${skuSize}-${glazing.code}-${frameCode}-${shelf.code}-${packaging.code}`;
  const description = `850 Series ${widthLabel}"x${heightLabel}" ${glazing.label} ${frameFinishing} ${shelf.label} ${packaging.label}`;

  return {
    ok: true,
    status: "quoted",
    type: "series_850",
    customerId: input.customerId ?? null,
    customerGroup: price.customerGroup,
    discountMultiplier: price.discountMultiplier,
    selections: {
      width,
      height,
      glazing: glazing.label,
      frameFinishing,
      shelf: shelf.label,
      packaging: packaging.label,
      ...(isTempered ? { temperedSize: `${width}x${height}` } : {}),
      quantity: price.quantity,
    },
    calculation: {
      source: "workbook_2026_series_850_formula",
      normalizedWidth,
      normalizedHeight,
      squareFeet: roundCurrency(squareFeet),
      fixedBaseCad: fixedBaseCad ? roundCurrency(fixedBaseCad) : null,
      normalBaseCad: roundCurrency(normalBaseCad),
      oversizeBaseCad: isOversizeBothSides ? roundCurrency(oversizeBaseCad) : null,
      basePriceCad: roundCurrency(baseListCad),
      glazingPsfAdd: glazing.psfAdd,
      glazingCad: roundCurrency(glazingCad),
      shelfCad: roundCurrency(shelfCad),
      packagingCad: roundCurrency(packagingCad),
      frameSurchargeRate,
      frameSurchargeCad: roundCurrency(frameSurchargeCad),
      listCadBeforeCustomerDiscount: roundCurrency(listCad),
    },
    price: price.price,
    sku,
    description,
    assets: productAssets({
      type: "series_850",
      prefix: imageConfig.prefix,
      value: frameFinishing,
      datasheetName: "series_850",
    }),
  };
}

const CUSTOM_CONFIGS = {
  cut_glass: {
    label: "Cut Glass",
    fields: [
      { name: "item", label: "Finishing", control: "select", options: CUT_GLASS_ITEMS.map((item) => item.label), default: "Clear Glass 5mm" },
      { name: "width", label: "Width", control: "dimension", defaultInches: 24, min: 12, max: 120 },
      { name: "height", label: "Height", control: "dimension", defaultInches: 36, min: 12, max: 120 },
      { name: "edgeWork", label: "Edge Work", control: "select", options: EDGE_WORKS.filter((edge) => edge !== "No"), default: "Polished Edge" },
    ],
  },
  shelves: {
    label: "Shelves",
    fields: [
      { name: "item", label: "Series", control: "select", options: SHELF_ITEMS.map((item) => item.label), default: "Series 855" },
      { name: "length", label: "Length", control: "dimension", defaultInches: 16, min: 12, max: 96 },
      { name: "depth", label: "Depth", control: "dimension", defaultInches: 5, min: 4, max: 12 },
      { name: "finish", label: "Frame Finishing", control: "select", options: SHELF_FINISHES.map((finish) => finish.label), default: "18GA Brushed Steel" },
    ],
  },
  series_855: {
    label: "Series 855 Steel Shelves",
    fields: [
      { name: "length", label: "Length", control: "dimension", defaultInches: 16, min: 12, max: 96 },
      { name: "depth", label: "Depth", control: "dimension", defaultInches: 5, min: 4, max: 12 },
      { name: "finish", label: "Frame Finishing", control: "select", options: SHELF_FINISHES.map((finish) => finish.label), default: "18GA Brushed Steel" },
    ],
  },
  series_3205: {
    label: "Series 3205 Steel Shelves",
    fields: [
      { name: "length", label: "Length", control: "dimension", defaultInches: 16, min: 12, max: 96 },
      { name: "depth", label: "Depth", control: "dimension", defaultInches: 5, min: 4, max: 12 },
      { name: "finish", label: "Frame Finishing", control: "select", options: SHELF_FINISHES.map((finish) => finish.label), default: "18GA Brushed Steel" },
    ],
  },
  kick_plates: {
    label: "Kick Plates",
    fields: [
      { name: "item", label: "Finishing", control: "select", options: KICK_PLATE_ITEMS.map((item) => item.label), default: "18GA Brushed Steel" },
      { name: "width", label: "Width", control: "dimension", defaultInches: 48, min: 6, max: 96 },
      { name: "height", label: "Height", control: "dimension", defaultInches: 6, min: 6, max: 96 },
      { name: "holesTape", label: "Holes/Tape", control: "select", options: KICK_PLATE_EXTRAS.map((item) => item.label), default: "No Holes | No Tape" },
    ],
  },
  antique: {
    label: "Antique Mirror",
    fields: [
      { name: "item", label: "Model", control: "select", options: ANTIQUE_ITEMS.map((item) => item.label), default: "9100" },
      { name: "thickness", label: "Depth Thickness", control: "select", options: ["3MM", "5MM", "6MM"], default: "5MM" },
      { name: "width", label: "Width", control: "dimension", defaultInches: 48, min: 6, max: 96 },
      { name: "height", label: "Height", control: "dimension", defaultInches: 36, min: 6, max: 96 },
      { name: "goldVeining", label: "Add Gold Veining", control: "select", options: YES_NO, default: "No" },
      { name: "shatterStop", label: "Shatter Stop (y/n)", control: "select", options: YES_NO, default: "No" },
      { name: "edgeWork", label: "Polished Edge (y/n)", control: "select", options: EDGE_WORKS, default: "No" },
    ],
  },
  u_guard: {
    label: "U Guards",
    fields: [
      { name: "wing1", label: "Wing 1", control: "number", default: 2, min: 0, max: 24, step: 0.0625 },
      { name: "center", label: "Center", control: "number", default: 4, min: 4, max: 12, step: 0.0625 },
      { name: "wing2", label: "Wing 2", control: "number", default: 2, min: 0, max: 24, step: 0.0625 },
      { name: "length", label: "Length", control: "number", default: 72, min: 4, max: 120, step: 0.0625 },
      { name: "guard", label: "Guard", control: "select", options: GUARD_ITEMS.map((item) => item.label), default: "18ga Brushed Steel" },
      { name: "easedEdge", label: "Eased Edge Y/N", control: "select", options: ["Yes", "No"], default: "No" },
      { name: "holes", label: "Holes Y/N", control: "select", options: ["Yes", "No", "Countersunk"], default: "No" },
      { name: "tape", label: "Tape Y/N", control: "select", options: ["Yes", "No"], default: "Yes" },
    ],
  },
  corner_guard: {
    label: "Corner Guards",
    fields: [
      { name: "wing1", label: "Wing 1", control: "number", default: 2, min: 0.5, max: 12, step: 0.0625 },
      { name: "wing2", label: "Wing 2", control: "number", default: 2, min: 0.5, max: 12, step: 0.0625 },
      { name: "length", label: "Length", control: "number", default: 72, min: 4, max: 120, step: 0.0625 },
      { name: "guard", label: "Guard", control: "select", options: GUARD_ITEMS.map((item) => item.label), default: "18ga Brushed Steel" },
      { name: "easedEdge", label: "Eased Edge Y/N", control: "select", options: ["Yes", "No"], default: "No" },
      { name: "holes", label: "Holes Y/N", control: "select", options: ["Yes", "No", "Countersunk"], default: "No" },
      { name: "tape", label: "Tape Y/N", control: "select", options: ["Yes", "No"], default: "No" },
      { name: "angle", label: "Angle", control: "number", default: 90, min: 90, max: 170, step: 5 },
    ],
  },
  j_mould: {
    label: "J Mould",
    fields: [
      { name: "face", label: "Face", control: "number", default: 0.5, min: 0.25, max: 0.75, step: 0.0625 },
      { name: "center", label: "Center", control: "number", default: 0.3125, min: 0.3125, max: 0.5625, step: 0.0625 },
      { name: "back", label: "Back", control: "number", default: 1.5, min: 0.25, max: 3, step: 0.0625 },
      { name: "length", label: "Length", control: "number", default: 72, min: 4, max: 120, step: 0.0625 },
      { name: "guard", label: "Guard", control: "select", options: GUARD_ITEMS.map((item) => item.label), default: "18ga Brushed Steel" },
    ],
  },
};

const CUSTOM_CALCULATORS = {
  cut_glass: calculateCutGlass,
  shelves: calculateShelves,
  series_855: calculateSeries855Shelves,
  series_3205: calculateSeries3205Shelves,
  kick_plates: calculateKickPlates,
  series_3300: calculateSeries3300,
  antique: calculateAntique,
  u_guard: calculateUGuards,
  corner_guard: calculateCornerGuards,
  j_mould: calculateJMould,
};

export function getWorkbookPublicConfig(type) {
  if (type === "series_850") return series850Config();
  if (SKU_CATALOG[type] && type !== "series_3300") return catalogConfig(type);
  const config = CUSTOM_CONFIGS[type] || (type === "series_3300" ? {
    label: "Series 3300 Stainless Steel Mirror",
    fields: [
      { name: "width", label: "Width", control: "dimension", defaultInches: 24, min: 12, max: 48 },
      { name: "height", label: "Height", control: "dimension", defaultInches: 36, min: 12, max: 48 },
    ],
  } : null);
  if (!config) return null;
  return {
    type,
    label: config.label,
    customerGroups: STANDARD_CUSTOMER_GROUP_OPTIONS,
    fields: config.fields,
    fallbackImageUrl: FALLBACK_IMAGE_URL,
    datasheets: datasheets(type),
  };
}

export function calculateWorkbookQuote(input = {}) {
  const type = input.type;
  if (SKU_CATALOG[type] && type !== "series_3300") return calculateCatalogQuote(type, input);
  const calculator = CUSTOM_CALCULATORS[type];
  if (!calculator) return unavailable(`Unsupported calculator type: ${type}`, "unsupported");
  return calculator(input);
}

export function getWorkbookCalculatorTypes() {
  return [...Object.keys(SKU_CATALOG), ...Object.keys(CUSTOM_CONFIGS)].sort();
}

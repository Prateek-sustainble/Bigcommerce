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
const EASED_EDGE_OPTIONS = ["No Eased Edge", "Eased Edge"];
const HOLE_OPTIONS = ["No Holes", "Holes", "Countersunk"];
const TAPE_OPTIONS = ["No Tape", "Tape"];

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

function valuesEqual(rowValue, inputValue) {
  if (typeof rowValue === "number") return Number(inputValue) === rowValue;
  return normalizedOption(rowValue) === normalizedOption(inputValue);
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

function datasheets(name) {
  const file = slug(name, "_", "upper");
  return {
    en: `${DATASHEET_BASE_URL}/${file}.pdf`,
    fr: `${DATASHEET_FR_BASE_URL}/${file}_FR.pdf`,
  };
}

function productAssets({ type, prefix, value, datasheetName }) {
  const assetSet = WORKBOOK_IMAGE_ASSETS[type] || WORKBOOK_IMAGE_ASSETS[prefixToType(prefix)];
  return imageSet({
    prefix,
    value,
    baseUrl: IMAGE_BASE_URL,
    fallbackImageUrl: assetSet?.fallbackImageUrl || FALLBACK_IMAGE_URL,
    datasheets: datasheets(datasheetName || value),
    primaryImageUrl: assetSet?.primaryImageUrl,
    galleryUrls: assetSet?.galleryUrls,
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
  const edgeWork = input.edgeWork || "Clean Cut";
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
    datasheetName: "SHELVES",
  });
}

function calculateShelves(input = {}) {
  return calculateShelvesForItem(input.item, input, "shelves");
}

function calculateSeries855Shelves(input = {}) {
  return calculateShelvesForItem("Series 855", input, "series_855");
}

function calculateSeries3205Shelves(input = {}) {
  return calculateShelvesForItem("Series 3205", input, "series_3205");
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
  const exactFixedPrice = item.label === "18 Gauge #4 Brush"
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
    description: `KICK-Series-Item ${item.imageLabel}-Width${widthLabel}xHeight${heightLabel}- ${holesTape.label}`,
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
  const easedEdgePriceCad = input.easedEdge === "Eased Edge" ? length * 0.05 : 0;
  const holesPriceCad = input.holes === "Holes" ? 0.1 * length / 6 : input.holes === "Countersunk" ? 0.25 * length / 6 : 0;
  const tapePriceCad = input.tape === "Tape" ? 0.1 * length : 0;
  const listCad = guardPriceCad + easedEdgePriceCad + holesPriceCad + tapePriceCad;

  return quoteResponse({
    input,
    type: "u_guard",
    unitListCad: listCad,
    sku: `UGUARD-${wing1}-${center}-${wing2}-${length}-${guard.abbreviation}-CUSTOM`,
    description: `UGUARD-Series-Wing${wing1}-Center${center}-Wing${wing2}-Length${length}- ${guard.label}`,
    selections: { wing1, center, wing2, length, guard: guard.label, easedEdge: input.easedEdge || "No Eased Edge", holes: input.holes || "No Holes", tape: input.tape || "No Tape" },
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
  const easedEdgePriceCad = input.easedEdge === "Eased Edge" ? length * 0.1125 : 0;
  const holesPriceCad = input.holes === "Holes" ? 0.225 * length / 6 : input.holes === "Countersunk" ? 0.5625 * length / 6 : 0;
  const tapePriceCad = input.tape === "Tape" ? 0.225 * length : 0;
  const nonStandardAngleFeeCad = angle === 90 ? 0 : (guardPriceCad + holesPriceCad) * 0.05;
  const listCad = guardPriceCad + easedEdgePriceCad + holesPriceCad + tapePriceCad + nonStandardAngleFeeCad;

  return quoteResponse({
    input,
    type: "corner_guard",
    unitListCad: listCad,
    sku: `CORNER-${wing1}-${wing2}-${length}-${guard.abbreviation}-CUSTOM`,
    description: `CORNER-Series-Wing${wing1}-Wing${wing2}-Length${length}- ${guard.label}- Angle ${angle}`,
    selections: { wing1, wing2, length, guard: guard.label, easedEdge: input.easedEdge || "No Eased Edge", holes: input.holes || "No Holes", tape: input.tape || "No Tape", angle },
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
    sku: `JMOULD-${face}-${center}-${back}-${length}-${guard.abbreviation}-CUSTOM`,
    description: `JMOULD-Series-Face${face}-Center${center}-Back${back}-Length${length}- ${guard.label}`,
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
  const fields = catalog.fields.map((field) => ({
    name: field,
    label: fieldLabels[field] || field,
    control: "select",
    options: uniqueOptions(catalog.rows, field),
    default: preferredDefault(type, field, uniqueOptions(catalog.rows, field)),
  }));
  return {
    type,
    label: catalog.label,
    customerGroups: type === "convex_domes" ? CUSTOMER_GROUP_OPTIONS : STANDARD_CUSTOMER_GROUP_OPTIONS,
    fields,
    fallbackImageUrl: FALLBACK_IMAGE_URL,
    datasheets: datasheets(type),
  };
}

function preferredDefault(type, field, options) {
  const defaultFrameFinishing = {
    series_850: "Stainless Steel Channel Frame",
    series_850_ft: "SS Fixed Tilt Channel Frame",
    series_3200: "Brushed Stainless Frame",
    series_3200_ft: "Brushed S/S Fixed Tilt Frame",
    series_4100: "Brushed Stainless Steel",
  };
  const defaults = {
    width: 24,
    height: 36,
    glazing: type === "series_4100" ? "5mm Mirror" : "5mm Standard",
    frameFinishing: defaultFrameFinishing[type] || options[0],
    shelf: "No Shelf",
    packaging: options.includes("Standard Box") ? "Standard Box" : options[0],
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
  const candidate = catalog.rows.find((row) => {
    if (type === "convex_domes" && input.itemCode) return valuesEqual(row.options.itemCode, input.itemCode);
    return catalog.fields.every((field) => valuesEqual(row.options[field], input[field]));
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

const CUSTOM_CONFIGS = {
  cut_glass: {
    label: "Cut Glass",
    fields: [
      { name: "item", label: "Finishing", control: "select", options: CUT_GLASS_ITEMS.map((item) => item.label), default: "Clear Glass 5mm" },
      { name: "width", label: "Width", control: "dimension", defaultInches: 24, min: 12, max: 120 },
      { name: "height", label: "Height", control: "dimension", defaultInches: 36, min: 12, max: 120 },
      { name: "edgeWork", label: "Edge Work", control: "select", options: EDGE_WORKS.filter((edge) => edge !== "No"), default: "Clean Cut" },
    ],
  },
  shelves: {
    label: "Shelves",
    fields: [
      { name: "item", label: "Series", control: "select", options: SHELF_ITEMS.map((item) => item.label), default: "Series 855" },
      { name: "length", label: "Length", control: "dimension", defaultInches: 16, min: 12, max: 96 },
      { name: "depth", label: "Depth", control: "dimension", defaultInches: 5, min: 4, max: 12 },
      { name: "finish", label: "Finish", control: "select", options: SHELF_FINISHES.map((finish) => finish.label), default: "18GA Brushed Steel" },
    ],
  },
  series_855: {
    label: "Series 855 Steel Shelves",
    fields: [
      { name: "length", label: "Length", control: "dimension", defaultInches: 16, min: 12, max: 96 },
      { name: "depth", label: "Depth", control: "dimension", defaultInches: 5, min: 4, max: 12 },
      { name: "finish", label: "Finish", control: "select", options: SHELF_FINISHES.map((finish) => finish.label), default: "18GA Brushed Steel" },
    ],
  },
  series_3205: {
    label: "Series 3205 Steel Shelves",
    fields: [
      { name: "length", label: "Length", control: "dimension", defaultInches: 16, min: 12, max: 96 },
      { name: "depth", label: "Depth", control: "dimension", defaultInches: 5, min: 4, max: 12 },
      { name: "finish", label: "Finish", control: "select", options: SHELF_FINISHES.map((finish) => finish.label), default: "18GA Brushed Steel" },
    ],
  },
  kick_plates: {
    label: "Kick Plates",
    fields: [
      { name: "item", label: "Thickness", control: "select", options: KICK_PLATE_ITEMS.map((item) => item.label), default: "18 Gauge #4 Brush" },
      { name: "width", label: "Width", control: "dimension", defaultInches: 32, min: 6, max: 96 },
      { name: "height", label: "Height", control: "dimension", defaultInches: 8, min: 6, max: 96 },
      { name: "holesTape", label: "Holes / Tape", control: "select", options: KICK_PLATE_EXTRAS.map((item) => item.label), default: "No Holes | No Tape" },
    ],
  },
  antique: {
    label: "Antique Mirror",
    fields: [
      { name: "item", label: "Item", control: "select", options: ANTIQUE_ITEMS.map((item) => item.label), default: "9100" },
      { name: "thickness", label: "Thickness", control: "select", options: ["3MM", "5MM", "6MM"], default: "5MM" },
      { name: "width", label: "Width", control: "dimension", defaultInches: 48, min: 6, max: 96 },
      { name: "height", label: "Height", control: "dimension", defaultInches: 36, min: 6, max: 96 },
      { name: "edgeWork", label: "Edge Work", control: "select", options: EDGE_WORKS, default: "No" },
      { name: "goldVeining", label: "Gold Veining", control: "select", options: YES_NO, default: "No" },
      { name: "shatterStop", label: "Shatter Stop", control: "select", options: YES_NO, default: "No" },
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
      { name: "easedEdge", label: "Eased Edge", control: "select", options: EASED_EDGE_OPTIONS, default: "No Eased Edge" },
      { name: "holes", label: "Holes", control: "select", options: HOLE_OPTIONS, default: "No Holes" },
      { name: "tape", label: "Tape", control: "select", options: TAPE_OPTIONS, default: "Tape" },
    ],
  },
  corner_guard: {
    label: "Corner Guards",
    fields: [
      { name: "wing1", label: "Wing 1", control: "number", default: 2, min: 0.5, max: 12, step: 0.0625 },
      { name: "wing2", label: "Wing 2", control: "number", default: 2, min: 0.5, max: 12, step: 0.0625 },
      { name: "length", label: "Length", control: "number", default: 72, min: 4, max: 120, step: 0.0625 },
      { name: "guard", label: "Guard", control: "select", options: GUARD_ITEMS.map((item) => item.label), default: "18ga Brushed Steel" },
      { name: "easedEdge", label: "Eased Edge", control: "select", options: EASED_EDGE_OPTIONS, default: "No Eased Edge" },
      { name: "holes", label: "Holes", control: "select", options: HOLE_OPTIONS, default: "No Holes" },
      { name: "tape", label: "Tape", control: "select", options: TAPE_OPTIONS, default: "No Tape" },
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

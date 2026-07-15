import assert from "node:assert/strict";
import test from "node:test";
import { calculateQuote, getCalculatorPublicConfig } from "../src/calculators/index.js";

test("quotes workbook-backed cut glass", () => {
  const quote = calculateQuote({
    type: "cut_glass",
    customerGroup: "Guest",
    item: "Clear Glass 5mm",
    widthInches: 24,
    heightInches: 36,
    edgeWork: "Clean Cut",
  });

  assert.equal(quote.ok, true);
  assert.equal(quote.price.unitCad, 100.92);
  assert.equal(quote.sku, "GLASS-CG5MM-CUSTOM");
});

test("quotes workbook fixed tables for shelves, kick plates, and series 3300", () => {
  const shelf = calculateQuote({
    type: "series_855",
    customerGroup: "Guest",
    lengthInches: 16,
    depthInches: 5,
    finish: "18GA Brushed Steel",
  });
  const shelf3205 = calculateQuote({
    type: "series_3205",
    customerGroup: "Guest",
    lengthInches: 16,
    depthInches: 5,
    finish: "18GA Brushed Steel",
  });
  const kickPlate = calculateQuote({
    type: "kick_plates",
    customerGroup: "Guest",
    item: "18 Gauge #4 Brush",
    widthInches: 32,
    heightInches: 8,
    holesTape: "No Holes | No Tape",
  });
  const series3300 = calculateQuote({
    type: "series_3300",
    customerGroup: "Guest",
    widthInches: 24,
    heightInches: 36,
  });

  assert.equal(shelf.price.unitCad, 66.75);
  assert.equal(shelf3205.price.unitCad, 106.5);
  assert.equal(kickPlate.price.unitCad, 47.78);
  assert.equal(series3300.price.unitCad, 311.25);
});

test("quotes workbook guard profiles", () => {
  const uGuard = calculateQuote({
    type: "u_guard",
    customerGroup: "Guest",
    wing1: 2,
    center: 4,
    wing2: 2,
    length: 72,
    guard: "18ga Brushed Steel",
    easedEdge: "No Eased Edge",
    holes: "No Holes",
    tape: "Tape",
  });
  const cornerGuard = calculateQuote({
    type: "corner_guard",
    customerGroup: "Guest",
    wing1: 2,
    wing2: 2,
    length: 72,
    guard: "18ga Brushed Steel",
    easedEdge: "No Eased Edge",
    holes: "No Holes",
    tape: "No Tape",
    angle: 90,
  });
  const jMould = calculateQuote({
    type: "j_mould",
    customerGroup: "Guest",
    face: 0.5,
    center: 0.3125,
    back: 1.5,
    length: 72,
    guard: "18ga Brushed Steel",
  });

  assert.equal(uGuard.price.unitCad, 95.15);
  assert.equal(cornerGuard.price.unitCad, 50.25);
  assert.equal(jMould.price.unitCad, 26.25);
});

test("quotes antique mirror workbook default", () => {
  const quote = calculateQuote({
    type: "antique",
    customerGroup: "Guest",
    item: "9100",
    thickness: "5MM",
    widthInches: 48,
    heightInches: 36,
    edgeWork: "No",
    goldVeining: "No",
    shatterStop: "No",
  });

  assert.equal(quote.ok, true);
  assert.equal(quote.price.unitCad, 911.76);
});

test("quotes exact SKU catalog products and hidden customer pricing", () => {
  const series850 = calculateQuote({
    type: "series_850",
    customerGroup: "Contractor",
    width: 24,
    height: 36,
    glazing: "5mm Standard",
    frameFinishing: "Stainless Steel Channel Frame",
    shelf: "No Shelf",
    packaging: "Standard Box",
  });
  const convex = calculateQuote({
    type: "convex_domes",
    customerGroup: "Richelieu",
    category: "Indoor Acrylic Convex Mirror",
    itemCode: "ICM-26",
  });

  assert.equal(series850.ok, true);
  assert.equal(series850.price.unitCad, 85.23);
  assert.equal(series850.sku, "M-850-24X36-5MM-SSCH-NS-S2");
  assert.equal(convex.ok, true);
  assert.equal(convex.price.unitCad, 64.05);
});

test("quotes Series 850 fixed tilt from the current product sheet rules", () => {
  const quote = calculateQuote({
    type: "series_850_ft",
    customerGroup: "Guest",
    width: 24,
    height: 36,
    glazing: "5mm Standard",
    frameFinishing: "SS Fixed Tilt Channel Frame",
    shelf: "No Shelf",
    packaging: "Standard Packaging",
  });
  const gold = calculateQuote({
    type: "series_850_ft",
    customerGroup: "Guest",
    width: 24,
    height: 36,
    glazing: "5mm Standard",
    frameFinishing: "Brushed Steel Gold",
    shelf: "No Shelf",
    packaging: "Standard Packaging",
  });
  const config = getCalculatorPublicConfig("series_850_ft");
  const frameFinishing = config.fields.find((field) => field.name === "frameFinishing");

  assert.equal(quote.ok, true);
  assert.equal(quote.price.unitCad, 261);
  assert.equal(quote.price.unitUsd, 187.92);
  assert.equal(quote.sku, "M-850FT-24X36-5MM-SSCH-NS-S2");
  assert.equal(
    quote.description,
    "850FT Series 24\"x36\" 5mm Standard SS Fixed Tilt Channel Frame No Shelf Standard Packaging",
  );
  assert.equal(frameFinishing.control, "swatch");
  assert.deepEqual(frameFinishing.options, [
    "SS Fixed Tilt Channel Frame",
    "Brushed Steel Gold",
    "Brushed Steel Bronze",
    "Brushed Steel Black",
  ]);
  assert.equal(gold.price.unitCad, 300.15);
  assert.equal(gold.sku, "M-850FT-24X36-5MM-BRGO-NS-S2");
  assert.match(gold.assets.primaryImageUrl, /BRUSHED-STEEL-GOLD-1\.png$/);
});

test("exposes dynamic field schemas for non-frameless calculators", () => {
  const config = getCalculatorPublicConfig("series_855");

  assert.equal(config.type, "series_855");
  assert.ok(config.fields.every((field) => field.name !== "item"));
  assert.ok(config.customerGroups.includes("Contractor"));
});

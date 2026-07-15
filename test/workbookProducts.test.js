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
    item: "18GA Brushed Steel",
    widthInches: 48,
    heightInches: 6,
    holesTape: "No Holes | No Tape",
  });
  const series3300 = calculateQuote({
    type: "series_3300",
    customerGroup: "Guest",
    widthInches: 24,
    heightInches: 36,
  });

  assert.equal(shelf.price.unitCad, 66.75);
  assert.equal(shelf3205.price.unitCad, 66.75);
  assert.equal(shelf3205.sku, "SHELF-855-M-N4SS-CUSTOM");
  assert.equal(kickPlate.price.unitCad, 53.33);
  assert.equal(kickPlate.sku, "KICK-18G-CUSTOM");
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
  const uGuardWithFractionInputs = calculateQuote({
    type: "u_guard",
    customerGroup: "Guest",
    wing1Inches: 2,
    wing1Fraction: 0.5,
    centerInches: 4,
    centerFraction: 0.25,
    wing2Inches: 2,
    wing2Fraction: 0.125,
    lengthInches: 72,
    lengthFraction: 0.9375,
    guard: "16ga Brushed Steel",
    easedEdge: "No",
    holes: "No",
    tape: "Yes",
  });
  const uGuardImageExample = calculateQuote({
    type: "u_guard",
    customerGroup: "Guest",
    wing1Inches: 2,
    centerInches: 4,
    wing2Inches: 2,
    lengthInches: 72,
    guard: "16ga Brushed Steel",
    easedEdge: "No",
    holes: "No",
    tape: "Yes",
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
  const cornerGuardWithFractionInputs = calculateQuote({
    type: "corner_guard",
    customerGroup: "Guest",
    wing1Inches: 2,
    wing1Fraction: 0.25,
    wing2Inches: 2,
    wing2Fraction: 0.75,
    lengthInches: 72,
    lengthFraction: 0.5,
    guard: "16ga Brushed Black",
    easedEdge: "No",
    holes: "No",
    tape: "No",
    angle: 90,
  });
  const cornerGuardMinimumWing = calculateQuote({
    type: "corner_guard",
    customerGroup: "Guest",
    wing1Inches: 0,
    wing1Fraction: 0.5,
    wing2Inches: 0,
    wing2Fraction: 0.5,
    lengthInches: 4,
    lengthFraction: 0,
    guard: "18ga Brushed Steel",
    easedEdge: "No",
    holes: "No",
    tape: "No",
    angle: 90,
  });
  const cornerGuardTooSmallWing = calculateQuote({
    type: "corner_guard",
    customerGroup: "Guest",
    wing1Inches: 0,
    wing1Fraction: 0,
    wing2Inches: 2,
    wing2Fraction: 0,
    lengthInches: 72,
    lengthFraction: 0,
    guard: "18ga Brushed Steel",
    easedEdge: "No",
    holes: "No",
    tape: "No",
    angle: 90,
  });
  const cornerGuardTooLong = calculateQuote({
    type: "corner_guard",
    customerGroup: "Guest",
    wing1Inches: 2,
    wing1Fraction: 0,
    wing2Inches: 2,
    wing2Fraction: 0,
    lengthInches: 120,
    lengthFraction: 0.25,
    guard: "18ga Brushed Steel",
    easedEdge: "No",
    holes: "No",
    tape: "No",
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
  assert.equal(uGuardWithFractionInputs.price.unitCad, 119.29);
  assert.equal(uGuardWithFractionInputs.selections.wing1, 2.5);
  assert.equal(uGuardWithFractionInputs.selections.center, 4.25);
  assert.equal(uGuardWithFractionInputs.selections.wing2, 2.125);
  assert.equal(uGuardWithFractionInputs.selections.length, 72.9375);
  assert.equal(uGuardImageExample.price.unitCad, 108.34);
  assert.match(uGuardImageExample.assets.primaryImageUrl, /U_GUARDS_16GA_BRUSHED_STEEL-1\.png$/);
  assert.equal(cornerGuard.price.unitCad, 50.25);
  assert.equal(cornerGuardWithFractionInputs.price.unitCad, 81.08);
  assert.equal(cornerGuardWithFractionInputs.selections.wing1, 2.25);
  assert.equal(cornerGuardWithFractionInputs.selections.wing2, 2.75);
  assert.equal(cornerGuardWithFractionInputs.selections.length, 72.5);
  assert.match(cornerGuardWithFractionInputs.assets.primaryImageUrl, /CORNER_GUARDS_16GA_BRUSHED_BLACK-1\.png$/);
  assert.equal(cornerGuardMinimumWing.ok, true);
  assert.equal(cornerGuardMinimumWing.selections.wing1, 0.5);
  assert.equal(cornerGuardMinimumWing.selections.wing2, 0.5);
  assert.equal(cornerGuardTooSmallWing.ok, false);
  assert.match(cornerGuardTooSmallWing.message, /Size outside min\/max allowed/);
  assert.equal(cornerGuardTooLong.ok, false);
  assert.match(cornerGuardTooLong.message, /Size outside min\/max allowed/);
  assert.equal(jMould.price.unitCad, 26.25);
});

test("U Guard config uses fraction dimensions and material image swatches", () => {
  const config = getCalculatorPublicConfig("u_guard");
  const wing1 = config.fields.find((field) => field.name === "wing1");
  const center = config.fields.find((field) => field.name === "center");
  const wing2 = config.fields.find((field) => field.name === "wing2");
  const length = config.fields.find((field) => field.name === "length");
  const guard = config.fields.find((field) => field.name === "guard");

  assert.equal(wing1.control, "dimension");
  assert.equal(wing1.defaultInches, 2);
  assert.equal(wing1.min, 0);
  assert.equal(wing1.max, 24);
  assert.equal(center.control, "dimension");
  assert.equal(center.defaultInches, 4);
  assert.equal(center.min, 4);
  assert.equal(center.max, 12);
  assert.equal(wing2.control, "dimension");
  assert.equal(length.control, "dimension");
  assert.equal(length.defaultInches, 72);
  assert.equal(length.min, 4);
  assert.equal(length.max, 120);
  assert.equal(guard.control, "swatch");
  assert.equal(guard.swatches.length, 6);
  assert.deepEqual(guard.options, [
    "18ga Brushed Steel",
    "16ga Brushed Steel",
    "20ga Mirror Steel",
    "16ga Brushed Gold",
    "16ga Brushed Bronze",
    "16ga Brushed Black",
  ]);
  assert.match(guard.swatches[0].imageUrl, /U_GUARDS_18GA_BRUSHED_STEEL-1\.png$/);
  assert.match(guard.swatches[5].imageUrl, /U_GUARDS_16GA_BRUSHED_BLACK-1\.png$/);
});

test("Corner Guard config uses quarter fractions and material image swatches", () => {
  const config = getCalculatorPublicConfig("corner_guard");
  const wing1 = config.fields.find((field) => field.name === "wing1");
  const wing2 = config.fields.find((field) => field.name === "wing2");
  const length = config.fields.find((field) => field.name === "length");
  const guard = config.fields.find((field) => field.name === "guard");
  const quarterFractions = [
    ["0", "0"],
    ["0.25", "1/4"],
    ["0.5", "1/2"],
    ["0.75", "3/4"],
  ];

  assert.equal(wing1.control, "dimension");
  assert.equal(wing1.defaultInches, 2);
  assert.equal(wing1.min, 0);
  assert.equal(wing1.max, 12);
  assert.deepEqual(wing1.inchesOptions, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(wing1.fractionOptions, quarterFractions);
  assert.equal(wing2.control, "dimension");
  assert.deepEqual(wing2.inchesOptions, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(wing2.fractionOptions, quarterFractions);
  assert.equal(length.control, "dimension");
  assert.equal(length.defaultInches, 72);
  assert.equal(length.min, 4);
  assert.equal(length.max, 120);
  assert.deepEqual(length.fractionOptions, quarterFractions);
  assert.equal(guard.control, "swatch");
  assert.equal(guard.swatches.length, 6);
  assert.deepEqual(guard.options, [
    "18ga Brushed Steel",
    "16ga Brushed Steel",
    "20ga Mirror Steel",
    "16ga Brushed Gold",
    "16ga Brushed Bronze",
    "16ga Brushed Black",
  ]);
  assert.match(guard.swatches[0].color, /linear-gradient/);
  assert.match(guard.swatches[5].color, /#111111/);
  assert.equal(guard.swatches[0].imageUrl, undefined);
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
    packaging: "Standard Packaging",
  });
  const convex = calculateQuote({
    type: "convex_domes",
    customerGroup: "Richelieu",
    category: "Indoor Acrylic Convex Mirror",
    itemCode: "ICM-26",
  });

  assert.equal(series850.ok, true);
  assert.equal(series850.price.unitCad, 88.55);
  assert.equal(series850.sku, "M-850-24X36-5MM-SSCH-NS-S2");

  const series850Black = calculateQuote({
    type: "series_850",
    customerGroup: "Guest",
    width: 24,
    height: 36,
    glazing: "5mm Standard",
    frameFinishing: "Brushed Steel Black",
    shelf: "No Shelf",
    packaging: "Standard Packaging",
  });

  assert.equal(series850Black.price.unitCad, 145.48);
  assert.equal(series850Black.sku, "M-850-24X36-5MM-BRBL-NS-S2");
  assert.match(series850Black.assets.primaryImageUrl, /SERIES_850_PICTURE_URL_LOWER_CASE-BRUSHED-STEEL-BLACK-1\.png$/);
  assert.equal(convex.ok, true);
  assert.equal(convex.price.unitCad, 64.05);
});

test("Series 850 uses custom dimensions except for tempered stock sizes", () => {
  const config = getCalculatorPublicConfig("series_850");
  const width = config.fields.find((field) => field.name === "width");
  const height = config.fields.find((field) => field.name === "height");
  const temperedSize = config.fields.find((field) => field.name === "temperedSize");

  assert.equal(width.control, "dimension");
  assert.deepEqual(width.hiddenWhen, { field: "glazing", value: "6mm Tempered" });
  assert.equal(height.control, "dimension");
  assert.equal(temperedSize.control, "select");
  assert.deepEqual(temperedSize.visibleWhen, { field: "glazing", value: "6mm Tempered" });
  assert.deepEqual(temperedSize.options, [
    "18x24",
    "18x30",
    "18x36",
    "24x30",
    "24x36",
    "24x48",
    "24x60",
    "24x72",
    "36x36",
    "36x48",
    "36x72",
  ]);

  const custom = calculateQuote({
    type: "series_850",
    customerGroup: "Guest",
    widthInches: 24,
    widthFraction: 0.5,
    heightInches: 36,
    heightFraction: 0,
    glazing: "5mm Standard",
    frameFinishing: "Stainless Steel Channel Frame",
    shelf: "No Shelf",
    packaging: "Standard Packaging",
  });

  assert.equal(custom.ok, true);
  assert.equal(custom.price.unitCad, 186.9);
  assert.equal(custom.sku, "M-850-CUSTOM-5MM-SSCH-NS-S2");

  const tempered = calculateQuote({
    type: "series_850",
    customerGroup: "Guest",
    temperedSize: "24x60",
    glazing: "6mm Tempered",
    frameFinishing: "Stainless Steel Channel Frame",
    shelf: "No Shelf",
    packaging: "Standard Packaging",
  });

  assert.equal(tempered.ok, true);
  assert.equal(tempered.selections.width, 24);
  assert.equal(tempered.selections.height, 60);
  assert.equal(tempered.sku, "M-850-CUSTOM-6MMT-SSCH-NS-S2");

  const unavailableTempered = calculateQuote({
    type: "series_850",
    customerGroup: "Guest",
    width: 16,
    height: 24,
    glazing: "6mm Tempered",
    frameFinishing: "Stainless Steel Channel Frame",
    shelf: "No Shelf",
    packaging: "Standard Packaging",
  });

  assert.equal(unavailableTempered.ok, false);
  assert.match(unavailableTempered.message, /listed stock sizes/);
});

test("quotes Series 3200 and 3200FT against the current workbook list prices", () => {
  const flat = calculateQuote({
    type: "series_3200",
    customerGroup: "Guest",
    width: 24,
    height: 36,
    glazing: "5mm Standard",
    frameFinishing: "Brushed Stainless Frame",
    shelf: "No Shelf",
    packaging: "Standard Packaging",
  });
  const fixedTilt = calculateQuote({
    type: "series_3200_ft",
    customerGroup: "Guest",
    width: 24,
    height: 36,
    glazing: "5mm Standard",
    frameFinishing: "Brushed Stainless Steel Fixed Tilt Frame",
    shelf: "No Shelf",
    packaging: "Standard Packaging",
  });

  assert.equal(flat.ok, true);
  assert.equal(flat.price.unitCad, 219.75);
  assert.equal(flat.price.unitUsd, 158.22);
  assert.equal(flat.sku, "M-3200-24X36-5MM-N4SS-NS-S2");
  assert.match(flat.description, /Standard Packaging$/);
  assert.equal(fixedTilt.ok, true);
  assert.equal(fixedTilt.price.unitCad, 346);
  assert.equal(fixedTilt.price.unitUsd, 249.12);
  assert.equal(fixedTilt.sku, "M-3200FT-24X36-5MM-N4SS-NS-S2");
  assert.match(fixedTilt.description, /Brushed Stainless Steel Fixed Tilt Frame No Shelf Standard Packaging$/);
});

test("Series 3200 uses custom dimensions except for tempered stock sizes", () => {
  const config = getCalculatorPublicConfig("series_3200");
  const width = config.fields.find((field) => field.name === "width");
  const height = config.fields.find((field) => field.name === "height");
  const temperedSize = config.fields.find((field) => field.name === "temperedSize");

  assert.equal(width.control, "dimension");
  assert.deepEqual(width.hiddenWhen, { field: "glazing", value: "6mm Tempered" });
  assert.equal(height.control, "dimension");
  assert.deepEqual(height.hiddenWhen, { field: "glazing", value: "6mm Tempered" });
  assert.equal(temperedSize.control, "select");
  assert.deepEqual(temperedSize.visibleWhen, { field: "glazing", value: "6mm Tempered" });
  assert.deepEqual(temperedSize.options, [
    "18x24",
    "18x30",
    "18x36",
    "24x30",
    "24x36",
    "24x48",
  ]);

  const custom = calculateQuote({
    type: "series_3200",
    customerGroup: "Guest",
    widthInches: 24,
    widthFraction: 0.5,
    heightInches: 36,
    heightFraction: 0,
    glazing: "5mm Standard",
    frameFinishing: "Brushed Stainless Frame",
    shelf: "No Shelf",
    packaging: "Standard Packaging",
  });

  assert.equal(custom.ok, true);
  assert.equal(custom.price.unitCad, 297.6);
  assert.equal(custom.sku, "M-3200-CUSTOM-5MM-N4SS-NS-S2");
  assert.match(custom.description, /24-1\/2"x36" 5mm Standard/);

  const tempered = calculateQuote({
    type: "series_3200",
    customerGroup: "Guest",
    temperedSize: "24x36",
    glazing: "6mm Tempered",
    frameFinishing: "Brushed Stainless Frame",
    shelf: "No Shelf",
    packaging: "Standard Packaging",
  });

  assert.equal(tempered.ok, true);
  assert.equal(tempered.price.unitCad, 421.35);
  assert.equal(tempered.selections.width, 24);
  assert.equal(tempered.selections.height, 36);
  assert.equal(tempered.sku, "M-3200-24X36-6MMT-N4SS-NS-S2");

  const unavailableTempered = calculateQuote({
    type: "series_3200",
    customerGroup: "Guest",
    width: 16,
    height: 24,
    glazing: "6mm Tempered",
    frameFinishing: "Brushed Stainless Frame",
    shelf: "No Shelf",
    packaging: "Standard Packaging",
  });

  assert.equal(unavailableTempered.ok, false);
  assert.match(unavailableTempered.message, /listed stock sizes/);
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
  assert.deepEqual(gold.assets.gallery, [
    "https://saddlebrown-turkey-900185.hostingersite.com/Images/SERIES_850FT_PICTURE_URL_LOWER_CASE-BRUSHED-STEEL-GOLD-1.png",
    "https://saddlebrown-turkey-900185.hostingersite.com/Images/SERIES_850FT_PICTURE_URL_LOWER_CASE-BRUSHED-STEEL-GOLD-2.png",
    "https://saddlebrown-turkey-900185.hostingersite.com/Images/SERIES_850FT_PICTURE_URL_LOWER_CASE-BRUSHED-STEEL-GOLD-4.png",
  ]);
});

test("exposes dynamic field schemas for non-frameless calculators", () => {
  const config = getCalculatorPublicConfig("series_855");

  assert.equal(config.type, "series_855");
  assert.ok(config.fields.every((field) => field.name !== "item"));
  assert.ok(config.customerGroups.includes("Contractor"));
});

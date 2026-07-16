import assert from "node:assert/strict";
import test from "node:test";
import { calculateFramelessMirrorQuote } from "../src/calculators/framelessMirror.js";
import { FRAMELESS_MIRROR_CONFIG } from "../src/data/framelessMirror.js";

test("matches the Calculator Studio screenshot example", () => {
  const quote = calculateFramelessMirrorQuote({
    customerGroup: "House",
    item: "Clear Mirror 5mm",
    widthInches: 24,
    widthFraction: 0,
    heightInches: 36,
    heightFraction: 0,
    edgeWork: "No",
    shatterStop: "No",
    quantity: 1,
  });

  assert.equal(quote.ok, true);
  assert.equal(quote.price.unitCad, 67.86);
  assert.equal(quote.price.unitUsd, 48.86);
  assert.equal(quote.price.subtotalCad, 67.86);
  assert.equal(quote.price.subtotalUsd, 48.86);
  assert.equal(quote.sku, "FRAMELESS-CM5MM-CUSTOM");
  assert.equal(
    quote.description,
    "FRAMELESS-Series-Item Clear Mirror 5mm-Width24xHeight36- No- No Shatter Stop",
  );
});

test("uses guest pricing when no customer group is provided", () => {
  const quote = calculateFramelessMirrorQuote({
    item: "Clear Mirror 5mm",
    widthInches: 24,
    heightInches: 36,
    edgeWork: "No",
    shatterStop: "No",
  });

  assert.equal(quote.ok, true);
  assert.equal(quote.customerGroup, "Guest");
  assert.equal(quote.price.unitCad, 135.72);
});

test("uses workbook edge-work rates for clear frameless mirrors", () => {
  const baseInput = {
    item: "Clear Mirror 5mm",
    widthInches: 24,
    heightInches: 36,
    shatterStop: "No",
  };

  const cleanCut = calculateFramelessMirrorQuote({
    ...baseInput,
    edgeWork: "Clean Cut",
  });
  const arrised = calculateFramelessMirrorQuote({
    ...baseInput,
    edgeWork: "Arrised Edge",
  });
  const polished = calculateFramelessMirrorQuote({
    ...baseInput,
    edgeWork: "Polished Edge",
  });

  assert.equal(cleanCut.ok, true);
  assert.equal(cleanCut.calculation.edgeWorkPriceCad, 0);
  assert.equal(cleanCut.price.unitCad, 135.72);

  assert.equal(arrised.ok, true);
  assert.equal(arrised.calculation.edgeWorkPriceCad, 2.4);
  assert.equal(arrised.price.unitCad, 138.5);

  assert.equal(polished.ok, true);
  assert.equal(polished.calculation.edgeWorkPriceCad, 18.6);
  assert.equal(polished.price.unitCad, 157.3);
});

test("rejects both sides above the workbook max-both size", () => {
  const quote = calculateFramelessMirrorQuote({
    item: "Clear Mirror 5mm",
    widthInches: 60,
    heightInches: 60,
    edgeWork: "No",
    shatterStop: "No",
  });

  assert.equal(quote.ok, false);
  assert.equal(quote.message, "Size outside min/max allowed");
});

test("rejects acrylic edge work per workbook availability rule", () => {
  const quote = calculateFramelessMirrorQuote({
    item: "Acrylic Mirror 3mm",
    widthInches: 24,
    heightInches: 36,
    edgeWork: "Polished Edge",
    shatterStop: "No",
  });

  assert.equal(quote.ok, false);
  assert.equal(quote.message, "Polished Not Available");
});

test("uses option-specific Hostinger image overrides when configured", () => {
  const override = {
    item: "Clear Mirror 5mm",
    edgeWork: "Polished Edge",
    shatterStop: "Yes",
    primaryImageUrl: "https://example.com/main.png",
    gallery: ["https://example.com/one.png", "https://example.com/two.png"],
  };

  FRAMELESS_MIRROR_CONFIG.images.optionImageOverrides.push(override);
  try {
    const quote = calculateFramelessMirrorQuote({
      customerGroup: "House",
      item: "Clear Mirror 5mm",
      widthInches: 24,
      heightInches: 36,
      edgeWork: "Polished Edge",
      shatterStop: "Yes",
    });

    assert.equal(quote.ok, true);
    assert.equal(quote.assets.primaryImageUrl, override.primaryImageUrl);
    assert.deepEqual(quote.assets.gallery, override.gallery);
  } finally {
    FRAMELESS_MIRROR_CONFIG.images.optionImageOverrides.pop();
  }
});

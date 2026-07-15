const IMAGE_BASE_URL = "https://saddlebrown-turkey-900185.hostingersite.com/Images";
const FALLBACK_IMAGE_URL = "/assets/frameless-mirror-placeholder.svg";

function assetSet(primaryFile, galleryFiles = []) {
  return {
    primaryImageUrl: `${IMAGE_BASE_URL}/${primaryFile}`,
    galleryUrls: galleryFiles.map((file) => `${IMAGE_BASE_URL}/${file}`),
    fallbackImageUrl: FALLBACK_IMAGE_URL,
  };
}

function numberedAssetSet(stem, indexes, extensionByIndex = {}) {
  const fileName = (index) => `${stem}-${index}.${extensionByIndex[index] || "png"}`;
  return assetSet(fileName(indexes[0]), indexes.map(fileName));
}

function fallbackAsset() {
  return {
    primaryImageUrl: FALLBACK_IMAGE_URL,
    galleryUrls: [],
    fallbackImageUrl: FALLBACK_IMAGE_URL,
  };
}

function variantAssetSet(variants) {
  return {
    variants,
    fallbackImageUrl: FALLBACK_IMAGE_URL,
  };
}

export const WORKBOOK_IMAGE_ASSETS = {
  series_850: variantAssetSet({
    "Stainless Steel Channel Frame": numberedAssetSet("SERIES_850_PICTURE_URL_LOWER_CASE-STAINLESS-STEEL-CHANNEL-FRAME", [1, 2, 3, 4, 5, 6]),
    "Brushed Steel Gold": numberedAssetSet("SERIES_850_PICTURE_URL_LOWER_CASE-BRUSHED-STEEL-GOLD", [1, 4, 5, 6]),
    "Brushed Steel Bronze": numberedAssetSet("SERIES_850_PICTURE_URL_LOWER_CASE-BRUSHED-STEEL-BRONZE", [1, 3, 4, 5, 6]),
    "Brushed Steel Black": numberedAssetSet("SERIES_850_PICTURE_URL_LOWER_CASE-BRUSHED-STEEL-BLACK", [1, 3, 4, 5, 6]),
  }),
  series_850_ft: variantAssetSet({
    "SS Fixed Tilt Channel Frame": numberedAssetSet("SERIES_850FT_PICTURE_URL_LOWER_CASE-SS-FIXED-TILT-CHANNEL-FRAME", [1, 2, 4]),
    "Brushed Steel Gold": numberedAssetSet("SERIES_850FT_PICTURE_URL_LOWER_CASE-BRUSHED-STEEL-GOLD", [1, 2, 4]),
    "Brushed Steel Bronze": numberedAssetSet("SERIES_850FT_PICTURE_URL_LOWER_CASE-BRUSHED-STEEL-BRONZE", [1, 2, 4]),
    "Brushed Steel Black": numberedAssetSet("SERIES_850FT_PICTURE_URL_LOWER_CASE-BRUSHED-STEEL-BLACK", [1, 2, 4]),
  }),
  series_3200: variantAssetSet({
    "Brushed Stainless Frame": numberedAssetSet("SERIES_3200_BRUSHED_STAINLESS_FRAME", [1, 3, 4, 5, 6]),
    "Powder Coat Black Frame": numberedAssetSet("SERIES_3200_POWDER_COAT_BLACK_FRAME", [1, 3, 4, 5, 6]),
    "Powder Coat White Frame": numberedAssetSet("SERIES_3200_POWDER_COAT_WHITE_FRAME", [1, 2, 3, 4, 5, 6], { 6: "jpg" }),
  }),
  series_3200_ft: variantAssetSet({
    "Brushed S/S Fixed Tilt Frame": numberedAssetSet("SERIES_3200FT_BRUSHED_STAINLESS_STEEL_FIXED_TILT_FRAME", [1, 2, 3, 4]),
    "Brushed Stainless Steel Fixed Tilt Frame": numberedAssetSet("SERIES_3200FT_BRUSHED_STAINLESS_STEEL_FIXED_TILT_FRAME", [1, 2, 3, 4]),
    "Powder Coat Black S/S Fixed Tilt Frame": numberedAssetSet("SERIES_3200FT_POWDER_COAT_BLACK_STAINLESS_STEEL_FIXED_TILT_FRAME", [1, 2, 3, 4]),
    "Powder Coat Black Stainless Steel Fixed Tilt Frame": numberedAssetSet("SERIES_3200FT_POWDER_COAT_BLACK_STAINLESS_STEEL_FIXED_TILT_FRAME", [1, 2, 3, 4]),
    "Powder Coat White S/S Fixed Tilt Frame": numberedAssetSet("SERIES_3200FT_POWDER_COAT_WHITE_STAINLESS_STEEL_FIXED_TILT_FRAME", [1, 2, 3, 4]),
    "Powder Coat White Stainless Steel Fixed Tilt Frame": numberedAssetSet("SERIES_3200FT_POWDER_COAT_WHITE_STAINLESS_STEEL_FIXED_TILT_FRAME", [1, 2, 3, 4]),
  }),
  series_3300: assetSet("SERIES_3300-1.png", ["SERIES_3300-1.png"]),
  series_4100: fallbackAsset(),
  frameless_mirror: assetSet("FRAMELSS_MIRROR_CLEAR_MIRROR_5MM-1.png", ["FRAMELSS_MIRROR_CLEAR_MIRROR_5MM-1.png"]),
  cut_glass: variantAssetSet({
    "Clear Glass 5mm": numberedAssetSet("CUT_GLASS_CLEAR_GLASS_5MM", [1]),
    "Clear Glass 6mm": numberedAssetSet("CUT_GLASS_CLEAR_GLASS_6MM", [1]),
    "Tempered Glass 5mm": numberedAssetSet("CUT_GLASS_TEMPERED_GLASS_5MM", [1]),
    "Tempered Glass 6mm": numberedAssetSet("CUT_GLASS_TEMPERED_GLASS_6MM", [1]),
  }),
  convex_domes: variantAssetSet({
    "Indoor Acrylic Convex Mirror": numberedAssetSet("ANTIQUE_INDOOR_ACRYLIC_CONVEX_MIRROR", [1]),
    "Exterior Acrylic Convex Mirror": numberedAssetSet("ANTIQUE_EXTERIOR_ACRYLIC_CONVEX_MIRROR", [1]),
    "Steel Back Exterior Acrylic Convex Mirror": numberedAssetSet("ANTIQUE_STEEL_BACK_EXTERIOR_ACRYLIC_CONVEX_MIRROR", [1]),
    "Full Hemispheric Dome": numberedAssetSet("ANTIQUE_FULL_HEMISPHERIC_DOME", [1]),
    "Half Hemispheric Dome": numberedAssetSet("ANTIQUE_HALF_HEMISPHERIC_DOME", [1]),
    "Quarter Hemispheric Dome": numberedAssetSet("ANTIQUE_QUARTER_HEMISPHERIC_DOME", [1]),
  }),
  antique: fallbackAsset(),
  u_guard: variantAssetSet({
    "18ga Brushed Steel": numberedAssetSet("U_GUARDS_18GA_BRUSHED_STEEL", [1, 2, 3]),
    "16ga Brushed Steel": numberedAssetSet("U_GUARDS_16GA_BRUSHED_STEEL", [1, 2, 3]),
    "20ga Mirror Steel": numberedAssetSet("U_GUARDS_20GA_MIRROR_STEEL", [1, 2, 3]),
    "16ga Brushed Gold": numberedAssetSet("U_GUARDS_16GA_BRUSHED_GOLD", [1, 2, 3]),
    "16ga Brushed Bronze": numberedAssetSet("U_GUARDS_16GA_BRUSHED_BRONZE", [1, 2, 3]),
    "16ga Brushed Black": numberedAssetSet("U_GUARDS_16GA_BRUSHED_BLACK", [1, 2, 3]),
  }),
  corner_guard: variantAssetSet({
    "18ga Brushed Steel": numberedAssetSet("CORNER_GUARDS_18GA_BRUSHED_STEEL", [1, 2, 3]),
    "16ga Brushed Steel": numberedAssetSet("CORNER_GUARDS_16GA_BRUSHED_STEEL", [1, 2, 3]),
    "20ga Mirror Steel": numberedAssetSet("CORNER_GUARDS_20GA_MIRROR_STEEL", [1, 2, 3]),
    "16ga Brushed Gold": numberedAssetSet("CORNER_GUARDS_16GA_BRUSHED_GOLD", [1, 2, 3]),
    "16ga Brushed Bronze": numberedAssetSet("CORNER_GUARDS_16GA_BRUSHED_BRONZE", [1, 2, 3]),
    "16ga Brushed Black": numberedAssetSet("CORNER_GUARDS_16GA_BRUSHED_BLACK", [1, 2, 3]),
  }),
  j_mould: variantAssetSet({
    "18ga Brushed Steel": numberedAssetSet("J_MOULD_18GA_BRUSHED_STEEL", [1, 3]),
    "16ga Brushed Steel": numberedAssetSet("J_MOULD_16GA_BRUSHED_STEEL", [1, 3]),
    "20ga Mirror Steel": numberedAssetSet("J_MOULD_20GA_MIRROR_STEEL", [1, 3]),
    "16ga Brushed Gold": numberedAssetSet("J_MOULD_16GA_BRUSHED_GOLD", [1, 3]),
    "16ga Brushed Bronze": numberedAssetSet("J_MOULD_16GA_BRUSHED_BRONZE", [1, 3]),
    "16ga Brushed Black": numberedAssetSet("J_MOULD_16GA_BRUSHED_BLACK", [1, 3]),
  }),
  shelves: variantAssetSet({
    "Series 855_18GA Brushed Steel": numberedAssetSet("SHELVES_SERIES_855_18GA_BRUSHED_STEEL", [1, 3]),
    "Series 855_18GA Black Powder Coat Steel": numberedAssetSet("SHELVES_SERIES_855_18GA_BLACK_POWDER_COAT_STEEL", [3]),
    "Series 855_16GA Brushed Steel": numberedAssetSet("SHELVES_SERIES_855_16GA_BRUSHED_STEEL", [1, 3]),
    "Series 855_16GA Brushed Gunmetal": numberedAssetSet("SHELVES_SERIES_855_16GA_BRUSHED_GUNMETAL", [1, 3]),
    "Series 855_16GA Brushed Gold": numberedAssetSet("SHELVES_SERIES_855_16GA_BRUSHED_GOLD", [1, 3]),
    "Series 855_16GA Brushed Bronze": numberedAssetSet("SHELVES_SERIES_855_16GA_BRUSHED_BRONZE", [1, 3]),
    "Series 855_16GA Brushed Black": numberedAssetSet("SHELVES_SERIES_855_16GA_BRUSHED_BLACK", [1, 3]),
    "Series 3205_18GA Brushed Steel": numberedAssetSet("SHELVES_SERIES_3205_18GA_BRUSHED_STEEL", [1, 3]),
    "Series 3205_18GA Black Powder Coat Steel": numberedAssetSet("SHELVES_SERIES_3205_18GA_BLACK_POWDER_COAT_STEEL", [1, 3]),
    "Series 3205_18GA White Powder Coat": numberedAssetSet("SHELVES_SERIES_3205_18GA_WHITE_POWDER_COAT", [1, 3]),
    "Series 3205_16GA Brushed Steel": numberedAssetSet("SHELVES_SERIES_3205_16GA_BRUSHED_STEEL", [1, 3]),
    "Series 3205_16GA Brushed Gunmetal": numberedAssetSet("SHELVES_SERIES_3205_16GA_BRUSHED_GUNMETAL", [1, 3]),
    "Series 3205_16GA Brushed Gold": numberedAssetSet("SHELVES_SERIES_3205_16GA_BRUSHED_GOLD", [1, 3]),
    "Series 3205_16GA Brushed Bronze": numberedAssetSet("SHELVES_SERIES_3205_16GA_BRUSHED_BRONZE", [1, 3]),
    "Series 3205_16GA Brushed Black": numberedAssetSet("SHELVES_SERIES_3205_16GA_BRUSHED_BLACK", [1, 3]),
    "Series 3205_16GA Black Powder Coat Steel": numberedAssetSet("SHELVES_SERIES_3205_16GA_BLACK_POWDER_COAT_STEEL", [1, 3]),
    "Series 3205_16GA White Powder Coat": numberedAssetSet("SHELVES_SERIES_3205_16GA_WHITE_POWDER_COAT", [1, 3]),
  }),
  kick_plates: variantAssetSet({
    "18ga Brushed Steel": numberedAssetSet("KICK_PLATE_18GA_BRUSHED_STEEL", [1, 2, 3]),
    "16ga Brushed Steel": numberedAssetSet("KICK_PLATE_16GA_BRUSHED_STEEL", [1, 2, 3]),
    "16ga Brushed Gold": numberedAssetSet("KICK_PLATE_16GA_BRUSHED_GOLD", [1, 2, 3]),
    "16ga Brushed Bronze": numberedAssetSet("KICK_PLATE_16GA_BRUSHED_BRONZE", [1, 2, 3]),
    "16ga Brushed Black": numberedAssetSet("KICK_PLATE_16GA_BRUSHED_BLACK", [1, 2, 3]),
  }),
};

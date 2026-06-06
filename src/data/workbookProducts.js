export const IMAGE_BASE_URL = "https://saddlebrown-turkey-900185.hostingersite.com/Images";
export const DATASHEET_BASE_URL = "https://saddlebrown-turkey-900185.hostingersite.com/datasheet";
export const DATASHEET_FR_BASE_URL = "https://saddlebrown-turkey-900185.hostingersite.com/datasheet_fr";
export const FALLBACK_IMAGE_URL = "/assets/frameless-mirror-placeholder.svg";

export const CUSTOMER_GROUP_OPTIONS = ["House", "Guest", "Contractor", "Special", "Elite", "Platinum", "Richelieu"];
export const STANDARD_CUSTOMER_GROUP_OPTIONS = CUSTOMER_GROUP_OPTIONS.filter((group) => group !== "Richelieu");

export const GUARD_ITEMS = [
  { label: "18ga Brushed Steel", abbreviation: "18G", add: 0 },
  { label: "16ga Brushed Steel", abbreviation: "16G", add: 0.15 },
  { label: "20ga Mirror Steel", abbreviation: "20G-POL", add: 0.35 },
  { label: "16ga Brushed Gold", abbreviation: "16G-GO", add: 0.35 },
  { label: "16ga Brushed Bronze", abbreviation: "16G-BR", add: 0.35 },
  { label: "16ga Brushed Black", abbreviation: "16G-BL", add: 0.35 },
];

export const CUT_GLASS_ITEMS = [
  {
    type: "Clear",
    label: "Clear Glass 5mm",
    abbreviation: "CG5MM",
    psf: 14.5,
    edgeWorkPerInch: { "Clean Cut": 0, "Arrised Edge": 0.02, "Polished Edge": 0.155 },
  },
  {
    type: "Clear",
    label: "Clear Glass 6mm",
    abbreviation: "CG6MM",
    psf: 15.5,
    edgeWorkPerInch: { "Clean Cut": 0, "Arrised Edge": 0.02, "Polished Edge": 0.155 },
  },
  {
    type: "Tempered",
    label: "Tempered Glass 5mm",
    abbreviation: "TG5MM",
    psf: 25.5,
    edgeWorkPerInch: { "Clean Cut": 0, "Arrised Edge": 0.02, "Polished Edge": 0.335 },
  },
  {
    type: "Tempered",
    label: "Tempered Glass 6mm",
    abbreviation: "TG6MM",
    psf: 26.25,
    edgeWorkPerInch: { "Clean Cut": 0, "Arrised Edge": 0.02, "Polished Edge": 0.335 },
  },
];

export const SHELF_ITEMS = [
  { label: "Series 855", abbreviation: "855-M", psf: 77.75, finishAdd: 0 },
  { label: "Series 3205", abbreviation: "3205-M", psf: 101.075, finishAdd: 0.3 },
];

export const SHELF_FINISHES = [
  { label: "18GA Brushed Steel", abbreviation: "N4SS", add: 0 },
  { label: "18GA Black Powder Coat Steel", abbreviation: "PCBL", add: 0.4 },
  { label: "18GA White Powder Coat", abbreviation: "PCWH", add: 0.4 },
  { label: "16GA Brushed Gold", abbreviation: "PVGO", add: 0.5 },
  { label: "16GA Brushed Bronze", abbreviation: "PVBR", add: 0.5 },
  { label: "16GA Brushed Gunmetal", abbreviation: "PVGU", add: 0.5 },
];

export const KICK_PLATE_ITEMS = [
  { label: "18 Gauge #4 Brush", imageLabel: "18ga Brushed Steel", abbreviation: "18G", psf: 27.75, add: 0 },
  { label: "16 Gauge #4 Brush", imageLabel: "16ga Brushed Steel", abbreviation: "16G", psf: 31.21875, add: 0.125 },
  { label: "16 Gauge Brush Gold", imageLabel: "16ga Brushed Gold", abbreviation: "16G-GOLD", psf: 35.12109375, add: 0.265625 },
  { label: "16 Gauge Brush Bronze", imageLabel: "16ga Brushed Bronze", abbreviation: "16G-BRONZE", psf: 35.12109375, add: 0.265625 },
  { label: "16 Gauge Brush Black", imageLabel: "16ga Brushed Black", abbreviation: "16G-BLACK", psf: 35.12109375, add: 0.265625 },
];

export const KICK_PLATE_EXTRAS = [
  { label: "No Holes | No Tape", holesPerWidth: 0, tapePerInch: 0 },
  { label: "Regular Holes", holesPerWidth: 0.335, tapePerInch: 0 },
  { label: "Countersunk Holes", holesPerWidth: 0.665, tapePerInch: 0 },
  { label: "Double Sided Tape", holesPerWidth: 0, tapePerInch: 0.335 },
];

export const ANTIQUE_ITEMS = [
  { label: "9100", type: "A", abbreviation: "9100" },
  { label: "9104", type: "A", abbreviation: "9104" },
  { label: "9109", type: "A", abbreviation: "9109" },
  { label: "9113", type: "A", abbreviation: "9113" },
  { label: "9143", type: "A", abbreviation: "9143" },
  { label: "9103", type: "B", abbreviation: "9103" },
  { label: "9142 Gold", type: "B", abbreviation: "9142GO" },
  { label: "9142 Blue", type: "B", abbreviation: "9142BL" },
  { label: "9142 Red", type: "B", abbreviation: "9142RE" },
  { label: "9142 Green", type: "B", abbreviation: "9142GR" },
];

export const ANTIQUE_THICKNESS = {
  A: {
    "3MM": { psf: 62.25, edgeWorkPerInch: { No: 0, "Clean Cut": 0, "Arrised Edge": 0.02, "Polished Edge": 0.155 } },
    "5MM": { psf: 65.5, edgeWorkPerInch: { No: 0, "Clean Cut": 0, "Arrised Edge": 0.02, "Polished Edge": 0.155 } },
    "6MM": { psf: 69, edgeWorkPerInch: { No: 0, "Clean Cut": 0, "Arrised Edge": 0.02, "Polished Edge": 0.155 } },
  },
  B: {
    "3MM": { psf: 65.3625, edgeWorkPerInch: { No: 0, "Clean Cut": 0, "Arrised Edge": 0.02, "Polished Edge": 0.335 } },
    "5MM": { psf: 68.775, edgeWorkPerInch: { No: 0, "Clean Cut": 0, "Arrised Edge": 0.02, "Polished Edge": 0.335 } },
    "6MM": { psf: 72.45, edgeWorkPerInch: { No: 0, "Clean Cut": 0, "Arrised Edge": 0.02, "Polished Edge": 0.335 } },
  },
};

export const FIXED_PRICE_TABLES = {
  shelves: [
    { length: 16, depth: 5, price: 66.75 },
    { length: 18, depth: 5, price: 74 },
    { length: 24, depth: 5, price: 81.25 },
    { length: 36, depth: 5, price: 103.5 },
    { length: 48, depth: 5, price: 165.5 },
  ],
  kick_plates: [
    { width: 24, height: 6, price: 26.666666666666664 },
    { width: 32, height: 6, price: 35.55555555555556 },
    { width: 48, height: 6, price: 53.33333333333333 },
    { width: 24, height: 8, price: 35.55555555555556 },
    { width: 32, height: 8, price: 47.77777777777778 },
    { width: 48, height: 8, price: 71.11111111111111 },
    { width: 24, height: 10, price: 44.44444444444444 },
    { width: 32, height: 10, price: 59.44444444444444 },
    { width: 48, height: 10, price: 88.88888888888889 },
    { width: 24, height: 12, price: 53.33333333333333 },
    { width: 32, height: 12, price: 71.11111111111111 },
    { width: 48, height: 12, price: 106.66666666666666 },
    { width: 24, height: 16, price: 71.11111111111111 },
    { width: 32, height: 16, price: 95 },
    { width: 48, height: 16, price: 142.22222222222223 },
    { width: 24, height: 24, price: 106.66666666666666 },
    { width: 32, height: 24, price: 142.22222222222223 },
    { width: 48, height: 24, price: 213.33333333333331 },
    { width: 24, height: 32, price: 142.22222222222223 },
    { width: 32, height: 32, price: 189.44444444444443 },
    { width: 48, height: 32, price: 284.44444444444446 },
    { width: 24, height: 48, price: 213.33333333333331 },
    { width: 32, height: 48, price: 284.44444444444446 },
    { width: 48, height: 48, price: 426.1111111111111 },
    { width: 6, height: 24, price: 26.666666666666664 },
    { width: 6, height: 32, price: 35.55555555555556 },
    { width: 6, height: 48, price: 53.33333333333333 },
    { width: 8, height: 24, price: 35.55555555555556 },
    { width: 8, height: 32, price: 47.77777777777778 },
    { width: 8, height: 48, price: 71.11111111111111 },
    { width: 10, height: 24, price: 44.44444444444444 },
    { width: 10, height: 32, price: 59.44444444444444 },
    { width: 10, height: 48, price: 88.88888888888889 },
    { width: 12, height: 24, price: 53.33333333333333 },
    { width: 12, height: 32, price: 71.11111111111111 },
    { width: 12, height: 48, price: 106.66666666666666 },
    { width: 16, height: 24, price: 71.11111111111111 },
    { width: 16, height: 32, price: 95 },
    { width: 16, height: 48, price: 142.22222222222223 },
    { width: 24, height: 32, price: 142.22222222222223 },
    { width: 24, height: 48, price: 213.33333333333331 },
    { width: 32, height: 24, price: 142.22222222222223 },
    { width: 48, height: 32, price: 213.33333333333331 },
    { width: 32, height: 48, price: 284.44444444444446 },
  ],
  series_3300: [
    { width: 16, height: 24, price: 129 },
    { width: 16, height: 30, price: 166.75 },
    { width: 18, height: 24, price: 155.5 },
    { width: 18, height: 30, price: 191.25 },
    { width: 24, height: 30, price: 233.5 },
    { width: 24, height: 36, price: 311.25 },
    { width: 24, height: 16, price: 129 },
    { width: 30, height: 16, price: 166.75 },
    { width: 24, height: 18, price: 155.5 },
    { width: 30, height: 18, price: 191.25 },
    { width: 30, height: 24, price: 233.5 },
    { width: 36, height: 24, price: 311.25 },
  ],
};

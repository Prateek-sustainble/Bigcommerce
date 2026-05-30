import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "/Users/prateekrana/Downloads/FINAL EXCEL SM Fin V20.5 (1).xlsx";
const outputDir = path.resolve("outputs/security-mirror-inspection");

const productRanges = {
  "Series 850": ["A1:AI12", "I16:AI42", "D50:AI62"],
  "Series 850FT": ["A1:AI12", "I16:AI42", "D50:AI62"],
  "Series 3200": ["A1:AJ12", "I16:AJ42", "D50:AJ81"],
  "Series 3200FT": ["A1:AJ12", "I16:AJ42", "D50:AJ52"],
  "U Guards": ["A1:BY12", "I14:BY39"],
  "Corner Guards": ["A1:BV12", "I14:BV37"],
  "Frameless Mirror": ["A1:BT12", "E13:BT42"],
  "Cut Glass": ["A1:BL12", "E13:BL62"],
  "Series 3300": ["A1:AA12", "H13:AA27"],
  "Convex & Domes": ["A1:S12", "D10:S60", "D61:S133"],
  "Shelves": ["A1:BA12", "E13:BA34"],
  "Kick Plates": ["A1:BI12", "E13:BI58"],
  "Series 4100": ["A1:AE12", "H13:AE37"],
  "J Mould": ["A1:BG12", "E14:BG38"],
  Antique: ["A1:CG12", "E13:CG46"],
};

async function saveJson(name, data) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, name), JSON.stringify(data, null, 2), "utf8");
}

async function saveText(name, data) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, name), data, "utf8");
}

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const definedNames = await workbook.inspect({
  kind: "definedName",
  maxChars: 300000,
});
await saveText("06_defined_names_all.ndjson", definedNames.ndjson);

const common = await workbook.inspect({
  kind: "table",
  sheetId: "COMMON",
  range: "A1:N44",
  include: "values,formulas",
  tableMaxRows: 50,
  tableMaxCols: 14,
  tableMaxCellChars: 250,
  maxChars: 50000,
});
await saveText("07_common_table.ndjson", common.ndjson);

const dropdowns = await workbook.inspect({
  kind: "table",
  sheetId: "Dropdown menus",
  range: "A1:L40",
  include: "values,formulas",
  tableMaxRows: 45,
  tableMaxCols: 12,
  tableMaxCellChars: 250,
  maxChars: 50000,
});
await saveText("08_dropdowns_table.ndjson", dropdowns.ndjson);

const productExtracts = {};
for (const [sheetName, ranges] of Object.entries(productRanges)) {
  productExtracts[sheetName] = [];
  for (const range of ranges) {
    const table = await workbook.inspect({
      kind: "table",
      sheetId: sheetName,
      range,
      include: "values,formulas",
      tableMaxRows: 80,
      tableMaxCols: 90,
      tableMaxCellChars: 220,
      maxChars: 120000,
    });
    productExtracts[sheetName].push({ range, ndjson: table.ndjson });
    await saveText(`product_${sheetName.replaceAll(/[^A-Za-z0-9]+/g, "_")}_${range.replaceAll(/[^A-Za-z0-9]+/g, "_")}.ndjson`, table.ndjson);
  }
}
await saveJson("09_product_extract_index.json", productExtracts);

const skuSample = await workbook.inspect({
  kind: "table",
  sheetId: "SKUs",
  range: "A1:U40",
  include: "values,formulas",
  tableMaxRows: 45,
  tableMaxCols: 21,
  tableMaxCellChars: 180,
  maxChars: 70000,
});
await saveText("10_skus_sample.ndjson", skuSample.ndjson);

const skuFormulaAndErrors = await workbook.inspect({
  kind: "formula,match",
  sheetId: "SKUs",
  range: "A1:U10581",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 1000 },
  maxChars: 100000,
});
await saveText("11_skus_formula_errors.ndjson", skuFormulaAndErrors.ndjson);

console.log("Extracted pricing model details to", outputDir);

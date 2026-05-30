import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "/Users/prateekrana/Downloads/FINAL EXCEL SM Fin V20.5 (1).xlsx";
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("SKUs");
const values = sheet.getRange("A1:U10581").values;

const counts = new Map();
const customRows = [];
const badRows = [];
for (let i = 3; i < values.length; i += 1) {
  const row = values[i];
  const sku = row[0];
  const family = row[3];
  if (!sku && !family) continue;
  counts.set(family || "(blank)", (counts.get(family || "(blank)") || 0) + 1);
  if (typeof sku === "string" && sku.includes("CUSTOM")) customRows.push({ row: i + 1, sku, family });
  if (row.some((value) => typeof value === "string" && value.startsWith("#"))) badRows.push({ row: i + 1, sku, family, values: row });
}

console.log("family_counts");
for (const [family, count] of [...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
  console.log(`${family}: ${count}`);
}
console.log("custom_row_count", customRows.length);
console.log("first_custom_rows", JSON.stringify(customRows.slice(0, 20), null, 2));
console.log("bad_rows", JSON.stringify(badRows.slice(0, 20), null, 2));

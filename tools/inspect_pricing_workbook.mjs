import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "/Users/prateekrana/Downloads/FINAL EXCEL SM Fin V20.5 (1).xlsx";
const outputDir = path.resolve("outputs/security-mirror-inspection");

async function saveText(name, content) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, name), content, "utf8");
}

function printSection(title, body) {
  console.log(`\n## ${title}`);
  console.log(body);
}

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const sheetOverview = await workbook.inspect({
  kind: "sheet",
  include: "id,name",
  maxChars: 12000,
});
await saveText("01_sheet_overview.ndjson", sheetOverview.ndjson);
printSection("Sheets", sheetOverview.ndjson);

const compact = await workbook.inspect({
  kind: "workbook,sheet,table,definedName",
  maxChars: 24000,
  tableMaxRows: 8,
  tableMaxCols: 10,
  tableMaxCellChars: 100,
});
await saveText("02_compact_summary.ndjson", compact.ndjson);
printSection("Compact Summary", compact.ndjson.slice(0, 12000));

const formulaOverview = await workbook.inspect({
  kind: "formula",
  maxChars: 32000,
  options: { maxResults: 250 },
});
await saveText("03_formula_overview.ndjson", formulaOverview.ndjson);
printSection("Formula Overview", formulaOverview.ndjson.slice(0, 16000));

const categoryMatches = await workbook.inspect({
  kind: "match",
  searchTerm: "category|size|price|pricing|product|mirror|diameter|width|height|total|cost",
  options: { useRegex: true, matchCase: false, maxResults: 500 },
  maxChars: 50000,
});
await saveText("04_keyword_matches.ndjson", categoryMatches.ndjson);
printSection("Keyword Matches", categoryMatches.ndjson.slice(0, 18000));

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "formula error scan",
  maxChars: 12000,
});
await saveText("05_error_scan.ndjson", errorScan.ndjson);
printSection("Formula Error Scan", errorScan.ndjson);

import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "/Users/prateekrana/Downloads/FINAL EXCEL SM Fin V20.5 (1).xlsx";
const outputDir = path.resolve("outputs/security-mirror-inspection/formulas");
const sheets = [
  ["COMMON", "A1:N44"],
  ["Pictures view", "A1:P146"],
  ["Series 850", "A1:AI62"],
  ["Series 850FT", "A1:AI62"],
  ["Series 3200", "A1:AJ81"],
  ["Series 3200FT", "A1:AJ52"],
  ["U Guards", "A1:BY39"],
  ["Corner Guards", "A1:BV37"],
  ["Frameless Mirror", "A1:BT42"],
  ["Cut Glass", "A1:BL62"],
  ["Series 3300", "A1:AA27"],
  ["Convex & Domes", "A1:S133"],
  ["Shelves", "A1:BA34"],
  ["Kick Plates", "A1:BI58"],
  ["Series 4100", "A1:AE37"],
  ["J Mould", "A1:BG38"],
  ["Antique", "A1:CG46"],
];

async function saveText(name, data) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, name), data, "utf8");
}

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

for (const [sheetName, range] of sheets) {
  const formulas = await workbook.inspect({
    kind: "formula",
    sheetId: sheetName,
    range,
    options: { maxResults: 2000 },
    maxChars: 200000,
  });
  const fileName = `${sheetName.replaceAll(/[^A-Za-z0-9]+/g, "_")}.ndjson`;
  await saveText(fileName, formulas.ndjson);
  console.log(`${sheetName}: ${formulas.ndjson.split("\n").filter(Boolean).length} formula records`);
}

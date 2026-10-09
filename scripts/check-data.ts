import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { CatalogPayload } from "../src/types.ts";

const path = new URL("../public/data/festivals.json", import.meta.url);
const raw = await readFile(path, "utf8");
const catalog = JSON.parse(raw) as CatalogPayload;
const records = catalog.records;

assert.equal(catalog.meta.recordCount, 633, "A metainformação deve declarar 633 registros.");
assert.equal(records.length, 633, "O snapshot deve conter 633 registros.");
assert.equal(catalog.meta.columnCount, 19, "As 19 colunas da fonte devem estar representadas.");
assert.equal(catalog.meta.columns.length, 19, "A lista de colunas deve conter 19 itens.");
assert.equal(new Set(records.map((record) => record.id)).size, 633, "IDs técnicos devem ser únicos.");
assert.deepEqual(
  records.map((record) => Number(record.fields.sourceNumber)),
  Array.from({ length: 633 }, (_, index) => index + 1),
  "Os números da coluna B devem formar a sequência exata 1–633.",
);
assert.ok(records.every((record) => String(record.fields.name).length > 0), "Nenhum nome pode estar vazio.");
assert.ok(records.every((record) => Object.keys(record.fields).length === 19), "Cada registro deve conter os 19 campos.");

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortKeys(item)]),
    );
  }
  return value;
}

const dataHash = createHash("sha256")
  .update(JSON.stringify(sortKeys(records)))
  .digest("hex");
assert.equal(dataHash, catalog.meta.dataSha256, "O hash do conjunto de registros deve coincidir.");

console.log(`Integridade confirmada: ${records.length} registros, ${catalog.meta.columns.length} colunas, SHA-256 ${dataHash}.`);

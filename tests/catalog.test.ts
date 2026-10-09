import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { filterRecords, optionValues } from "../src/lib/search.ts";
import { validateRecord } from "../src/lib/validation.ts";
import type { CatalogPayload } from "../src/types.ts";

const catalog = JSON.parse(
  await readFile(new URL("../public/data/festivals.json", import.meta.url), "utf8"),
) as CatalogPayload;

test("a importação contém exatamente os 633 identificadores esperados", () => {
  assert.equal(catalog.records.length, 633);
  assert.equal(catalog.records.at(0)?.id, "festival-0001");
  assert.equal(catalog.records.at(-1)?.id, "festival-0633");
  assert.equal(new Set(catalog.records.map((record) => record.fields.sourceNumber)).size, 633);
});

test("a busca ignora acentos, caixa e espaços sem alterar o conteúdo", () => {
  const record = catalog.records.find((item) => String(item.fields.name).includes("Amazônia"));
  assert.ok(record);
  const result = filterRecords(catalog.records, "amazonia", {}, "source");
  assert.ok(result.some((item) => item.id === record.id));
});

test("os filtros usam somente valores realmente presentes", () => {
  const states = optionValues(catalog.records, "state");
  assert.ok(states.some((item) => item.value === "SP"));
  assert.equal(states.reduce((sum, item) => sum + item.count, 0), 633);
});

test("a validação rejeita número duplicado e respeita campos obrigatórios", () => {
  const draft = structuredClone(catalog.records[1]!);
  draft.fields.sourceNumber = catalog.records[0]!.fields.sourceNumber;
  draft.fields.name = "";
  const errors = validateRecord(draft, catalog.meta, catalog.records);
  assert.ok(errors.sourceNumber);
  assert.ok(errors.name);
});

test("duplicidades nominais da fonte não são removidas", () => {
  const r012 = catalog.records.filter((record) => String(record.fields.name).trim() === "Festival Cine Deburu");
  assert.equal(r012.length, 2);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schema = await readFile(
  new URL("../supabase/001_schema.sql", import.meta.url),
  "utf8",
);
const repository = await readFile(
  new URL("../src/lib/repository.ts", import.meta.url),
  "utf8",
);
const app = await readFile(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);

test("a política administrativa aceita somente a identidade GitHub proprietária", () => {
  assert.match(schema, /values \(337477512, 'circuitofestivais', true\)/);
  assert.match(schema, /join auth\.identities identities/);
  assert.match(schema, /identities\.provider = 'github'/);
  assert.match(schema, /admins\.github_user_id::text = identities\.provider_id/);
  assert.doesNotMatch(schema, /auth\.jwt\(\).*user_metadata/);
});

test("o retorno OAuth não disputa o fragmento usado pela rota administrativa", () => {
  assert.match(repository, /searchParams\.set\("oauth", "github"\)/);
  assert.doesNotMatch(repository, /pathname\}#admin/);
  assert.match(app, /URLSearchParams\(window\.location\.search\)\.get\("oauth"\) === "github"/);
});

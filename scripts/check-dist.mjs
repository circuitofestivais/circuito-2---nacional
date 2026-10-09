import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";

const root = new URL("../dist/", import.meta.url);
const required = ["index.html", "config.json", "catalogo.html", "data/festivals.json"];
for (const file of required) await access(new URL(file, root));

const html = await readFile(new URL("index.html", root), "utf8");
assert.match(html, /\/circuito-2---nacional\/assets\//, "Assets devem usar o subdiretório do GitHub Pages.");
const config = JSON.parse(await readFile(new URL("config.json", root), "utf8"));
assert.equal(
  config.supabaseUrl,
  "https://fqyickqjdeiwdoejwnwd.supabase.co",
  "A build deve apontar somente para o projeto Supabase autorizado.",
);
assert.equal(
  config.supabasePublishableKey,
  "sb_publishable_ePbb2nMjnoKp8c5Ye50Uvg_lwq8IADW",
  "A build deve usar somente a chave publicável esperada.",
);
assert.doesNotMatch(
  JSON.stringify(config),
  /sb_secret_|service_role/i,
  "A configuração pública nunca pode conter uma chave secreta.",
);

const snapshot = JSON.parse(await readFile(new URL("data/festivals.json", root), "utf8"));
assert.equal(snapshot.records.length, 633);
const staticCatalog = await readFile(new URL("catalogo.html", root), "utf8");
assert.equal((staticCatalog.match(/<article id="festival-/g) ?? []).length, 633, "O HTML sem JavaScript deve conter os 633 registros.");
const size = (await stat(new URL("data/festivals.json", root))).size;
console.log(`Build verificado: snapshot com 633 registros (${size.toLocaleString("pt-BR")} bytes) e caminhos compatíveis com Pages.`);

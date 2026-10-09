import { readFile, writeFile } from "node:fs/promises";

const source = new URL("../public/data/festivals.json", import.meta.url);
const target = new URL("../public/catalogo.html", import.meta.url);
const catalog = JSON.parse(await readFile(source, "utf8"));

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const urlPattern = /https?:\/\/[^\s)\]}>,;]+/gi;
function noteHtml(value) {
  const displayValue = String(value).replace(/[ \t]+(?=\r?\n|$)/g, "");
  let cursor = 0;
  let output = "";
  for (const match of displayValue.matchAll(urlPattern)) {
    const index = match.index ?? 0;
    output += escapeHtml(displayValue.slice(cursor, index));
    const url = match[0];
    output += `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`;
    cursor = index + url.length;
  }
  return output + escapeHtml(displayValue.slice(cursor));
}

const articles = catalog.records.map((record) => {
  const fields = catalog.meta.columns.map((column) => {
    const raw = column.key === "s"
      ? (record.sourceFlags.sMarked ? "Marcado na fonte" : null)
      : record.fields[column.key];
    const value = raw === null || raw === ""
      ? '<span class="empty">Informação não disponível</span>'
      : escapeHtml(String(raw).replace(/\s+/g, " ").trim());
    const note = record.notes[column.key]
      ? `<aside><strong>Nota da fonte:</strong> ${noteHtml(record.notes[column.key])}</aside>`
      : "";
    return `<div><dt>${escapeHtml(column.sourceHeader.trim() || column.label)}</dt><dd>${value}${note}</dd></div>`;
  }).join("");
  return `<article id="${escapeHtml(record.id)}"><header><span>${escapeHtml(record.fields.sourceNumber)}</span><h2>${escapeHtml(record.fields.name)}</h2></header><dl>${fields}</dl></article>`;
}).join("");

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Catálogo integral — Circuito de Festivais</title><meta name="description" content="633 festivais brasileiros, com os 19 campos preservados da planilha-fonte.">
<style>
:root{font-family:Arial,sans-serif;color:#181816;background:#f4f1e8}*{box-sizing:border-box}body{margin:0}a{color:#174fd1}a:focus-visible{outline:3px solid #2667ff;outline-offset:3px}.top{padding:2rem clamp(1rem,4vw,4rem);border-bottom:1px solid;background:#ddff53}.top a{color:inherit}.top h1{max-width:18ch;margin:.5rem 0;font:400 clamp(2.5rem,6vw,6rem)/.95 Georgia,serif}.top p{max-width:70ch;line-height:1.5}.count{font-weight:700}.list{padding:0 clamp(1rem,4vw,4rem) 4rem}article{padding:2rem 0;border-bottom:1px solid #8f8b80}article header{display:grid;grid-template-columns:4rem 1fr;gap:1rem}h2{max-width:38ch;margin:0;font:400 clamp(1.5rem,3vw,2.8rem)/1.05 Georgia,serif}dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:1.5rem 0 0;border-top:1px solid #cbc6b8}dl>div{padding:.8rem;border:solid #cbc6b8;border-width:0 1px 1px 0;overflow-wrap:anywhere}dt{font-size:.66rem;font-weight:700;letter-spacing:.05em}dd{margin:.35rem 0 0;white-space:pre-wrap;font:1rem/1.35 Georgia,serif}.empty{color:#6e6b62;font:italic .78rem Arial,sans-serif}aside{margin-top:.65rem;padding-top:.5rem;border-top:1px dashed #cbc6b8;font:.72rem/1.4 Arial,sans-serif;white-space:pre-wrap}@media(max-width:700px){dl{grid-template-columns:1fr 1fr}article header{grid-template-columns:2.5rem 1fr}}@media(max-width:440px){dl{grid-template-columns:1fr}}
</style></head><body><header class="top"><a href="./">← Voltar à plataforma interativa</a><h1>Catálogo integral de festivais</h1><p class="count">${catalog.records.length} registros · ${catalog.meta.columns.length} campos</p><p>Versão sem JavaScript e indexável, gerada automaticamente do mesmo snapshot verificado. Valores vazios continuam vazios; notas e links da fonte foram preservados.</p></header><main class="list">${articles}</main></body></html>`;

await writeFile(target, html, "utf8");
console.log(`Catálogo HTML gerado: ${catalog.records.length} registros.`);

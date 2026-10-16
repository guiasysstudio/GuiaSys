"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CANONICAL_SITE_URL,
  LEGACY_PROJECT_COLLECTION,
  STATIC_PATHS,
  buildSitemap,
  escapeXml
} = require("../sitemap.js");

test("mantém a coleção e as sete páginas fixas do sitemap legado", () => {
  assert.equal(LEGACY_PROJECT_COLLECTION, "projects");
  assert.equal(STATIC_PATHS.length, 7);
});

test("troca somente o host canônico e preserva projetos públicos", () => {
  const xml = buildSitemap(["projeto-exemplo", "projeto com espaco"]);
  assert.equal(CANONICAL_SITE_URL, "https://guiasys.com.br");
  assert.match(xml, /<loc>https:\/\/guiasys\.com\.br\/projetos\/projeto-exemplo\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/guiasys\.com\.br\/projetos\/projeto%20com%20espaco\/<\/loc>/);
  assert.doesNotMatch(xml, /guiasys\.online/);
});

test("gera XML seguro e mantém o contrato de cache no adaptador", async () => {
  assert.equal(escapeXml("<&>\"'"), "&lt;&amp;&gt;&quot;&apos;");
  const source = await require("node:fs/promises").readFile(
    require("node:path").join(__dirname, "..", "index.js"),
    "utf8"
  );
  assert.match(source, /public, max-age=900, s-maxage=3600/);
  assert.match(source, /exports\.sitemap\s*=/);
  for (const forbidden of ["projectDownload", "publicProjects", "adminProjectMedia", "adminProjectWrite"]) {
    assert.doesNotMatch(source, new RegExp(forbidden));
  }
});

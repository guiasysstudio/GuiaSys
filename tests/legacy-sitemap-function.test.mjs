import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8");

test("pacote isolado pode publicar somente a Function sitemap", async () => {
  const [config, entry, sitemap, packageJson] = await Promise.all([
    read("../firebase.sitemap-legacy.json").then(JSON.parse),
    read("../functions-legacy-sitemap/index.js"),
    read("../functions-legacy-sitemap/sitemap.js"),
    read("../functions-legacy-sitemap/package.json").then(JSON.parse)
  ]);

  assert.deepEqual(Object.keys(config), ["functions"]);
  assert.equal(config.functions.source, "functions-legacy-sitemap");
  assert.equal(config.functions.codebase, "default");
  assert.equal(config.functions.runtime, "nodejs22");
  assert.equal(packageJson.main, "index.js");
  assert.match(entry, /exports\.sitemap\s*=/);
  assert.match(sitemap, /LEGACY_PROJECT_COLLECTION = "projects"/);
  assert.match(sitemap, /CANONICAL_SITE_URL = "https:\/\/guiasys\.com\.br"/);

  for (const forbidden of ["projectDownload", "publicProjects", "adminProjectMedia", "adminProjectWrite", "studioProjects"]) {
    assert.doesNotMatch(`${entry}\n${sitemap}`, new RegExp(forbidden));
  }
});

test("comando planejado exige projeto, codebase e função explícitos", async () => {
  const plan = await read("../docs/C05G-LEGACY-SITEMAP.md");
  assert.match(plan, /--project guiasys/);
  assert.match(plan, /--config firebase\.sitemap-legacy\.json/);
  assert.match(plan, /--only functions:default:sitemap/);
  assert.doesNotMatch(plan, /--only functions\s*(?:`|\r?$)/m);
});

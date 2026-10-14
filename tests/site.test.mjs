import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("a página de projetos não contém cards hardcoded", async () => {
  const html = await readFile(new URL("../projetos/index.html", import.meta.url), "utf8");
  assert.match(html, /id="projects-grid"/);
  assert.doesNotMatch(html, /data-project-slug=/);
});

test("a Home mantém destaques totalmente condicionais", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="featured-projects"[^>]*hidden/);
  assert.match(html, /home-projects\.js/);
});

test("o CMS não contém seed e oferece CRUD e upload", async () => {
  const [html, js] = await Promise.all([
    readFile(new URL("../admin/index.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/admin.js", import.meta.url), "utf8")
  ]);
  assert.doesNotMatch(js, /PROJECT_SEED/);
  assert.match(html, /id="new-project"/);
  assert.match(html, /id="delete-project"/);
  assert.match(js, /adminProjectMedia/);
  assert.match(js, /httpsCallable/);
  assert.match(js, /onSnapshot/);
});

test("não há dependência de GitHub Pages", async () => {
  const config = JSON.parse(await readFile(new URL("../firebase.json", import.meta.url), "utf8"));
  assert.equal(config.hosting.public, ".");
  await assert.rejects(readFile(new URL("../CNAME", import.meta.url), "utf8"));
});

test("downloads aceitam múltiplas opções no CMS e sempre usam seletor público", async () => {
  const [adminHtml, adminJs, projectHtml, projectJs, functionsJs, rules] = await Promise.all([
    readFile(new URL("../admin/index.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/admin.js", import.meta.url), "utf8"),
    readFile(new URL("../projeto/index.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/project-page.js", import.meta.url), "utf8"),
    readFile(new URL("../functions/index.js", import.meta.url), "utf8"),
    readFile(new URL("../firestore.rules", import.meta.url), "utf8")
  ]);
  assert.match(adminHtml, /id="project-downloads"/);
  assert.match(adminHtml, /id="add-project-download"/);
  assert.doesNotMatch(adminHtml, /id="project-download-url"/);
  assert.match(adminJs, /downloads\.slice\(0, 12\)/);
  assert.match(projectHtml, /id="download-dialog"/);
  assert.match(projectJs, /showModal/);
  assert.match(projectJs, /getDownloads/);
  assert.match(functionsJs, /downloads: Array\.isArray\(data\.downloads\)/);
  assert.match(rules, /validDownloads\(request\.resource\.data\.downloads\)/);
});

test("banner e cabeçalho possuem adaptação para telas menores", async () => {
  const css = await readFile(new URL("../assets/css/style.css", import.meta.url), "utf8");
  assert.match(css, /\.dynamic-project-hero\{[^}]*background-size:contain/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /\.navbar\{height:68px;gap:8px\}/);
  assert.match(css, /\.dynamic-project-hero \.hero-actions\{display:grid/);
});

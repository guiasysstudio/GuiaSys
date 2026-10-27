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
  assert.match(js, /adminProjectWrite/);
  assert.match(js, /httpsCallable/);
  assert.match(js, /onSnapshot/);
  assert.doesNotMatch(js, /setDoc\(documentRef/);
});

test("o CMS envia somente dados serializáveis ao salvar um projeto", async () => {
  const js = await readFile(new URL("../assets/js/admin.js", import.meta.url), "utf8");
  const payload = js.match(/const payload = \{[\s\S]*?\r?\n    \};\r?\n\r?\n    await manageProjectWrite/)?.[0];

  assert.ok(payload, "payload enviado para adminProjectWrite não encontrado");
  assert.doesNotMatch(payload, /serverTimestamp\s*\(/);
  assert.match(js, /await manageProjectWrite\(\{ action: "save", slug, project: payload \}\)/);
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
  assert.match(functionsJs, /exports\.projectDownload/);
  assert.match(functionsJs, /\/api\/download\?project=/);
  assert.doesNotMatch(projectJs, /option\.target\s*=\s*"_blank"/);
  assert.match(functionsJs, /DOWNLOAD_CHUNK_BYTES/);
  assert.match(functionsJs, /request\.query\.chunk/);
  assert.match(projectJs, /downloadInChunks/);
  assert.match(projectJs, /content-range/);
});

test("planos e botões personalizados são opcionais e administráveis", async () => {
  const [adminHtml, adminJs, projectJs, writer] = await Promise.all([
    readFile(new URL("../admin/index.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/admin.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/project-page.js", import.meta.url), "utf8"),
    readFile(new URL("../functions/project-write.js", import.meta.url), "utf8")
  ]);
  assert.match(adminHtml, /project-plans-url/);
  assert.match(adminHtml, /project-custom-links/);
  assert.match(adminJs, /parseAndUploadCustomLinks/);
  assert.match(projectJs, /linkButton\("Planos"/);
  assert.match(projectJs, /project\.customLinks/);
  assert.match(writer, /normalizeCustomLinks/);
});

test("seletores de imagem do CMS permanecem visíveis e clicáveis", async () => {
  const [html, css] = await Promise.all([
    readFile(new URL("../admin/index.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/css/style.css", import.meta.url), "utf8")
  ]);
  for (const id of ["project-logo-file", "project-banner-file", "project-gallery-files"]) {
    assert.match(html, new RegExp(`id="${id}"[^>]*type="file"`));
    assert.doesNotMatch(html, new RegExp(`id="${id}"[^>]*disabled`));
  }
  assert.match(css, /input\[type="file"\]::file-selector-button/);
});

test("banner e cabeçalho possuem adaptação para telas menores", async () => {
  const css = await readFile(new URL("../assets/css/style.css", import.meta.url), "utf8");
  assert.match(css, /\.dynamic-project-hero\{[^}]*background-size:contain/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /\.navbar\{height:68px;gap:8px\}/);
  assert.match(css, /\.dynamic-project-hero \.hero-actions\{display:grid/);
});

test("catálogo público sempre consulta a versão atual dos projetos", async () => {
  const api = await readFile(new URL("../assets/js/public-project-api.js", import.meta.url), "utf8");
  assert.match(api, /cache:\s*"no-store"/);
  assert.match(api, /API_VERSION/);
  assert.doesNotMatch(api, /sessionStorage/);
  assert.doesNotMatch(api, /cached\?\.find/);
});

test("API pública impede cache de documentos e listas de projetos", async () => {
  const functionsJs = await readFile(new URL("../functions/index.js", import.meta.url), "utf8");
  assert.match(functionsJs, /response\.set\("Cache-Control", "no-store, max-age=0"\)/);
  assert.match(functionsJs, /response\.set\("CDN-Cache-Control", "no-store"\)/);
});

test("página pública possui seções para todos os campos editoriais", async () => {
  const [html, js] = await Promise.all([
    readFile(new URL("../projeto/index.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/project-page.js", import.meta.url), "utf8")
  ]);
  for (const id of ["project-short", "project-description", "project-features", "project-requirements", "project-faq"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(js, /project\.fullDescription/);
  assert.match(js, /project\.features/);
  assert.match(js, /project\.requirements/);
  assert.match(js, /project\.faq/);
});

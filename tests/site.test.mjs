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

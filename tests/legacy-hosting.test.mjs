import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loadJson = (relativePath) => readFile(
  new URL(relativePath, import.meta.url),
  "utf8"
).then(JSON.parse);

const LIVE_LEGACY_CSP = "default-src 'self'; script-src 'self' https://www.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.googleusercontent.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.cloudfunctions.net https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://viacep.com.br; frame-src 'self' https://*.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self' https://wa.me; upgrade-insecure-requests";

test("configuração legada fica isolada do Hosting da plataforma", async () => {
  const [legacy, aliases] = await Promise.all([
    loadJson("../firebase.legacy.json"),
    loadJson("../.firebaserc")
  ]);

  assert.deepEqual(Object.keys(legacy), ["hosting"]);
  assert.equal(legacy.hosting.target, "studio-legacy");
  assert.equal(legacy.hosting.public, ".");
  assert.equal(legacy.hosting.cleanUrls, true);
  assert.equal(legacy.hosting.trailingSlash, true);
  assert.deepEqual(aliases.targets.guiasys.hosting["studio-legacy"], ["guiasys"]);
  assert.equal(aliases.targets["guiasys-licensing"].hosting["studio-legacy"], undefined);
});

test("configuração legada preserva todos os rewrites da release ativa", async () => {
  const { hosting } = await loadJson("../firebase.legacy.json");
  assert.deepEqual(hosting.rewrites, [
    { source: "/sitemap.xml", function: { functionId: "sitemap", region: "southamerica-east1" } },
    { source: "/api/projects", function: { functionId: "publicProjects", region: "southamerica-east1" } },
    { source: "/api/download", function: { functionId: "projectDownload", region: "southamerica-east1" } },
    { source: "/projetos/**", destination: "/projeto/index.html" }
  ]);
});

test("configuração legada preserva os cabeçalhos da release ativa", async () => {
  const { hosting } = await loadJson("../firebase.legacy.json");
  const allHeaders = hosting.headers.find((entry) => entry.source === "**")?.headers || [];
  const assets = hosting.headers.find((entry) => entry.source.includes("@(js|css"))?.headers || [];
  const byName = Object.fromEntries(allHeaders.map(({ key, value }) => [key, value]));

  assert.deepEqual(byName, {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": LIVE_LEGACY_CSP
  });
  assert.deepEqual(assets, [
    { key: "Cache-Control", value: "public,max-age=31536000,immutable" }
  ]);
});

test("artefatos internos e configurações não entram no site legado", async () => {
  const { hosting } = await loadJson("../firebase.legacy.json");
  for (const path of [
    "firebase.json",
    "firebase.legacy.json",
    ".firebaserc",
    "firestore.rules",
    "firestore.indexes.json",
    "storage.rules",
    "functions/**",
    "docs/**",
    "tests/**",
    "scripts/**",
    "node_modules/**",
    ".git/**",
    "README.md",
    "package*.json",
    "firebase-debug.log"
  ]) assert.ok(hosting.ignore.includes(path), `ignore ausente: ${path}`);
});

test("assets públicos não mantêm compatibilidade com domínios removidos", async () => {
  const [main, firebaseConfig, home, robots] = await Promise.all([
    readFile(new URL("../assets/js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/firebase-config.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../robots.txt", import.meta.url), "utf8")
  ]);

  assert.doesNotMatch(firebaseConfig, /\.online/);
  assert.doesNotMatch(firebaseConfig, /legacyFirebaseConfig/);
  assert.doesNotMatch(main, /\.online/);
  assert.match(main, /https:\/\/licencas\.guiasys\.com\.br\//);
  assert.match(home, /rel="canonical" href="https:\/\/guiasys\.com\.br\/"/);
  assert.match(robots, /Sitemap: https:\/\/guiasys\.com\.br\/sitemap\.xml/);
});

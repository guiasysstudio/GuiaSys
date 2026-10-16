import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  platformFirebaseConfig,
  resolveFirebaseConfig,
  validateFirebaseConfig
} from "../assets/js/firebase-config.js";

const platformConfig = {
  apiKey: "public-web-key",
  authDomain: "guiasys-licensing.firebaseapp.com",
  projectId: "guiasys-licensing",
  appId: "1:1:web:test"
};
const foreignConfig = { ...platformConfig, projectId: "guiasys" };

const response = (config, ok = true) => ({
  ok,
  status: ok ? 200 : 404,
  json: async () => config
});

test("domínio novo aceita somente a configuração da plataforma", async () => {
  const resolved = await resolveFirebaseConfig({
    hostname: "guiasys.com.br",
    protocol: "https:",
    fetchConfig: async () => response(platformConfig)
  });
  assert.equal(resolved.projectId, "guiasys-licensing");

  await assert.rejects(
    resolveFirebaseConfig({
      hostname: "guiasys.com.br",
      protocol: "https:",
      fetchConfig: async () => response(foreignConfig)
    }),
    /firebase_project_mismatch_guiasys-licensing/
  );
});

test("Hosting de homologação exige o projeto da plataforma", async () => {
  for (const hostname of ["guiasys-studio-e1ea8.web.app", "guiasys-studio-e1ea8.firebaseapp.com", "guiasys-studio-e1ea8--c02.web.app"]) {
    const resolved = await resolveFirebaseConfig({
      hostname,
      protocol: "https:",
      fetchConfig: async () => response(platformConfig)
    });
    assert.equal(resolved.projectId, "guiasys-licensing");
  }
});

test("www usa exclusivamente o projeto da plataforma", async () => {
  const resolved = await resolveFirebaseConfig({
    hostname: "www.guiasys.com.br",
    protocol: "https:",
    fetchConfig: async () => response(platformConfig)
  });
  assert.equal(resolved.projectId, "guiasys-licensing");
});

test("configuração incompleta é recusada", () => {
  assert.throws(() => validateFirebaseConfig({ projectId: "guiasys-licensing" }), /firebase_config_invalid_apiKey/);
});

test("desenvolvimento local usa somente o Firebase da plataforma", async () => {
  const resolved = await resolveFirebaseConfig({
    hostname: "localhost",
    protocol: "http:",
    fetchConfig: async () => response({}, false)
  });
  assert.equal(resolved, platformFirebaseConfig);
  assert.equal(resolved.projectId, "guiasys-licensing");
});

test("código e regras usam somente namespaces Studio", async () => {
  const [schema, rules, functions] = await Promise.all([
    readFile(new URL("../assets/js/firebase-schema.js", import.meta.url), "utf8"),
    readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    readFile(new URL("../functions/index.js", import.meta.url), "utf8")
  ]);
  for (const namespace of ["studioAdmins", "studioContactMessages", "studioProfiles", "studioProjects"]) {
    assert.match(`${schema}\n${rules}`, new RegExp(namespace));
  }
  assert.match(functions, /STUDIO_MEDIA_ROOT = "studio-projects"/);
  assert.doesNotMatch(functions, /getFirestore\(\)\.collection\("projects"\)/);
  assert.doesNotMatch(functions, /getFirestore\(\)\.doc\(`admins\//);
});

test("target Hosting exige escolha explícita entre legado e plataforma", async () => {
  const [firebase, aliases] = await Promise.all([
    readFile(new URL("../firebase.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../.firebaserc", import.meta.url), "utf8").then(JSON.parse)
  ]);
  assert.equal(firebase.hosting.target, "studio");
  assert.equal(aliases.projects.default, undefined);
  assert.equal(aliases.projects.legacy, "guiasys");
  assert.equal(aliases.projects.platform, "guiasys-licensing");
  assert.deepEqual(aliases.targets["guiasys-licensing"].hosting.studio, ["guiasys-studio-e1ea8"]);
});

test("App Check usa Fraud Defense somente na plataforma e mantém enforcement fora do deploy", async () => {
  const [firebaseApp, firebase] = await Promise.all([
    readFile(new URL("../assets/js/firebase-app.js", import.meta.url), "utf8"),
    readFile(new URL("../firebase.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  assert.match(firebaseApp, /initializeAppCheck/);
  assert.match(firebaseApp, /ReCaptchaEnterpriseProvider/);
  assert.match(firebaseApp, /firebaseConfig\.projectId === PLATFORM_PROJECT_ID/);
  assert.match(firebaseApp, /isTokenAutoRefreshEnabled:\s*true/);
  assert.doesNotMatch(firebaseApp, /FIREBASE_APPCHECK_DEBUG_TOKEN/);

  const csp = firebase.hosting.headers
    .flatMap((entry) => entry.headers || [])
    .find((header) => header.key === "Content-Security-Policy")?.value || "";
  for (const source of [
    "https://www.google.com/recaptcha/",
    "https://recaptcha.google.com/recaptcha/"
  ]) assert.match(csp, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("domínios definitivos usam somente com.br", async () => {
  const [main, home, robots, projectPage, about, account, notFound] = await Promise.all([
    readFile(new URL("../assets/js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../robots.txt", import.meta.url), "utf8"),
    readFile(new URL("../assets/js/project-page.js", import.meta.url), "utf8"),
    readFile(new URL("../sobre/index.html", import.meta.url), "utf8"),
    readFile(new URL("../conta/index.html", import.meta.url), "utf8"),
    readFile(new URL("../404.html", import.meta.url), "utf8")
  ]);

  assert.match(home, /rel="canonical" href="https:\/\/guiasys\.com\.br\/"/);
  assert.match(home, /property="og:url" content="https:\/\/guiasys\.com\.br\/"/);
  assert.match(robots, /Sitemap: https:\/\/guiasys\.com\.br\/sitemap\.xml/);
  assert.match(projectPage, /https:\/\/guiasys\.com\.br\/projetos\//);
  assert.match(main, /https:\/\/licencas\.guiasys\.com\.br\//);
  assert.doesNotMatch(main, /\.online/);
  for (const page of [about, account, notFound]) assert.match(page, /data-licensing-link/);
});

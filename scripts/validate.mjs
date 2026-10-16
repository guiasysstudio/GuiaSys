import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];
const required = [
  ".firebaserc", "firebase.json", "firebase.legacy.json", "firebase.sitemap-legacy.json",
  "functions-legacy-sitemap/index.js", "functions-legacy-sitemap/sitemap.js",
  "functions-legacy-sitemap/package.json", "firestore.rules", "storage.rules",
  "firestore.indexes.json", "projeto/index.html", "assets/js/admin.js",
  "assets/js/project-page.js", "assets/js/public-projects.js"
];

for (const file of required) {
  try { await stat(path.join(root, file)); } catch { failures.push(`Arquivo obrigatório ausente: ${file}`); }
}

const firebase = JSON.parse(await readFile(path.join(root, "firebase.json"), "utf8"));
if (firebase.hosting?.public !== ".") failures.push("Hosting deve publicar a raiz estática.");
if (firebase.hosting?.target !== "studio") failures.push("Hosting deve usar o target studio.");
if (!firebase.hosting?.ignore?.includes("docs/**")) failures.push("Documentação interna não pode entrar no Hosting.");
if (!firebase.hosting?.rewrites?.some((item) => item.source === "/projetos/**")) failures.push("Rewrite dinâmico de projetos ausente.");
if (!firebase.hosting?.rewrites?.some((item) => item.source === "/sitemap.xml" && item.function)) failures.push("Sitemap dinâmico ausente.");
if (firebase.functions?.codebase !== "studio") failures.push("Functions deve usar a codebase studio.");

const legacyFirebase = JSON.parse(await readFile(path.join(root, "firebase.legacy.json"), "utf8"));
if (legacyFirebase.hosting?.target !== "studio-legacy") failures.push("Hosting legado deve usar target exclusivo.");
if (Object.keys(legacyFirebase).some((key) => key !== "hosting")) failures.push("Configuração legada deve conter somente Hosting.");
if (!legacyFirebase.hosting?.rewrites?.some((item) => item.source === "/api/download" && item.function?.functionId === "projectDownload")) {
  failures.push("Rewrite legado de download ausente.");
}

const legacySitemapConfig = JSON.parse(await readFile(path.join(root, "firebase.sitemap-legacy.json"), "utf8"));
if (Object.keys(legacySitemapConfig).some((key) => key !== "functions")) failures.push("Configuração do sitemap legado deve conter somente Functions.");
if (legacySitemapConfig.functions?.source !== "functions-legacy-sitemap") failures.push("Source isolado do sitemap legado ausente.");
if (legacySitemapConfig.functions?.codebase !== "default") failures.push("Sitemap legado deve manter a codebase default.");

const [legacySitemapEntry, legacySitemapSource] = await Promise.all([
  readFile(path.join(root, "functions-legacy-sitemap/index.js"), "utf8"),
  readFile(path.join(root, "functions-legacy-sitemap/sitemap.js"), "utf8")
]);
if (!/exports\.sitemap\s*=/.test(legacySitemapEntry)) failures.push("Export isolado sitemap ausente.");
for (const forbidden of ["projectDownload", "publicProjects", "adminProjectMedia", "adminProjectWrite", "studioProjects"]) {
  if (`${legacySitemapEntry}\n${legacySitemapSource}`.includes(forbidden)) failures.push(`Function indevida no pacote de sitemap: ${forbidden}`);
}
if (!legacySitemapSource.includes('LEGACY_PROJECT_COLLECTION = "projects"')) failures.push("Coleção projects não foi preservada no sitemap legado.");
if (!legacySitemapSource.includes('CANONICAL_SITE_URL = "https://guiasys.com.br"')) failures.push("Canonical .com.br ausente no sitemap legado.");

const admin = await readFile(path.join(root, "assets/js/admin.js"), "utf8");
for (const forbidden of ["PROJECT_SEED", "ensureProjects"]) {
  if (admin.toLowerCase().includes(forbidden.toLowerCase())) failures.push(`Seed/hardcode encontrado no ADM: ${forbidden}`);
}

const schema = await readFile(path.join(root, "assets/js/firebase-schema.js"), "utf8");
for (const namespace of ["studioAdmins", "studioContactMessages", "studioProfiles", "studioProjects"]) {
  if (!schema.includes(`"${namespace}"`)) failures.push(`Namespace Firebase ausente: ${namespace}`);
}

const firebaseApp = await readFile(path.join(root, "assets/js/firebase-app.js"), "utf8");
for (const marker of ["initializeAppCheck", "ReCaptchaEnterpriseProvider", "isTokenAutoRefreshEnabled: true"]) {
  if (!firebaseApp.includes(marker)) failures.push(`Integração App Check ausente: ${marker}`);
}
if (firebaseApp.includes("FIREBASE_APPCHECK_DEBUG_TOKEN")) failures.push("Token de depuração App Check não pode ser usado no build publicado.");

const csp = firebase.hosting?.headers
  ?.flatMap((entry) => entry.headers || [])
  .find((header) => header.key === "Content-Security-Policy")?.value || "";
for (const source of ["https://www.google.com/recaptcha/", "https://recaptcha.google.com/recaptcha/"]) {
  if (!csp.includes(source)) failures.push(`Origem CSP do App Check ausente: ${source}`);
}

const [main, robots, projectPage] = await Promise.all([
  readFile(path.join(root, "assets/js/main.js"), "utf8"),
  readFile(path.join(root, "robots.txt"), "utf8"),
  readFile(path.join(root, "assets/js/project-page.js"), "utf8")
]);
if (!main.includes("licencas.guiasys.com.br")) failures.push("Link definitivo do Licensing ausente.");
if (main.includes(".online")) failures.push("Referência a domínio removido ainda presente no frontend.");
if (!robots.includes("https://guiasys.com.br/sitemap.xml")) failures.push("Robots não usa o sitemap canônico .com.br.");
if (!projectPage.includes("https://guiasys.com.br/projetos/")) failures.push("Projeto público não usa canonical .com.br.");

const rules = await readFile(path.join(root, "firestore.rules"), "utf8");
if (!rules.includes("match /studioProjects/{projectId}")) failures.push("Regras de studioProjects ausentes.");
if (!rules.includes("match /{document=**}")) failures.push("Regra final default-deny ausente.");

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "node_modules", ".firebase"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
};

for (const file of await walk(root)) {
  if (!/\.(html|js|md|json|txt|rules)$/.test(file)) continue;
  const content = await readFile(file, "utf8");
  if (content.includes("github.io")) failures.push(`Referência a GitHub Pages: ${path.relative(root, file)}`);
  if (/\.html$/.test(file) && /rel="canonical"[^>]+guiasys\.online/.test(content)) {
    failures.push(`Canonical legado encontrado: ${path.relative(root, file)}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Estrutura Firebase/CMS validada.");

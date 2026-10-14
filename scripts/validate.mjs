import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];
const required = [
  ".firebaserc", "firebase.json", "firestore.rules", "storage.rules",
  "firestore.indexes.json", "projeto/index.html", "assets/js/admin.js",
  "assets/js/project-page.js", "assets/js/public-projects.js"
];

for (const file of required) {
  try { await stat(path.join(root, file)); } catch { failures.push(`Arquivo obrigatório ausente: ${file}`); }
}

const firebase = JSON.parse(await readFile(path.join(root, "firebase.json"), "utf8"));
if (firebase.hosting?.public !== ".") failures.push("Hosting deve publicar a raiz estática.");
if (!firebase.hosting?.rewrites?.some((item) => item.source === "/projetos/**")) failures.push("Rewrite dinâmico de projetos ausente.");
if (!firebase.hosting?.rewrites?.some((item) => item.source === "/sitemap.xml" && item.function)) failures.push("Sitemap dinâmico ausente.");

const admin = await readFile(path.join(root, "assets/js/admin.js"), "utf8");
for (const forbidden of ["PROJECT_SEED", "ensureProjects"]) {
  if (admin.toLowerCase().includes(forbidden.toLowerCase())) failures.push(`Seed/hardcode encontrado no ADM: ${forbidden}`);
}

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
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Estrutura Firebase/CMS validada.");

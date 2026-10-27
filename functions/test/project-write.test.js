"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ProjectValidationError, normalizeStudioProject } = require("../project-write");

const minimal = (overrides = {}) => ({
  name: "Projeto mínimo",
  shortDescription: "",
  fullDescription: "",
  categories: ["Site"],
  platforms: [],
  status: "",
  version: "",
  requirements: [],
  features: [],
  faq: [],
  downloads: [],
  supportUrl: "",
  licenseUrl: "",
  plansUrl: "",
  customLinks: [],
  order: 0,
  visible: false,
  featured: false,
  logoUrl: "",
  logoPath: "",
  bannerUrl: "",
  bannerPath: "",
  gallery: [],
  seoTitle: "",
  seoDescription: "",
  ...overrides
});

test("aceita projeto novo com todos os campos opcionais vazios", () => {
  const project = normalizeStudioProject("projeto-minimo", minimal());
  assert.equal(project.slug, "projeto-minimo");
  assert.equal(project.name, "Projeto mínimo");
  assert.deepEqual(project.features, []);
  assert.deepEqual(project.gallery, []);
  assert.equal(project.downloadUrl, "");
});

test("preenche campos opcionais ausentes com valores seguros", () => {
  const project = normalizeStudioProject("projeto-sem-opcionais", {
    name: "Projeto sem opcionais",
    categories: ["Site"],
    order: 0,
    visible: false,
    featured: false
  });

  assert.deepEqual(project.platforms, []);
  assert.deepEqual(project.requirements, []);
  assert.deepEqual(project.features, []);
  assert.deepEqual(project.faq, []);
  assert.deepEqual(project.downloads, []);
  assert.deepEqual(project.customLinks, []);
  assert.deepEqual(project.gallery, []);
  assert.equal(project.shortDescription, "");
  assert.equal(project.plansUrl, "");
});

test("preserva todos os campos preenchidos de projeto existente", () => {
  const project = normalizeStudioProject("guia-play", minimal({
    name: "Guia Play",
    shortDescription: "Descrição curta",
    fullDescription: "Descrição completa",
    categories: ["Programa", "Aplicativo"],
    platforms: ["Windows"],
    status: "Disponível",
    version: "1.0.2",
    requirements: ["Windows 10"],
    features: ["Múltiplas telas"],
    faq: [{ question: "Como instalar?", answer: "Use o instalador." }],
    downloads: [{ label: "Windows x64", url: "https://example.com/app.exe" }],
    supportUrl: "https://guiasys.com.br/contato/",
    licenseUrl: "https://licencas.guiasys.com.br/",
    plansUrl: "https://licencas.guiasys.com.br/programas/guia-play",
    customLinks: [{ label: "Documentação", url: "https://guiasys.com.br/docs/", iconUrl: "https://example.com/icon.png", iconPath: "studio-projects/guia-play/link-icons/icon.png" }],
    order: 1,
    visible: true,
    featured: true,
    logoUrl: "https://example.com/logo.png",
    logoPath: "studio-projects/guia-play/logo/logo.png",
    bannerUrl: "https://example.com/banner.png",
    bannerPath: "studio-projects/guia-play/banner/banner.png",
    gallery: [{
      url: "https://example.com/tela.png",
      path: "studio-projects/guia-play/gallery/tela.png",
      alt: "Tela do Guia Play"
    }],
    seoTitle: "Guia Play",
    seoDescription: "Player multimídia da GuiaSys."
  }));

  assert.equal(project.visible, true);
  assert.equal(project.downloadUrl, "https://example.com/app.exe");
  assert.equal(project.features[0], "Múltiplas telas");
  assert.equal(project.gallery[0].path, "studio-projects/guia-play/gallery/tela.png");
  assert.equal(project.seoDescription, "Player multimídia da GuiaSys.");
  assert.equal(project.plansUrl, "https://licencas.guiasys.com.br/programas/guia-play");
  assert.equal(project.customLinks[0].label, "Documentação");
});

test("aceita até cinquenta recursos e requisitos sem descartar conteúdo", () => {
  const items = Array.from({ length: 50 }, (_, index) => `Item ${index + 1}`);
  const project = normalizeStudioProject("projeto-completo", minimal({ features: items, requirements: items }));
  assert.equal(project.features.length, 50);
  assert.equal(project.requirements.length, 50);
});

test("retorna mensagens específicas para dados inválidos", () => {
  assert.throws(() => normalizeStudioProject("slug inválido", minimal()), ProjectValidationError);
  assert.throws(() => normalizeStudioProject("projeto", minimal({ name: "" })), /Nome é obrigatório/);
  assert.throws(() => normalizeStudioProject("projeto", minimal({ seoTitle: "x".repeat(71) })), /Título SEO/);
  assert.throws(() => normalizeStudioProject("projeto", minimal({
    categories: ["Programa"],
    downloads: [{ label: "Windows", url: "http://example.com/app.exe" }]
  })), /https:\/\//);
  assert.throws(() => normalizeStudioProject("projeto", minimal({ features: undefined, gallery: {} })), /Galeria precisa ser uma lista/);
  assert.throws(() => normalizeStudioProject("projeto", { name: "Sem opções", categories: ["Site"] }), /opções de publicação/);
});

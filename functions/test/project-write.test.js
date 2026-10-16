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
});

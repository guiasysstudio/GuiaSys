"use strict";

const PROJECT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORIES = new Set(["Programa", "Aplicativo", "Site"]);

class ProjectValidationError extends Error {}

const fail = (message) => {
  throw new ProjectValidationError(message);
};

const text = (value, label, maxLength, { required = false } = {}) => {
  if (value == null) value = "";
  if (typeof value !== "string") fail(`${label} precisa ser um texto.`);
  const normalized = value.trim();
  if (required && !normalized) fail(`${label} é obrigatório.`);
  if (normalized.length > maxLength) fail(`${label} deve ter no máximo ${maxLength} caracteres.`);
  return normalized;
};

const httpsUrl = (value, label, maxLength) => {
  const normalized = text(value, label, maxLength);
  if (!normalized) return "";
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    fail(`${label} não é um endereço válido.`);
  }
  if (parsed.protocol !== "https:") fail(`${label} deve começar com https://.`);
  return parsed.href;
};

const stringList = (value, label, maxItems, maxItemLength) => {
  if (value == null) return [];
  if (!Array.isArray(value)) fail(`${label} precisa ser uma lista.`);
  const normalized = value.map((item, index) => text(item, `${label} — item ${index + 1}`, maxItemLength, { required: true }));
  if (normalized.length > maxItems) fail(`${label} aceita no máximo ${maxItems} itens.`);
  return normalized;
};

const mediaPath = (value, slug, group, label) => {
  const normalized = text(value, label, 500);
  if (!normalized) return "";
  const prefix = `studio-projects/${slug}/${group}/`;
  const name = normalized.slice(prefix.length);
  if (!normalized.startsWith(prefix) || !name || name.includes("/")) fail(`${label} não pertence a este projeto.`);
  return normalized;
};

const normalizeDownloads = (value) => {
  if (value == null) return [];
  if (!Array.isArray(value)) fail("Downloads precisa ser uma lista.");
  if (value.length > 12) fail("Downloads aceita no máximo 12 itens.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) fail(`Download ${index + 1} é inválido.`);
    return {
      label: text(item.label, `Nome do download ${index + 1}`, 80, { required: true }),
      url: httpsUrl(item.url, `Link do download ${index + 1}`, 1000)
    };
  });
};

const normalizeFaq = (value) => {
  if (value == null) return [];
  if (!Array.isArray(value)) fail("FAQ precisa ser uma lista.");
  if (value.length > 30) fail("FAQ aceita no máximo 30 itens.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) fail(`FAQ ${index + 1} é inválido.`);
    return {
      question: text(item.question, `Pergunta ${index + 1}`, 240, { required: true }),
      answer: text(item.answer, `Resposta ${index + 1}`, 1200, { required: true })
    };
  });
};

const normalizeGallery = (value, slug) => {
  if (value == null) return [];
  if (!Array.isArray(value)) fail("Galeria precisa ser uma lista.");
  if (value.length > 12) fail("Galeria aceita no máximo 12 imagens.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) fail(`Imagem ${index + 1} da galeria é inválida.`);
    return {
      url: httpsUrl(item.url, `URL da imagem ${index + 1}`, 2000),
      path: mediaPath(item.path, slug, "gallery", `Caminho da imagem ${index + 1}`),
      alt: text(item.alt, `Texto alternativo da imagem ${index + 1}`, 240)
    };
  });
};

const normalizeStudioProject = (slugValue, value) => {
  const slug = text(slugValue, "Slug", 80, { required: true });
  if (!PROJECT_SLUG.test(slug)) fail("Use um slug com letras minúsculas, números e hífens.");
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Os dados do projeto são inválidos.");

  const categories = stringList(value.categories, "Categorias", 3, 20);
  if (!categories.length || categories.some((category) => !CATEGORIES.has(category))) {
    fail("Selecione de 1 a 3 categorias válidas.");
  }
  const downloads = normalizeDownloads(value.downloads);
  if (downloads.length && !categories.some((category) => category === "Programa" || category === "Aplicativo")) {
    fail("Downloads só podem ser cadastrados para Programa ou Aplicativo.");
  }

  const order = Number(value.order ?? 0);
  if (!Number.isInteger(order) || order < 0 || order > 9999) fail("Ordem de exibição deve ser um número entre 0 e 9999.");
  if (typeof value.visible !== "boolean" || typeof value.featured !== "boolean") fail("As opções de publicação são inválidas.");

  return {
    slug,
    name: text(value.name, "Nome", 120, { required: true }),
    shortDescription: text(value.shortDescription, "Descrição curta", 280),
    fullDescription: text(value.fullDescription, "Descrição completa", 12000),
    categories,
    platforms: stringList(value.platforms, "Plataformas", 10, 80),
    status: text(value.status, "Status", 80),
    version: text(value.version, "Versão", 40),
    requirements: stringList(value.requirements, "Requisitos", 50, 500),
    features: stringList(value.features, "Recursos", 50, 500),
    faq: normalizeFaq(value.faq),
    downloads,
    downloadUrl: downloads[0]?.url || "",
    supportUrl: httpsUrl(value.supportUrl, "Link de suporte", 1000),
    licenseUrl: httpsUrl(value.licenseUrl, "Link de licença", 1000),
    order,
    visible: value.visible,
    featured: value.featured,
    logoUrl: httpsUrl(value.logoUrl, "URL do logo", 2000),
    logoPath: mediaPath(value.logoPath, slug, "logo", "Caminho do logo"),
    bannerUrl: httpsUrl(value.bannerUrl, "URL do banner", 2000),
    bannerPath: mediaPath(value.bannerPath, slug, "banner", "Caminho do banner"),
    gallery: normalizeGallery(value.gallery, slug),
    seoTitle: text(value.seoTitle, "Título SEO", 70),
    seoDescription: text(value.seoDescription, "Descrição SEO", 180)
  };
};

module.exports = { PROJECT_SLUG, ProjectValidationError, normalizeStudioProject };

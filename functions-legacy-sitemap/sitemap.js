"use strict";

const CANONICAL_SITE_URL = "https://guiasys.com.br";
const LEGACY_PROJECT_COLLECTION = "projects";
const STATIC_PATHS = [
  "",
  "projetos/",
  "sobre/",
  "contato/",
  "faq/",
  "novidades/",
  "solicitar-projeto/"
];

const escapeXml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const buildSitemap = (projectIds) => {
  const urls = [
    ...STATIC_PATHS.map((path) => `${CANONICAL_SITE_URL}/${path}`),
    ...projectIds.map((id) => `${CANONICAL_SITE_URL}/projetos/${encodeURIComponent(id)}/`)
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
    "</urlset>"
  ].join("\n");
};

module.exports = {
  CANONICAL_SITE_URL,
  LEGACY_PROJECT_COLLECTION,
  STATIC_PATHS,
  buildSitemap,
  escapeXml
};

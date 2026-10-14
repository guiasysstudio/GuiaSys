const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const escapeXml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const STATIC_PATHS = [
  "", "projetos/", "sobre/", "contato/", "faq/", "novidades/", "solicitar-projeto/"
];

exports.sitemap = onRequest(
  { region: "southamerica-east1", cors: false, invoker: "public" },
  async (_request, response) => {
    try {
      const snapshot = await getFirestore()
        .collection("projects")
        .where("visible", "==", true)
        .get();

      const urls = [
        ...STATIC_PATHS.map((path) => `https://www.guiasys.online/${path}`),
        ...snapshot.docs.map((doc) => `https://www.guiasys.online/projetos/${encodeURIComponent(doc.id)}/`)
      ];

      const body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
        "</urlset>"
      ].join("\n");

      response.set("Content-Type", "application/xml; charset=utf-8");
      response.set("Cache-Control", "public, max-age=900, s-maxage=3600");
      response.status(200).send(body);
    } catch (error) {
      console.error("sitemap_failed", error);
      response.status(503).type("text/plain").send("Sitemap temporariamente indisponível.");
    }
  }
);

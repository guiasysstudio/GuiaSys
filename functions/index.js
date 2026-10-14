const { randomUUID } = require("node:crypto");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

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

const PROJECT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_TYPE = /^image\/(jpeg|png|webp|gif|svg\+xml)$/;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MEDIA_GROUPS = new Set(["logo", "banner", "gallery"]);
const STORAGE_BUCKET = "guiasys.firebasestorage.app";

const requireAdmin = async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Faça login para continuar.");
  const admin = await getFirestore().doc(`admins/${request.auth.uid}`).get();
  if (!admin.exists || admin.data()?.enabled !== true) {
    throw new HttpsError("permission-denied", "Acesso administrativo necessário.");
  }
};

const safeFileName = (value) => String(value || "imagem")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9._-]/g, "-")
  .slice(-180);

exports.adminProjectMedia = onCall(
  { region: "southamerica-east1", cors: ["https://www.guiasys.online", "https://guiasys.web.app", /^https:\/\/guiasys--[a-z0-9-]+\.web\.app$/] },
  async (request) => {
    await requireAdmin(request);
    const { action, slug } = request.data || {};
    if (!PROJECT_SLUG.test(String(slug || ""))) throw new HttpsError("invalid-argument", "Slug inválido.");

    const bucket = getStorage().bucket(STORAGE_BUCKET);
    if (action === "delete") {
      const path = String(request.data?.path || "");
      if (!path.startsWith(`projects/${slug}/`)) throw new HttpsError("invalid-argument", "Caminho inválido.");
      await bucket.file(path).delete({ ignoreNotFound: true });
      return { ok: true };
    }

    if (action !== "upload") throw new HttpsError("invalid-argument", "Ação inválida.");
    const group = String(request.data?.group || "");
    const contentType = String(request.data?.contentType || "");
    if (!MEDIA_GROUPS.has(group) || !IMAGE_TYPE.test(contentType)) {
      throw new HttpsError("invalid-argument", "Arquivo de imagem inválido.");
    }

    const bytes = Buffer.from(String(request.data?.base64 || ""), "base64");
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
      throw new HttpsError("invalid-argument", "A imagem deve ter no máximo 10 MB.");
    }

    const token = randomUUID();
    const path = `projects/${slug}/${group}/${Date.now()}-${randomUUID()}-${safeFileName(request.data?.name)}`;
    await bucket.file(path).save(bytes, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl: "public,max-age=3600,must-revalidate",
        metadata: { firebaseStorageDownloadTokens: token, projectSlug: slug }
      }
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    return { url, path };
  }
);

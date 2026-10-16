const { randomUUID } = require("node:crypto");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { PROJECT_SLUG, ProjectValidationError, normalizeStudioProject } = require("./project-write");

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

const STUDIO_COLLECTIONS = Object.freeze({
  admins: "studioAdmins",
  projects: "studioProjects"
});
const STUDIO_MEDIA_ROOT = "studio-projects";
const CANONICAL_SITE_URL = "https://guiasys.com.br";
const STUDIO_ADMIN_CORS = [
  "https://guiasys.com.br",
  "https://www.guiasys.com.br",
  "https://guiasys-studio-e1ea8.web.app",
  "https://guiasys-studio-e1ea8.firebaseapp.com",
  /^https:\/\/guiasys--[a-z0-9-]+\.web\.app$/,
  /^https:\/\/guiasys-studio-e1ea8--[a-z0-9-]+\.web\.app$/
];

const publicProject = (document) => {
  const data = document.data();
  return {
    slug: document.id,
    name: String(data.name || ""),
    shortDescription: String(data.shortDescription || ""),
    fullDescription: String(data.fullDescription || ""),
    categories: Array.isArray(data.categories) ? data.categories : [],
    platforms: Array.isArray(data.platforms) ? data.platforms : [],
    status: String(data.status || ""),
    version: String(data.version || ""),
    requirements: Array.isArray(data.requirements) ? data.requirements : [],
    features: Array.isArray(data.features) ? data.features : [],
    faq: Array.isArray(data.faq) ? data.faq.map((item) => ({
      question: String(item?.question || ""), answer: String(item?.answer || "")
    })) : [],
    downloads: Array.isArray(data.downloads) ? data.downloads.slice(0, 12).map((item) => ({
      label: String(item?.label || ""), url: String(item?.url || "")
    })).filter((item) => item.label && item.url) : [],
    downloadUrl: String(data.downloadUrl || ""),
    supportUrl: String(data.supportUrl || ""),
    licenseUrl: String(data.licenseUrl || ""),
    order: Number.isFinite(data.order) ? data.order : 9999,
    featured: data.featured === true,
    logoUrl: String(data.logoUrl || ""),
    bannerUrl: String(data.bannerUrl || ""),
    gallery: Array.isArray(data.gallery) ? data.gallery.map((item) => ({
      url: String(item?.url || ""), alt: String(item?.alt || "")
    })) : [],
    seoTitle: String(data.seoTitle || ""),
    seoDescription: String(data.seoDescription || "")
  };
};

exports.publicProjects = onRequest(
  { region: "southamerica-east1", cors: false, invoker: "public" },
  async (request, response) => {
    if (request.method !== "GET") {
      response.set("Allow", "GET").status(405).json({ error: "method_not_allowed" });
      return;
    }

    try {
      const slug = String(request.query.slug || "");
      response.set("Cache-Control", "no-store, max-age=0");
      response.set("CDN-Cache-Control", "no-store");

      if (slug) {
        if (!PROJECT_SLUG.test(slug)) {
          response.status(400).json({ error: "invalid_slug" });
          return;
        }
        const document = await getFirestore().doc(`${STUDIO_COLLECTIONS.projects}/${slug}`).get();
        if (!document.exists || document.data()?.visible !== true) {
          response.status(404).json({ error: "project_not_found" });
          return;
        }
        response.status(200).json({ project: publicProject(document) });
        return;
      }

      const snapshot = await getFirestore().collection(STUDIO_COLLECTIONS.projects).where("visible", "==", true).get();
      const projects = snapshot.docs.map(publicProject).sort((a, b) =>
        a.order - b.order || a.name.localeCompare(b.name, "pt-BR")
      );
      response.status(200).json({ projects });
    } catch (error) {
      console.error("public_projects_failed", error);
      response.status(503).json({ error: "projects_unavailable" });
    }
  }
);

exports.sitemap = onRequest(
  { region: "southamerica-east1", cors: false, invoker: "public" },
  async (_request, response) => {
    try {
      const snapshot = await getFirestore()
        .collection(STUDIO_COLLECTIONS.projects)
        .where("visible", "==", true)
        .get();

      const urls = [
        ...STATIC_PATHS.map((path) => `${CANONICAL_SITE_URL}/${path}`),
        ...snapshot.docs.map((doc) => `${CANONICAL_SITE_URL}/projetos/${encodeURIComponent(doc.id)}/`)
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

const IMAGE_TYPE = /^image\/(jpeg|png|webp|gif|svg\+xml)$/;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MEDIA_GROUPS = new Set(["logo", "banner", "gallery"]);
const requireAdmin = async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Faça login para continuar.");
  const admin = await getFirestore().doc(`${STUDIO_COLLECTIONS.admins}/${request.auth.uid}`).get();
  if (!admin.exists || admin.data()?.enabled !== true) {
    throw new HttpsError("permission-denied", "Acesso administrativo necessário.");
  }
};

const safeFileName = (value) => String(value || "imagem")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9._-]/g, "-")
  .slice(-180);

exports.adminProjectWrite = onCall(
  { region: "southamerica-east1", cors: STUDIO_ADMIN_CORS },
  async (request) => {
    await requireAdmin(request);
    const { action, slug: rawSlug } = request.data || {};
    const slug = String(rawSlug || "").trim();
    if (!PROJECT_SLUG.test(slug)) throw new HttpsError("invalid-argument", "Slug inválido.");

    const documentRef = getFirestore().doc(`${STUDIO_COLLECTIONS.projects}/${slug}`);
    if (action === "delete") {
      await documentRef.delete();
      return { ok: true, slug };
    }

    if (action === "visibility") {
      if (typeof request.data?.visible !== "boolean") {
        throw new HttpsError("invalid-argument", "A visibilidade informada é inválida.");
      }
      const snapshot = await documentRef.get();
      if (!snapshot.exists) throw new HttpsError("not-found", "Projeto não encontrado.");
      await documentRef.update({ visible: request.data.visible, updatedAt: FieldValue.serverTimestamp() });
      return { ok: true, slug, visible: request.data.visible };
    }

    if (action !== "save") throw new HttpsError("invalid-argument", "Ação administrativa inválida.");
    let project;
    try {
      project = normalizeStudioProject(slug, request.data?.project);
    } catch (error) {
      if (error instanceof ProjectValidationError) throw new HttpsError("invalid-argument", error.message);
      throw error;
    }

    const snapshot = await documentRef.get();
    const timestamp = FieldValue.serverTimestamp();
    await documentRef.set({
      ...project,
      createdAt: snapshot.exists && snapshot.get("createdAt") ? snapshot.get("createdAt") : timestamp,
      updatedAt: timestamp
    }, { merge: false });
    return { ok: true, slug, created: !snapshot.exists };
  }
);

exports.adminProjectMedia = onCall(
  {
    region: "southamerica-east1",
    cors: STUDIO_ADMIN_CORS
  },
  async (request) => {
    await requireAdmin(request);
    const { action, slug } = request.data || {};
    if (!PROJECT_SLUG.test(String(slug || ""))) throw new HttpsError("invalid-argument", "Slug inválido.");

    const bucket = getStorage().bucket();
    if (action === "delete") {
      const path = String(request.data?.path || "");
      if (!path.startsWith(`${STUDIO_MEDIA_ROOT}/${slug}/`)) throw new HttpsError("invalid-argument", "Caminho inválido.");
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
    const path = `${STUDIO_MEDIA_ROOT}/${slug}/${group}/${Date.now()}-${randomUUID()}-${safeFileName(request.data?.name)}`;
    await bucket.file(path).save(bytes, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl: "public,max-age=3600,must-revalidate",
        metadata: { firebaseStorageDownloadTokens: token, projectSlug: slug }
      }
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    return { url, path };
  }
);

import { loadPublicProject } from "./public-project-api.js?v=20261016-1";

const byId = (id) => document.getElementById(id);
const loading = byId("project-loading");
const errorState = byId("project-error");
const content = byId("project-content");
const downloadDialog = byId("download-dialog");
const downloadDialogOptions = byId("download-dialog-options");
const downloadDialogTitle = byId("download-dialog-title");
let lastDownloadTrigger = null;

const slug = decodeURIComponent(location.pathname.split("/").filter(Boolean)[1] || "");
const initials = (name) => String(name || "GuiaSys").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
const safeUrl = (value) => {
  try {
    const input = String(value || "").trim();
    if (!input) return "";
    const url = new URL(input, location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
};
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const linkButton = (label, url, primary = false) => {
  const link = node("a", `btn ${primary ? "btn-primary" : "btn-secondary"}`, label);
  link.href = url;
  if (/^https?:/.test(url)) { link.target = "_blank"; link.rel = "noopener"; }
  return link;
};
const showSection = (id, show) => { byId(id).hidden = !show; };

const getDownloads = (project) => {
  const softwareProject = (project.categories || []).some((category) => category === "Programa" || category === "Aplicativo");
  if (!softwareProject) return [];
  const downloads = Array.isArray(project.downloads) ? project.downloads : [];
  const valid = downloads.map((item) => ({ label: String(item?.label || "").trim(), url: safeUrl(item?.url) }))
    .filter((item) => item.label && item.url).slice(0, 12);
  if (valid.length || !safeUrl(project.downloadUrl)) return valid;
  const platform = Array.isArray(project.platforms) ? project.platforms[0] : "";
  return [{
    label: [platform || "Download principal", project.version ? `versão ${project.version}` : ""].filter(Boolean).join(" — "),
    url: safeUrl(project.downloadUrl)
  }];
};

const closeDownloadDialog = () => {
  if (typeof downloadDialog.close === "function" && downloadDialog.open) downloadDialog.close();
  else downloadDialog.removeAttribute("open");
  lastDownloadTrigger?.focus();
};

const openDownloadDialog = (project, downloads, trigger) => {
  lastDownloadTrigger = trigger;
  downloadDialogTitle.textContent = `Baixar ${project.name}`;
  downloadDialogOptions.replaceChildren();
  downloads.forEach((download) => {
    const option = node("a", "download-option", download.label);
    option.href = download.url;
    option.target = "_blank";
    option.rel = "noopener";
    option.setAttribute("aria-label", `Baixar ${download.label}`);
    option.addEventListener("click", () => closeDownloadDialog());
    downloadDialogOptions.append(option);
  });
  if (typeof downloadDialog.showModal === "function") downloadDialog.showModal();
  else downloadDialog.setAttribute("open", "");
};

byId("download-dialog-close").addEventListener("click", closeDownloadDialog);
downloadDialog.addEventListener("click", (event) => { if (event.target === downloadDialog) closeDownloadDialog(); });

const setSeo = (project) => {
  const title = project.seoTitle || `${project.name} — GuiaSys Studio`;
  const description = project.seoDescription || project.shortDescription || `Conheça ${project.name}, projeto da GuiaSys Studio.`;
  const canonical = `https://guiasys.com.br/projetos/${encodeURIComponent(project.slug)}/`;
  document.title = title;
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('link[rel="canonical"]').href = canonical;
  document.querySelector('meta[property="og:title"]').content = title;
  document.querySelector('meta[property="og:description"]').content = description;
  document.querySelector('meta[property="og:url"]').content = canonical;
  const image = project.bannerUrl || project.logoUrl;
  if (image) document.querySelector('meta[property="og:image"]').content = image;
};

const render = (project) => {
  setSeo(project);
  byId("project-name").textContent = project.name;
  byId("project-short").textContent = project.shortDescription || "";
  byId("project-categories").textContent = (project.categories || []).join(" • ");

  const logoWrap = byId("project-logo-wrap");
  if (project.logoUrl) {
    const image = node("img"); image.src = project.logoUrl; image.alt = `Logo ${project.name}`; logoWrap.append(image);
  } else logoWrap.textContent = initials(project.name);

  if (project.bannerUrl) {
    byId("project-hero").style.backgroundImage = `url("${project.bannerUrl.replaceAll('"', '%22')}")`;
    byId("project-hero").classList.add("has-banner");
  }

  const facts = byId("project-facts");
  [...(project.platforms || []), project.status, project.version ? `Versão ${project.version}` : ""]
    .filter(Boolean).forEach((item) => facts.append(node("span", "", item)));

  const actions = byId("project-actions");
  const downloads = getDownloads(project);
  const support = safeUrl(project.supportUrl);
  const license = safeUrl(project.licenseUrl);
  if (downloads.length) {
    const downloadButton = node("button", "btn btn-primary", "Baixar");
    downloadButton.type = "button";
    downloadButton.addEventListener("click", () => openDownloadDialog(project, downloads, downloadButton));
    actions.append(downloadButton);
  }
  if (support) actions.append(linkButton("Suporte", support));
  actions.append(linkButton("Entrar em contato", `/contato/?projeto=${encodeURIComponent(project.slug)}`));

  const description = String(project.fullDescription || "").trim();
  if (description) {
    description.split(/\n{2,}/).filter(Boolean).forEach((paragraph) => byId("project-description").append(node("p", "", paragraph)));
    const summary = byId("project-summary");
    if (project.status) { summary.append(node("strong", "", "Status"), node("p", "", project.status)); }
    if (project.version) { summary.append(node("strong", "", "Versão"), node("p", "", project.version)); }
    if (license) { const label = node("strong", "", "Licenciamento"); const anchor = node("a", "text-link", "Consultar licença →"); anchor.href = license; anchor.target = "_blank"; anchor.rel = "noopener"; summary.append(label, anchor); }
    showSection("project-about-section", true);
  }

  const features = (project.features || []).filter(Boolean);
  if (features.length) {
    features.forEach((feature) => {
      const item = node("article", "feature"); item.append(node("strong", "", feature)); byId("project-features").append(item);
    });
    showSection("project-features-section", true);
  }

  const requirements = (project.requirements || []).filter(Boolean);
  if (requirements.length) {
    requirements.forEach((requirement) => byId("project-requirements").append(node("li", "", requirement)));
    showSection("project-requirements-section", true);
  }

  const gallery = (project.gallery || []).filter((item) => safeUrl(item?.url));
  if (gallery.length) {
    gallery.forEach((item, index) => {
      const image = node("img"); image.src = item.url; image.alt = item.alt || `Captura ${index + 1} de ${project.name}`; image.loading = "lazy"; byId("project-gallery").append(image);
    });
    showSection("project-gallery-section", true);
  }

  const faq = (project.faq || []).filter((item) => item?.question && item?.answer);
  if (faq.length) {
    faq.forEach((item) => { const details = node("details"); details.append(node("summary", "", item.question), node("p", "", item.answer)); byId("project-faq").append(details); });
    showSection("project-faq-section", true);
  }

  const contactActions = byId("project-contact-actions");
  contactActions.append(linkButton("Enviar mensagem", `/contato/?projeto=${encodeURIComponent(project.slug)}`, true));
  if (support) contactActions.append(linkButton("Abrir suporte", support));

  const nav = byId("project-subnav").querySelector(".container");
  [
    ["project-about-section", "Visão geral"], ["project-features-section", "Recursos"],
    ["project-requirements-section", "Requisitos"], ["project-gallery-section", "Galeria"],
    ["project-faq-section", "FAQ"], ["project-contact-section", "Contato"]
  ].filter(([id]) => !byId(id).hidden).forEach(([id, label]) => { const anchor = node("a", "", label); anchor.href = `#${id}`; nav.append(anchor); });

  loading.hidden = true;
  content.hidden = false;
};

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  loading.hidden = true; errorState.hidden = false;
} else {
  try {
    render(await loadPublicProject(slug));
  } catch (error) {
    if (error?.code && !String(error.code).endsWith("permission-denied")) console.error("project_load_failed", error);
    document.querySelector('meta[name="robots"]').content = "noindex,nofollow";
    loading.hidden = true;
    errorState.hidden = false;
  }
}

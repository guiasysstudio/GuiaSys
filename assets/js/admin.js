import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  deleteObject, getDownloadURL, ref, uploadBytes
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";
import { auth, db, storage } from "./firebase-app.js?v=20261014";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const loading = $("#admin-loading");
const denied = $("#admin-denied");
const app = $("#admin-app");
const projectsGrid = $("#projects-grid-admin");
const projectsFeedback = $("#projects-feedback");
const messagesBody = $("#messages-body");
const messagesFeedback = $("#messages-feedback");
const messageDetail = $("#message-detail");
const form = $("#project-form");

const fields = {
  originalSlug: $("#project-original-slug"), name: $("#project-name"), slug: $("#project-slug"),
  shortDescription: $("#project-short-description"), fullDescription: $("#project-full-description"),
  platforms: $("#project-platforms"), status: $("#project-status"), version: $("#project-version"),
  order: $("#project-order"), visible: $("#project-visible"), featured: $("#project-featured"),
  features: $("#project-features"), requirements: $("#project-requirements"), faq: $("#project-faq"),
  downloadUrl: $("#project-download-url"), supportUrl: $("#project-support-url"), licenseUrl: $("#project-license-url"),
  logoFile: $("#project-logo-file"), bannerFile: $("#project-banner-file"), galleryFiles: $("#project-gallery-files"),
  logoRemove: $("#project-logo-remove"), bannerRemove: $("#project-banner-remove"),
  seoTitle: $("#project-seo-title"), seoDescription: $("#project-seo-description")
};

let projects = [];
let messages = [];
let currentProject = null;
let currentGallery = [];
let messageFilter = "new";
let stopMessages = null;

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const slugify = (value) => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const lines = (value, max = 10) => String(value || "").split("\n").map((item) => item.trim()).filter(Boolean).slice(0, max);
const commaList = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 10);
const initials = (name) => String(name || "GuiaSys").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
const formatDate = (timestamp) => timestamp?.toDate ? timestamp.toDate().toLocaleString("pt-BR") : "—";
const showFormFeedback = (text, type = "") => { const target = $("#project-form-feedback"); target.textContent = text; target.className = `auth-message ${type}`; };

const legacyCategories = (project) => {
  if (Array.isArray(project.categories)) return project.categories;
  return ["Programa", "Aplicativo", "Site"].filter((item) => String(project.category || "").includes(item));
};

const isAdmin = async (uid) => {
  const snapshot = await getDoc(doc(db, "admins", uid));
  return snapshot.exists() && snapshot.data().enabled === true;
};

const setTabs = () => {
  $$("[data-admin-tab]").forEach((tab) => tab.addEventListener("click", () => {
    $$("[data-admin-tab]").forEach((item) => item.classList.toggle("active", item === tab));
    $$("[data-admin-panel]").forEach((panel) => { panel.hidden = panel.dataset.adminPanel !== tab.dataset.adminTab; });
  }));
};

const renderMessages = () => {
  const needle = normalize($("#message-search").value);
  const filtered = messages.filter((item) => {
    if (messageFilter !== "all" && item.status !== messageFilter) return false;
    return !needle || normalize(`${item.name} ${item.email} ${item.projectName} ${item.message}`).includes(needle);
  });

  $("#message-count").textContent = String(messages.length);
  $("#new-count").textContent = String(messages.filter((item) => item.status === "new").length);
  messagesFeedback.hidden = filtered.length > 0;
  messagesFeedback.textContent = messages.length ? "Nenhuma mensagem corresponde aos filtros." : "Nenhuma mensagem recebida.";
  messagesBody.replaceChildren();

  filtered.forEach((item) => {
    const row = document.createElement("tr");
    row.dataset.messageId = item.id;
    if (item.status === "new") row.classList.add("is-new");
    row.innerHTML = `<td><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.email)}</small></td><td>${escapeHtml(item.projectName || "Contato geral")}</td><td><span class="admin-status ${escapeHtml(item.status || "new")}">${escapeHtml(item.status || "new")}</span></td><td>${escapeHtml(formatDate(item.createdAt))}</td><td><button class="btn btn-secondary admin-small" type="button">Abrir</button></td>`;
    row.querySelector("button").addEventListener("click", () => openMessage(item));
    messagesBody.append(row);
  });
};

const openMessage = async (item) => {
  messageDetail.innerHTML = `<div class="admin-detail-head"><div><span class="badge">${escapeHtml(item.projectName || "Contato geral")}</span><h3>${escapeHtml(item.name)}</h3><p><a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a> • ${escapeHtml(formatDate(item.createdAt))}</p></div><button class="icon-btn" type="button" data-close-detail aria-label="Fechar">×</button></div><div class="admin-message-text">${escapeHtml(item.message).replaceAll("\n", "<br>")}</div><div class="admin-detail-actions"><button class="btn btn-secondary" type="button" data-status="read">Marcar como lida</button><button class="btn btn-secondary" type="button" data-status="archived">Arquivar</button><button class="btn admin-danger" type="button" data-delete-message>Excluir</button></div>`;
  messageDetail.hidden = false;
  messageDetail.querySelector("[data-close-detail]").addEventListener("click", () => { messageDetail.hidden = true; });
  messageDetail.querySelectorAll("[data-status]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    await updateDoc(doc(db, "contactMessages", item.id), { status: button.dataset.status, updatedAt: serverTimestamp() });
    messageDetail.hidden = true;
  }));
  messageDetail.querySelector("[data-delete-message]").addEventListener("click", async () => {
    if (!window.confirm("Excluir esta mensagem permanentemente?")) return;
    await deleteDoc(doc(db, "contactMessages", item.id));
    messageDetail.hidden = true;
  });
  if (item.status === "new") await updateDoc(doc(db, "contactMessages", item.id), { status: "read", updatedAt: serverTimestamp() });
};

const watchMessages = () => {
  stopMessages?.();
  stopMessages = onSnapshot(query(collection(db, "contactMessages"), orderBy("createdAt", "desc")), (snapshot) => {
    messages = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderMessages();
  }, (error) => {
    console.error("messages_watch_failed", error);
    messagesFeedback.hidden = false;
    messagesFeedback.textContent = "Não foi possível acompanhar as mensagens em tempo real.";
  });
};

const renderProjects = () => {
  $("#visible-count").textContent = String(projects.filter((project) => project.visible).length);
  projectsFeedback.hidden = projects.length > 0;
  projectsFeedback.textContent = "Nenhum projeto cadastrado. Use “Novo projeto” para começar.";
  projectsGrid.replaceChildren();

  projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "admin-project-card";
    const logo = project.logoUrl ? `<img src="${escapeHtml(project.logoUrl)}" alt="">` : `<span>${escapeHtml(initials(project.name))}</span>`;
    card.innerHTML = `<div class="admin-project-card-head"><div class="admin-project-thumb">${logo}</div><div><strong>${escapeHtml(project.name || project.id)}</strong><code>${escapeHtml(project.id)}</code></div><span class="admin-status ${project.visible ? "new" : "archived"}">${project.visible ? "Público" : "Oculto"}</span></div><p>${escapeHtml(project.shortDescription || "Sem descrição curta.")}</p><div class="project-meta-row">${legacyCategories(project).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}${project.featured ? "<span>Home</span>" : ""}</div><div class="admin-project-card-actions"><button class="btn btn-secondary" type="button" data-edit>Editar</button><button class="btn btn-secondary" type="button" data-toggle>${project.visible ? "Ocultar" : "Publicar"}</button>${project.visible ? `<a class="text-link" href="/projetos/${encodeURIComponent(project.id)}/" target="_blank" rel="noopener">Abrir →</a>` : ""}</div>`;
    card.querySelector("[data-edit]").addEventListener("click", () => openProject(project));
    card.querySelector("[data-toggle]").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      try { await updateDoc(doc(db, "projects", project.id), { visible: !project.visible, updatedAt: serverTimestamp() }); await loadProjects(); }
      catch (error) { console.error(error); projectsFeedback.hidden = false; projectsFeedback.textContent = "Não foi possível alterar a publicação."; }
    });
    projectsGrid.append(card);
  });
};

const loadProjects = async () => {
  projectsFeedback.hidden = false;
  projectsFeedback.textContent = "Carregando projetos...";
  const snapshot = await getDocs(collection(db, "projects"));
  projects = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || String(a.name).localeCompare(String(b.name), "pt-BR"));
  renderProjects();
};

const setPreview = (target, url, alt, emptyText) => {
  target.replaceChildren();
  if (!url) { target.textContent = emptyText; return; }
  const image = document.createElement("img"); image.src = url; image.alt = alt || ""; target.append(image);
};

const renderGalleryPreview = () => {
  const target = $("#project-gallery-preview"); target.replaceChildren();
  if (!currentGallery.length) { target.textContent = "Nenhuma imagem na galeria."; return; }
  currentGallery.forEach((item, index) => {
    const wrap = document.createElement("div"); wrap.className = "media-preview-item";
    const image = document.createElement("img"); image.src = item.url; image.alt = item.alt || "";
    const button = document.createElement("button"); button.type = "button"; button.textContent = "Remover";
    button.addEventListener("click", () => { currentGallery.splice(index, 1); renderGalleryPreview(); });
    wrap.append(image, button); target.append(wrap);
  });
};

const resetEditor = () => {
  form.reset();
  currentProject = null;
  currentGallery = [];
  fields.originalSlug.value = "";
  fields.slug.disabled = false;
  fields.order.value = "100";
  $("#project-editor-title").textContent = "Novo projeto";
  $("#delete-project").hidden = true;
  setPreview($("#project-logo-preview"), "", "", "Sem logo: as iniciais serão usadas.");
  setPreview($("#project-banner-preview"), "", "", "Nenhum banner selecionado.");
  renderGalleryPreview();
  showFormFeedback("");
};

const openProject = (project = null) => {
  resetEditor();
  currentProject = project;
  if (project) {
    fields.originalSlug.value = project.id;
    fields.name.value = project.name || "";
    fields.slug.value = project.id;
    fields.slug.disabled = true;
    fields.shortDescription.value = project.shortDescription || "";
    fields.fullDescription.value = project.fullDescription || "";
    fields.platforms.value = (project.platforms || []).join(", ");
    fields.status.value = project.status || "";
    fields.version.value = project.version || "";
    fields.order.value = String(project.order ?? 100);
    fields.visible.checked = project.visible === true;
    fields.featured.checked = project.featured === true;
    fields.features.value = (project.features || []).join("\n");
    fields.requirements.value = (project.requirements || []).join("\n");
    fields.faq.value = (project.faq || []).map((item) => `${item.question} | ${item.answer}`).join("\n");
    fields.downloadUrl.value = project.downloadUrl || "";
    fields.supportUrl.value = project.supportUrl || "";
    fields.licenseUrl.value = project.licenseUrl || "";
    fields.seoTitle.value = project.seoTitle || "";
    fields.seoDescription.value = project.seoDescription || "";
    legacyCategories(project).forEach((category) => { const input = form.querySelector(`[name="project-category"][value="${category}"]`); if (input) input.checked = true; });
    currentGallery = Array.isArray(project.gallery) ? [...project.gallery] : [];
    setPreview($("#project-logo-preview"), project.logoUrl, `Logo ${project.name}`, "Sem logo: as iniciais serão usadas.");
    setPreview($("#project-banner-preview"), project.bannerUrl, `Banner ${project.name}`, "Nenhum banner selecionado.");
    renderGalleryPreview();
    $("#project-editor-title").textContent = `Editar ${project.name}`;
    $("#delete-project").hidden = false;
  }
  $("#projects-list-view").hidden = true;
  $("#project-editor-view").hidden = false;
  fields.name.focus();
};

const closeEditor = async () => {
  $("#project-editor-view").hidden = true;
  $("#projects-list-view").hidden = false;
  await loadProjects();
};

const validateFile = (file) => {
  if (!file) return;
  if (!file.type.startsWith("image/")) throw new Error("Selecione apenas arquivos de imagem.");
  if (file.size > 10 * 1024 * 1024) throw new Error(`A imagem ${file.name} ultrapassa 10 MB.`);
};

const uploadImage = async (file, slug, group) => {
  validateFile(file);
  const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `projects/${slug}/${group}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type, customMetadata: { projectSlug: slug } });
  return { url: await getDownloadURL(storageRef), path };
};

const parseFaq = () => {
  return lines(fields.faq.value).map((entry) => {
    const separator = entry.indexOf("|");
    if (separator < 1 || !entry.slice(separator + 1).trim()) throw new Error("No FAQ, use o formato “Pergunta | Resposta”, uma por linha.");
    return { question: entry.slice(0, separator).trim().slice(0, 240), answer: entry.slice(separator + 1).trim().slice(0, 1200) };
  });
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitter = event.submitter;
  const mode = submitter?.dataset.saveMode || "current";
  const slug = currentProject?.id || fields.slug.value.trim();
  const categories = $$('[name="project-category"]:checked').map((input) => input.value);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { showFormFeedback("Use um slug com letras minúsculas, números e hífens.", "error"); return; }
  if (!categories.length || categories.length > 3) { showFormFeedback("Selecione de 1 a 3 categorias.", "error"); return; }

  const buttons = $$('[data-save-mode]'); buttons.forEach((button) => { button.disabled = true; });
  showFormFeedback("Salvando projeto e enviando imagens...");

  try {
    const faq = parseFaq();
    const logoUpload = fields.logoFile.files[0] ? await uploadImage(fields.logoFile.files[0], slug, "logo") : null;
    const bannerUpload = fields.bannerFile.files[0] ? await uploadImage(fields.bannerFile.files[0], slug, "banner") : null;
    const galleryUploads = [];
    for (const file of [...fields.galleryFiles.files]) {
      const uploaded = await uploadImage(file, slug, "gallery");
      galleryUploads.push({ ...uploaded, alt: `Captura de ${fields.name.value.trim()}` });
    }

    const visible = mode === "publish" ? true : mode === "draft" ? false : fields.visible.checked;
    const payload = {
      slug,
      name: fields.name.value.trim(),
      shortDescription: fields.shortDescription.value.trim(),
      fullDescription: fields.fullDescription.value.trim(),
      categories,
      platforms: commaList(fields.platforms.value),
      status: fields.status.value.trim(),
      version: fields.version.value.trim(),
      requirements: lines(fields.requirements.value),
      features: lines(fields.features.value),
      faq,
      downloadUrl: fields.downloadUrl.value.trim(),
      supportUrl: fields.supportUrl.value.trim(),
      licenseUrl: fields.licenseUrl.value.trim(),
      order: Math.max(0, Math.min(9999, Number(fields.order.value) || 0)),
      visible,
      featured: fields.featured.checked,
      logoUrl: logoUpload?.url || (fields.logoRemove.checked ? "" : currentProject?.logoUrl || ""),
      logoPath: logoUpload?.path || (fields.logoRemove.checked ? "" : currentProject?.logoPath || ""),
      bannerUrl: bannerUpload?.url || (fields.bannerRemove.checked ? "" : currentProject?.bannerUrl || ""),
      bannerPath: bannerUpload?.path || (fields.bannerRemove.checked ? "" : currentProject?.bannerPath || ""),
      gallery: [...currentGallery, ...galleryUploads].slice(0, 12),
      seoTitle: fields.seoTitle.value.trim(),
      seoDescription: fields.seoDescription.value.trim(),
      updatedAt: serverTimestamp()
    };

    const documentRef = doc(db, "projects", slug);
    if (currentProject) {
      await setDoc(documentRef, { ...payload, createdAt: currentProject.createdAt }, { merge: false });
      const retainedGalleryPaths = new Set(currentGallery.map((item) => item.path).filter(Boolean));
      const removedGalleryPaths = (currentProject.gallery || []).map((item) => item.path).filter((path) => path && !retainedGalleryPaths.has(path));
      const oldPaths = [
        (logoUpload || fields.logoRemove.checked) && currentProject.logoPath,
        (bannerUpload || fields.bannerRemove.checked) && currentProject.bannerPath,
        ...removedGalleryPaths
      ].filter(Boolean);
      await Promise.allSettled(oldPaths.map((path) => deleteObject(ref(storage, path))));
    } else {
      await setDoc(documentRef, { ...payload, createdAt: serverTimestamp() });
    }

    showFormFeedback(visible ? "Projeto salvo e publicado." : "Projeto salvo como oculto.", "success");
    window.setTimeout(closeEditor, 650);
  } catch (error) {
    console.error("project_save_failed", error);
    showFormFeedback(error.message || "Não foi possível salvar o projeto.", "error");
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
});

$("#delete-project").addEventListener("click", async () => {
  if (!currentProject || !window.confirm(`Excluir “${currentProject.name}” e todas as imagens enviadas?`)) return;
  const button = $("#delete-project"); button.disabled = true; showFormFeedback("Excluindo projeto...");
  try {
    const paths = [currentProject.logoPath, currentProject.bannerPath, ...(currentProject.gallery || []).map((item) => item.path)].filter(Boolean);
    await Promise.allSettled(paths.map((path) => deleteObject(ref(storage, path))));
    await deleteDoc(doc(db, "projects", currentProject.id));
    await closeEditor();
  } catch (error) {
    console.error("project_delete_failed", error); showFormFeedback("Não foi possível excluir o projeto.", "error"); button.disabled = false;
  }
});

fields.name.addEventListener("input", () => { if (!currentProject && (!fields.slug.value || fields.slug.dataset.auto === "true")) { fields.slug.value = slugify(fields.name.value); fields.slug.dataset.auto = "true"; } });
fields.slug.addEventListener("input", () => { fields.slug.value = slugify(fields.slug.value); fields.slug.dataset.auto = "false"; });
fields.logoFile.addEventListener("change", () => { const file = fields.logoFile.files[0]; if (file) setPreview($("#project-logo-preview"), URL.createObjectURL(file), "Prévia do logo", ""); });
fields.bannerFile.addEventListener("change", () => { const file = fields.bannerFile.files[0]; if (file) setPreview($("#project-banner-preview"), URL.createObjectURL(file), "Prévia do banner", ""); });

$("#new-project").addEventListener("click", () => openProject());
$("#cancel-project").addEventListener("click", closeEditor);
$("#admin-logout").addEventListener("click", async () => { await signOut(auth); location.href = "/"; });
$("#message-search").addEventListener("input", renderMessages);
$$('[data-message-filter]').forEach((button) => button.addEventListener("click", () => {
  messageFilter = button.dataset.messageFilter;
  $$('[data-message-filter]').forEach((item) => item.classList.toggle("active", item === button));
  renderMessages();
}));
setTabs();

onAuthStateChanged(auth, async (user) => {
  if (!user) { location.replace("/login/?next=%2Fadmin%2F"); return; }
  try {
    if (!await isAdmin(user.uid)) { loading.hidden = true; denied.hidden = false; return; }
    $("#admin-email").textContent = user.email || "";
    await loadProjects();
    watchMessages();
    loading.hidden = true;
    app.hidden = false;
  } catch (error) {
    console.error("admin_load_failed", error);
    loading.textContent = "Não foi possível carregar o painel administrativo.";
  }
});

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase-app.js";

const loading = document.querySelector("#admin-loading");
const denied = document.querySelector("#admin-denied");
const app = document.querySelector("#admin-app");
const adminEmail = document.querySelector("#admin-email");
const logoutButton = document.querySelector("#admin-logout");
const messagesBody = document.querySelector("#messages-body");
const projectsBody = document.querySelector("#projects-body");
const messageCount = document.querySelector("#message-count");
const newCount = document.querySelector("#new-count");
const visibleCount = document.querySelector("#visible-count");
const messageDetail = document.querySelector("#message-detail");
const tabs = [...document.querySelectorAll("[data-admin-tab]")];
const panels = [...document.querySelectorAll("[data-admin-panel]")];

const PROJECT_SEED = [
  { slug: "guiacopy", name: "GuiaCopy", category: "Programa", path: "/projetos/guiacopy/", visible: false, featured: true },
  { slug: "guiaplay", name: "GuiaPlay", category: "Programa", path: "/projetos/guiaplay/", visible: false, featured: true },
  { slug: "guiasys-memora", name: "GuiaSys Memora", category: "Aplicativo", path: "/projetos/guiasys-memora/", visible: false, featured: true },
  { slug: "sai-do-casamento", name: "Sai do Casamento", category: "Site", path: "/projetos/sai-do-casamento/", visible: false, featured: false }
];

const CATEGORY_OPTIONS = ["Programa", "Aplicativo", "Site"];

const normalizeCategories = (value) => {
  const text = String(value || "");
  const found = CATEGORY_OPTIONS.filter(category =>
    text.toLocaleLowerCase("pt-BR").includes(category.toLocaleLowerCase("pt-BR"))
  );
  return found.length ? found.slice(0, 3) : ["Programa"];
};

const categoryValue = (categories) => [...new Set(categories)]
  .filter(category => CATEGORY_OPTIONS.includes(category))
  .slice(0, 3)
  .join(" | ");

const categoryOptionsHtml = (selected) => CATEGORY_OPTIONS.map(category =>
  `<option value="${category}" ${category === selected ? "selected" : ""}>${category}</option>`
).join("");

const renderCategoryEditor = (project) => {
  const categories = normalizeCategories(project.category);
  const controls = categories.map((category, index) => `
    <div class="admin-category-row">
      <select class="admin-category-select"
              data-category-project="${escapeHtml(project.id)}"
              data-category-index="${index}">
        ${categoryOptionsHtml(category)}
      </select>
      ${categories.length > 1 ? `<button class="admin-category-remove" type="button" data-remove-category="${escapeHtml(project.id)}" data-category-index="${index}" aria-label="Remover categoria">×</button>` : ""}
    </div>
  `).join("");

  const addButton = categories.length < 3
    ? `<button class="admin-category-add" type="button" data-add-category="${escapeHtml(project.id)}">+ Adicionar categoria</button>`
    : "";

  return `<div class="admin-categories" data-project-categories="${escapeHtml(project.id)}">${controls}${addButton}</div>`;
};

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatDate = (timestamp) => {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleString("pt-BR");
};

const isAdmin = async (uid) => {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists() && snap.data().enabled === true;
};

const ensureProjects = async () => {
  for (const project of PROJECT_SEED) {
    const ref = doc(db, "projects", project.slug);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      await setDoc(ref, {
        ...project,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }
};

const loadProjects = async () => {
  const snapshot = await getDocs(collection(db, "projects"));
  const projects = snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"));

  visibleCount.textContent = String(projects.filter(p => p.visible).length);

  projectsBody.innerHTML = projects.map(project => `
    <tr>
      <td><strong>${escapeHtml(project.name)}</strong></td>
      <td><code>${escapeHtml(project.slug)}</code></td>
      <td>${renderCategoryEditor(project)}</td>
      <td>
        <label class="admin-switch">
          <input type="checkbox" data-project-visible="${escapeHtml(project.id)}" ${project.visible ? "checked" : ""}>
          <span></span>
        </label>
      </td>
      <td><a class="admin-link" href="${escapeHtml(project.path || "#")}" target="_blank" rel="noopener">Abrir página</a></td>
    </tr>
  `).join("");

  document.querySelectorAll("[data-project-visible]").forEach(input => {
    input.addEventListener("change", async () => {
      input.disabled = true;
      try {
        await updateDoc(doc(db, "projects", input.dataset.projectVisible), {
          visible: input.checked,
          updatedAt: serverTimestamp()
        });
        await loadProjects();
      } catch (error) {
        console.error(error);
        input.checked = !input.checked;
        alert("Não foi possível alterar a visibilidade do projeto.");
      } finally {
        input.disabled = false;
      }
    });
  });

  document.querySelectorAll("[data-category-project]").forEach(select => {
    select.addEventListener("change", async () => {
      const project = projects.find(item => item.id === select.dataset.categoryProject);
      if (!project) return;

      const categories = normalizeCategories(project.category);
      const index = Number(select.dataset.categoryIndex);
      const previous = categories[index];
      categories[index] = select.value;

      if (new Set(categories).size !== categories.length) {
        alert("Essa categoria já está adicionada ao projeto.");
        select.value = previous;
        return;
      }

      select.disabled = true;
      try {
        await updateDoc(doc(db, "projects", project.id), {
          category: categoryValue(categories),
          updatedAt: serverTimestamp()
        });
        await loadProjects();
      } catch (error) {
        console.error(error);
        select.value = previous;
        alert("Não foi possível alterar a categoria.");
      } finally {
        select.disabled = false;
      }
    });
  });

  document.querySelectorAll("[data-add-category]").forEach(button => {
    button.addEventListener("click", async () => {
      const project = projects.find(item => item.id === button.dataset.addCategory);
      if (!project) return;

      const categories = normalizeCategories(project.category);
      const next = CATEGORY_OPTIONS.find(category => !categories.includes(category));
      if (!next || categories.length >= 3) return;

      button.disabled = true;
      try {
        await updateDoc(doc(db, "projects", project.id), {
          category: categoryValue([...categories, next]),
          updatedAt: serverTimestamp()
        });
        await loadProjects();
      } catch (error) {
        console.error(error);
        alert("Não foi possível adicionar a categoria.");
      } finally {
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll("[data-remove-category]").forEach(button => {
    button.addEventListener("click", async () => {
      const project = projects.find(item => item.id === button.dataset.removeCategory);
      if (!project) return;

      const categories = normalizeCategories(project.category);
      if (categories.length <= 1) return;

      const index = Number(button.dataset.categoryIndex);
      categories.splice(index, 1);

      button.disabled = true;
      try {
        await updateDoc(doc(db, "projects", project.id), {
          category: categoryValue(categories),
          updatedAt: serverTimestamp()
        });
        await loadProjects();
      } catch (error) {
        console.error(error);
        alert("Não foi possível remover a categoria.");
      } finally {
        button.disabled = false;
      }
    });
  });
};

const openMessage = async (messageDoc) => {
  const data = messageDoc.data();
  messageDetail.innerHTML = `
    <div class="admin-detail-head">
      <div>
        <span class="badge">${escapeHtml(data.projectName || "Contato geral")}</span>
        <h3>${escapeHtml(data.name)}</h3>
        <p><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a> • ${formatDate(data.createdAt)}</p>
      </div>
      <button class="icon-btn" type="button" data-close-detail aria-label="Fechar">×</button>
    </div>
    <div class="admin-message-text">${escapeHtml(data.message).replaceAll("\n", "<br>")}</div>
    <div class="admin-detail-actions">
      <button class="btn btn-secondary" type="button" data-status="read">Marcar como lida</button>
      <button class="btn btn-secondary" type="button" data-status="archived">Arquivar</button>
      <button class="btn admin-danger" type="button" data-delete-message>Excluir</button>
    </div>
  `;
  messageDetail.hidden = false;

  messageDetail.querySelector("[data-close-detail]")?.addEventListener("click", () => {
    messageDetail.hidden = true;
  });

  messageDetail.querySelectorAll("[data-status]").forEach(button => {
    button.addEventListener("click", async () => {
      await updateDoc(doc(db, "contactMessages", messageDoc.id), {
        status: button.dataset.status,
        updatedAt: serverTimestamp()
      });
      messageDetail.hidden = true;
      await loadMessages();
    });
  });

  messageDetail.querySelector("[data-delete-message]")?.addEventListener("click", async () => {
    if (!confirm("Excluir esta mensagem permanentemente?")) return;
    await deleteDoc(doc(db, "contactMessages", messageDoc.id));
    messageDetail.hidden = true;
    await loadMessages();
  });

  if (data.status === "new") {
    await updateDoc(doc(db, "contactMessages", messageDoc.id), {
      status: "read",
      updatedAt: serverTimestamp()
    });
    await loadMessages(false);
  }
};

const loadMessages = async (render = true) => {
  const snapshot = await getDocs(query(collection(db, "contactMessages"), orderBy("createdAt", "desc")));
  const docs = snapshot.docs;

  messageCount.textContent = String(docs.length);
  newCount.textContent = String(docs.filter(item => item.data().status === "new").length);

  if (!render) return;

  if (!docs.length) {
    messagesBody.innerHTML = '<tr><td colspan="5" class="admin-empty">Nenhuma mensagem recebida.</td></tr>';
    return;
  }

  messagesBody.innerHTML = docs.map(item => {
    const data = item.data();
    return `
      <tr class="${data.status === "new" ? "is-new" : ""}" data-message-id="${item.id}">
        <td><strong>${escapeHtml(data.name)}</strong><small>${escapeHtml(data.email)}</small></td>
        <td>${escapeHtml(data.projectName || "Contato geral")}</td>
        <td><span class="admin-status ${escapeHtml(data.status || "new")}">${escapeHtml(data.status || "new")}</span></td>
        <td>${formatDate(data.createdAt)}</td>
        <td><button class="btn btn-secondary admin-small" type="button" data-open-message="${item.id}">Abrir</button></td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll("[data-open-message]").forEach(button => {
    button.addEventListener("click", () => {
      const target = docs.find(item => item.id === button.dataset.openMessage);
      if (target) openMessage(target);
    });
  });
};

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(item => item.classList.toggle("active", item === tab));
    panels.forEach(panel => {
      panel.hidden = panel.dataset.adminPanel !== tab.dataset.adminTab;
    });
  });
});

logoutButton?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/";
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("/login/?next=%2Fadmin%2F");
    return;
  }

  try {
    const allowed = await isAdmin(user.uid);
    loading.hidden = true;

    if (!allowed) {
      denied.hidden = false;
      return;
    }

    adminEmail.textContent = user.email || "";
    await ensureProjects();
    await Promise.all([loadProjects(), loadMessages()]);
    app.hidden = false;
  } catch (error) {
    console.error(error);
    loading.textContent = "Não foi possível carregar o painel administrativo.";
  }
});

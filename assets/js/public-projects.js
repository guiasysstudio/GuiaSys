import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase-app.js?v=20261014";

const grid = document.querySelector("#projects-grid");
const state = document.querySelector("#projects-state");
const filters = [...document.querySelectorAll("[data-project-filter]")];
const labels = { programa: "Programas", aplicativo: "Aplicativos", site: "Sites" };

let projects = [];
let activeFilter = "all";

const initials = (name) => String(name || "GuiaSys")
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((word) => word[0])
  .join("")
  .toLocaleUpperCase("pt-BR");

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const buildLogo = (project, large = false) => {
  if (project.logoUrl) {
    const image = el("img", "project-logo-image");
    image.src = project.logoUrl;
    image.alt = `Logo ${project.name}`;
    image.loading = "lazy";
    return image;
  }
  return el("div", `project-icon${large ? " large" : ""}`, initials(project.name));
};

const createCard = (project) => {
  const card = el("article", "project-card");
  const top = el("div", "project-card-top");
  const visual = el("div", "project-visual");
  visual.append(buildLogo(project, true));
  top.append(visual);
  if (project.status) top.append(el("span", "project-status", project.status));

  const body = el("div", "project-card-body");
  body.append(el("span", "badge", (project.categories || []).join(" • ")));
  body.append(el("h2", "", project.name));
  if (project.shortDescription) body.append(el("p", "", project.shortDescription));

  const meta = el("div", "project-meta-row");
  (project.platforms || []).slice(0, 5).forEach((platform) => meta.append(el("span", "", platform)));
  if (project.version) meta.append(el("span", "", `Versão ${project.version}`));
  if (meta.childElementCount) body.append(meta);

  const footer = el("div", "project-card-footer");
  const detail = el("a", "btn btn-primary", "Conhecer projeto");
  detail.href = `/projetos/${encodeURIComponent(project.slug)}/`;
  const contact = el("a", "text-link", "Contato →");
  contact.href = `/contato/?projeto=${encodeURIComponent(project.slug)}`;
  footer.append(detail, contact);
  card.append(top, body, footer);
  return card;
};

const render = () => {
  const visible = projects.filter((project) =>
    activeFilter === "all" || (project.categories || []).some((category) =>
      String(category).toLocaleLowerCase("pt-BR") === activeFilter
    )
  );

  grid.replaceChildren(...visible.map(createCard));
  state.hidden = visible.length > 0;
  if (!visible.length) {
    state.innerHTML = `<strong>Nenhum projeto encontrado.</strong><p>${
      activeFilter === "all"
        ? "Ainda não há projetos publicados."
        : `Ainda não há projetos publicados em ${labels[activeFilter] || "esta categoria"}.`
    }</p>`;
  }
};

filters.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.projectFilter || "all";
    filters.forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    render();
  });
});

try {
  const snapshot = await getDocs(query(collection(db, "projects"), where("visible", "==", true)));
  projects = snapshot.docs
    .map((item) => ({ slug: item.id, ...item.data() }))
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.name.localeCompare(b.name, "pt-BR"));
  render();
} catch (error) {
  console.error("projects_load_failed", error);
  grid.replaceChildren();
  state.hidden = false;
  state.innerHTML = "<strong>Não foi possível carregar os projetos.</strong><p>Tente novamente em instantes.</p>";
}

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase-app.js";

const cards = [...document.querySelectorAll("[data-project-slug]")];
const emptyState = document.querySelector("[data-projects-empty]");
const filters = [...document.querySelectorAll("[data-project-filter]")];

const CATEGORY_KEYS = {
  programa: "Programa",
  aplicativo: "Aplicativo",
  site: "Site"
};

const normalizeCategories = (value) => {
  const text = String(value || "").toLocaleLowerCase("pt-BR");
  return Object.entries(CATEGORY_KEYS)
    .filter(([, label]) => text.includes(label.toLocaleLowerCase("pt-BR")))
    .map(([key]) => key);
};

let publishedProjects = new Map();
let activeFilter = "all";

const render = () => {
  let visibleCount = 0;

  cards.forEach(card => {
    const project = publishedProjects.get(card.dataset.projectSlug);
    const matchesFilter =
      activeFilter === "all" ||
      project?.categories?.includes(activeFilter);

    const shouldShow = Boolean(project) && matchesFilter;
    card.hidden = !shouldShow;

    if (shouldShow) {
      visibleCount += 1;

      const categoryBadge = card.querySelector("[data-project-categories]");
      if (categoryBadge) {
        categoryBadge.textContent = project.categories
          .map(key => CATEGORY_KEYS[key])
          .join(" • ");
      }
    }
  });

  if (emptyState) {
    emptyState.hidden = visibleCount > 0;
    emptyState.textContent = activeFilter === "all"
      ? "Nenhum projeto está publicado no momento."
      : "Nenhum projeto publicado nesta categoria.";
  }
};

const loadPublishedProjects = async () => {
  if (!cards.length) return;

  cards.forEach(card => { card.hidden = true; });

  try {
    const snapshot = await getDocs(
      query(collection(db, "projects"), where("visible", "==", true))
    );

    publishedProjects = new Map(
      snapshot.docs.map(item => {
        const data = item.data();
        return [
          item.id,
          {
            ...data,
            categories: normalizeCategories(data.category)
          }
        ];
      })
    );

    render();
  } catch (error) {
    console.error("Falha ao carregar projetos publicados:", error);

    if (emptyState) {
      emptyState.hidden = false;
      emptyState.textContent = "Não foi possível carregar os projetos publicados.";
    }
  }
};

filters.forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.projectFilter || "all";

    filters.forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", active ? "true" : "false");
    });

    render();
  });
});

loadPublishedProjects();

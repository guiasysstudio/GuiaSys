import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase-app.js";

const cards = [...document.querySelectorAll("[data-project-slug]")];
const emptyState = document.querySelector("[data-projects-empty]");

const showOnlyPublished = async () => {
  if (!cards.length) return;

  cards.forEach(card => { card.hidden = true; });

  try {
    const snapshot = await getDocs(query(collection(db, "projects"), where("visible", "==", true)));
    const visible = new Set(snapshot.docs.map(doc => doc.id));

    cards.forEach(card => {
      card.hidden = !visible.has(card.dataset.projectSlug);
    });

    if (emptyState) {
      emptyState.hidden = cards.some(card => !card.hidden);
    }
  } catch (error) {
    console.error("Falha ao carregar projetos publicados:", error);
    if (emptyState) {
      emptyState.hidden = false;
      emptyState.textContent = "Não foi possível carregar os projetos publicados.";
    }
  }
};

showOnlyPublished();

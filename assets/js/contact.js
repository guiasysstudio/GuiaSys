import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase-app.js";

const form = document.querySelector("#contact-form");
const nameInput = document.querySelector("#name");
const emailInput = document.querySelector("#email");
const projectSelect = document.querySelector("#project");
const messageInput = document.querySelector("#message");
const feedback = document.querySelector("#contact-message");

const params = new URLSearchParams(window.location.search);
const requestedProject = params.get("projeto");

const show = (text, type = "") => {
  if (!feedback) return;
  feedback.textContent = text;
  feedback.className = `auth-message ${type}`;
};

const loadVisibleProjects = async () => {
  if (!projectSelect) return;

  // O HTML contém somente "Contato geral". Projetos entram aqui apenas
  // depois que o Firestore confirma que visible == true.
  projectSelect.disabled = true;

  try {
    const snapshot = await getDocs(
      query(collection(db, "projects"), where("visible", "==", true))
    );

    const projects = snapshot.docs
      .map(item => ({ slug: item.id, ...item.data() }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"));

    for (const project of projects) {
      if (!project.slug || !project.name) continue;

      const option = document.createElement("option");
      option.value = project.slug;
      option.textContent = project.name;
      projectSelect.appendChild(option);
    }

    if (requestedProject) {
      const requestedOption = [...projectSelect.options]
        .find(option => option.value === requestedProject);

      if (requestedOption) projectSelect.value = requestedProject;
    }
  } catch (error) {
    console.error("Não foi possível carregar os projetos públicos.", error);
  } finally {
    projectSelect.disabled = false;
  }
};

loadVisibleProjects();

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const projectSlug = projectSelect.value || "geral";
  const selectedOption = projectSelect.selectedOptions[0];
  const projectName = selectedOption?.textContent?.trim() || "Contato geral";
  const message = messageInput.value.trim();
  const fromVisibleProject =
    Boolean(requestedProject) &&
    projectSlug === requestedProject &&
    projectSlug !== "geral";

  if (name.length < 2) {
    show("Informe seu nome.", "error");
    return;
  }
  if (!emailInput.checkValidity()) {
    show("Informe um e-mail válido.", "error");
    return;
  }
  if (message.length < 10) {
    show("Escreva uma mensagem com pelo menos 10 caracteres.", "error");
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Enviando...";
  show("Enviando sua mensagem...");

  try {
    await addDoc(collection(db, "contactMessages"), {
      name,
      email,
      projectSlug,
      projectName,
      message,
      status: "new",
      source: fromVisibleProject ? "project" : "contact",
      userId: auth.currentUser?.uid || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    form.reset();

    if (requestedProject) {
      const requestedOption = [...projectSelect.options]
        .find(option => option.value === requestedProject);

      if (requestedOption) projectSelect.value = requestedProject;
    }

    show("Mensagem enviada com sucesso. A GuiaSys recebeu seu contato.", "success");
  } catch (error) {
    console.error(error);
    show("Não foi possível enviar sua mensagem agora. Tente novamente.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Enviar mensagem";
  }
});

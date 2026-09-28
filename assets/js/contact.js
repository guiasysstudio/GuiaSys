import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase-app.js";

const form = document.querySelector("#contact-form");
const nameInput = document.querySelector("#name");
const emailInput = document.querySelector("#email");
const projectSelect = document.querySelector("#project");
const messageInput = document.querySelector("#message");
const feedback = document.querySelector("#contact-message");

const projectMap = {
  guiacopy: "GuiaCopy",
  guiaplay: "GuiaPlay",
  "guiasys-memora": "GuiaSys Memora",
  "sai-do-casamento": "Sai do Casamento",
  geral: "Contato geral"
};

const params = new URLSearchParams(window.location.search);
const requestedProject = params.get("projeto");

if (requestedProject && projectSelect) {
  const option = [...projectSelect.options].find(opt => opt.value === requestedProject);
  if (option) projectSelect.value = requestedProject;
}

const show = (text, type = "") => {
  if (!feedback) return;
  feedback.textContent = text;
  feedback.className = `auth-message ${type}`;
};

auth.onAuthStateChanged?.(() => {});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const projectSlug = projectSelect.value || "geral";
  const message = messageInput.value.trim();

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
      projectName: projectMap[projectSlug] || "Outro projeto",
      message,
      status: "new",
      source: requestedProject ? "project" : "contact",
      userId: auth.currentUser?.uid || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    form.reset();
    if (requestedProject && [...projectSelect.options].some(opt => opt.value === requestedProject)) {
      projectSelect.value = requestedProject;
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

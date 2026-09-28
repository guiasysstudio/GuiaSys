import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase-app.js";

const form = document.querySelector("#project-request-form");
const feedback = document.querySelector("#project-request-message");

const show = (text, type = "") => {
  feedback.textContent = text;
  feedback.className = `auth-message ${type}`;
};

form?.addEventListener("submit", async event => {
  event.preventDefault();

  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const email = String(data.get("email") || "").trim();
  const phone = String(data.get("phone") || "").trim();
  const type = String(data.get("type") || "").trim();
  const objective = String(data.get("objective") || "").trim();
  const details = String(data.get("details") || "").trim();

  if (name.length < 2 || !email || details.length < 20) {
    show("Preencha nome, e-mail e descreva o projeto com um pouco mais de detalhe.", "error");
    return;
  }

  const message = [
    "SOLICITAÇÃO DE PROJETO",
    `Tipo: ${type || "Não informado"}`,
    `Telefone/WhatsApp: ${phone || "Não informado"}`,
    `Objetivo: ${objective || "Não informado"}`,
    "",
    details
  ].join("\n");

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Enviando...";
  show("Enviando sua solicitação...");

  try {
    await addDoc(collection(db, "contactMessages"), {
      name,
      email,
      projectSlug: "solicitacao-projeto",
      projectName: "Solicitação de projeto",
      message,
      status: "new",
      source: "contact",
      userId: auth.currentUser?.uid || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    form.reset();
    show("Solicitação enviada. Ela já está disponível no atendimento da GuiaSys.", "success");
  } catch (error) {
    console.error(error);
    show("Não foi possível enviar agora. Tente novamente em instantes.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Enviar solicitação";
  }
});

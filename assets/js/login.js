import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./firebase-app.js";
import { routeAfterAuthentication, safeNextPath } from "./profile-service.js";

const form = document.querySelector("#login-form");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const googleButton = document.querySelector("#google-login");
const resetButton = document.querySelector("#reset-password");
const message = document.querySelector("#auth-message");
const requestedNext = safeNextPath(new URLSearchParams(window.location.search).get("next"), "/conta/");

const show = (text, type = "") => {
  message.textContent = text;
  message.className = `auth-message ${type}`;
};

const friendlyError = (error) => {
  const code = error?.code || "";
  if (code.includes("invalid-credential")) return "E-mail ou senha inválidos.";
  if (code.includes("too-many-requests")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (code.includes("popup-closed")) return "A janela de login do Google foi fechada.";
  if (code.includes("unauthorized-domain")) return "Este domínio ainda não foi autorizado no Firebase.";
  if (code.includes("operation-not-allowed")) return "Este método de login ainda não foi ativado no Firebase.";
  return "Não foi possível entrar. Tente novamente.";
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  show("Entrando...");
  try {
    const credential = await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    await routeAfterAuthentication(credential.user, requestedNext);
  } catch (error) {
    show(friendlyError(error), "error");
  }
});

googleButton?.addEventListener("click", async () => {
  show("Abrindo login do Google...");
  try {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    await routeAfterAuthentication(credential.user, requestedNext);
  } catch (error) {
    show(friendlyError(error), "error");
  }
});

resetButton?.addEventListener("click", async () => {
  const value = email.value.trim();
  if (!value) {
    show("Digite seu e-mail acima para recuperar a senha.", "error");
    email.focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, value);
    show("Enviamos as instruções de recuperação para seu e-mail.", "success");
  } catch (error) {
    show(friendlyError(error), "error");
  }
});

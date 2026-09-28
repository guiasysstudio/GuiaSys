import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./firebase-app.js";

const form = document.querySelector("#register-form");
const name = document.querySelector("#name");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const confirmPassword = document.querySelector("#confirm-password");
const googleButton = document.querySelector("#google-register");
const message = document.querySelector("#auth-message");

const show = (text, type = "") => {
  message.textContent = text;
  message.className = `auth-message ${type}`;
};

const friendlyError = (error) => {
  const code = error?.code || "";
  if (code.includes("email-already-in-use")) return "Já existe uma conta com este e-mail.";
  if (code.includes("weak-password")) return "Use uma senha mais forte.";
  if (code.includes("invalid-email")) return "Informe um e-mail válido.";
  if (code.includes("popup-closed")) return "A janela de cadastro do Google foi fechada.";
  if (code.includes("unauthorized-domain")) return "Este domínio ainda não foi autorizado no Firebase.";
  if (code.includes("operation-not-allowed")) return "Este método de cadastro ainda não foi ativado no Firebase.";
  return "Não foi possível criar a conta. Tente novamente.";
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (password.value.length < 6) {
    show("A senha precisa ter pelo menos 6 caracteres.", "error");
    return;
  }
  if (password.value !== confirmPassword.value) {
    show("As senhas não coincidem.", "error");
    return;
  }

  show("Criando sua conta...");
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value);
    await updateProfile(credential.user, { displayName: name.value.trim() });
    window.location.href = "/conta/";
  } catch (error) {
    show(friendlyError(error), "error");
  }
});

googleButton?.addEventListener("click", async () => {
  show("Abrindo cadastro com Google...");
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    window.location.href = "/conta/";
  } catch (error) {
    show(friendlyError(error), "error");
  }
});

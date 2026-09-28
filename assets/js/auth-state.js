import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./firebase-app.js";

const accountLink = document.querySelector("[data-account-link]");

onAuthStateChanged(auth, (user) => {
  if (!accountLink) return;
  if (user) {
    const label = user.displayName?.trim()?.split(" ")[0] || "Minha conta";
    accountLink.textContent = label;
    accountLink.href = "/conta/";
    accountLink.title = user.email || "Minha conta";
  } else {
    accountLink.textContent = "Entrar";
    accountLink.href = "/login/";
    accountLink.title = "Entrar na conta GuiaSys";
  }
});

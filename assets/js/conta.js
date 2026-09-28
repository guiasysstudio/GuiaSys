import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./firebase-app.js";

const loading = document.querySelector("#account-loading");
const content = document.querySelector("#account-content");
const nameEl = document.querySelector("#account-name");
const emailEl = document.querySelector("#account-email");
const avatar = document.querySelector("#account-avatar");
const logout = document.querySelector("#logout-button");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    const next = encodeURIComponent("/conta/");
    window.location.replace(`/login/?next=${next}`);
    return;
  }

  const name = user.displayName || "Cliente GuiaSys";
  nameEl.textContent = name;
  emailEl.textContent = user.email || "";
  if (user.photoURL) {
    avatar.innerHTML = `<img src="${user.photoURL}" alt="">`;
  } else {
    avatar.textContent = name.trim().charAt(0).toUpperCase() || "G";
  }

  loading.hidden = true;
  content.hidden = false;
});

logout?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/";
});

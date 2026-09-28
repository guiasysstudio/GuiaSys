import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./firebase-app.js";
import { getUserProfile, isProfileComplete } from "./profile-service.js";

const loading = document.querySelector("#account-loading");
const content = document.querySelector("#account-content");
const nameEl = document.querySelector("#account-name");
const emailEl = document.querySelector("#account-email");
const avatar = document.querySelector("#account-avatar");
const logout = document.querySelector("#logout-button");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    const next = encodeURIComponent("/conta/");
    window.location.replace(`/login/?next=${next}`);
    return;
  }

  try {
    const profile = await getUserProfile(user.uid);

    if (!isProfileComplete(profile)) {
      window.location.replace("/conta/perfil/?required=1&next=%2Fconta%2F");
      return;
    }

    const name = profile.fullName || user.displayName || "Cliente GuiaSys";
    nameEl.textContent = name;
    emailEl.textContent = user.email || profile.email || "";

    if (user.photoURL) {
      avatar.innerHTML = `<img src="${user.photoURL}" alt="">`;
    } else {
      avatar.textContent = name.trim().charAt(0).toUpperCase() || "G";
    }

    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.textContent = "Não foi possível carregar sua conta. Atualize a página e tente novamente.";
  }
});

logout?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/";
});

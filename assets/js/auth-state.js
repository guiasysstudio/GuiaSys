import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase-app.js";

const accountLink = document.querySelector("[data-account-link]");
let accountMenu = null;
let accountWrap = null;

const removeMenu = () => {
  accountMenu?.remove();
  accountMenu = null;

  if (accountWrap && accountLink) {
    const parent = accountWrap.parentNode;
    parent?.insertBefore(accountLink, accountWrap);
    accountWrap.remove();
    accountWrap = null;
  }
};

const closeMenu = () => {
  if (!accountMenu || !accountLink) return;
  accountMenu.hidden = true;
  accountLink.setAttribute("aria-expanded", "false");
};

const openMenu = () => {
  if (!accountMenu || !accountLink) return;
  accountMenu.hidden = false;
  accountLink.setAttribute("aria-expanded", "true");
};

const isAdminUser = async (user) => {
  try {
    const snapshot = await getDoc(doc(db, "admins", user.uid));
    return snapshot.exists() && snapshot.data().enabled === true;
  } catch (error) {
    console.error("Não foi possível verificar a permissão administrativa.", error);
    return false;
  }
};

const buildAccountMenu = async (user) => {
  removeMenu();

  if (!accountLink?.parentNode) return;

  accountWrap = document.createElement("div");
  accountWrap.className = "account-menu-wrap";

  accountLink.parentNode.insertBefore(accountWrap, accountLink);
  accountWrap.appendChild(accountLink);

  accountMenu = document.createElement("div");
  accountMenu.className = "account-menu";
  accountMenu.hidden = true;

  const firstName = user.displayName?.trim()?.split(" ")[0] || "Minha conta";
  const email = user.email || "";
  const admin = await isAdminUser(user);

  accountMenu.innerHTML = `
    <div class="account-menu-head">
      <strong>${firstName}</strong>
      <span>${email}</span>
    </div>
    <a class="account-menu-item" href="/conta/">Minha conta</a>
    ${admin ? '<a class="account-menu-item admin-entry" href="/admin/">Painel administrativo</a>' : ''}
    <button class="account-menu-item account-menu-signout" type="button">Sair</button>
  `;

  accountWrap.appendChild(accountMenu);

  accountMenu.querySelector(".account-menu-signout")?.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "/";
  });

  accountMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });
};

document.addEventListener("click", (event) => {
  if (!accountWrap || accountWrap.contains(event.target)) return;
  closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

onAuthStateChanged(auth, async (user) => {
  if (!accountLink) return;

  if (user) {
    const label = user.displayName?.trim()?.split(" ")[0] || "Minha conta";
    accountLink.textContent = label;
    accountLink.href = "#";
    accountLink.title = user.email || "Minha conta";
    accountLink.setAttribute("role", "button");
    accountLink.setAttribute("aria-haspopup", "menu");
    accountLink.setAttribute("aria-expanded", "false");

    await buildAccountMenu(user);

    accountLink.onclick = (event) => {
      event.preventDefault();
      if (!accountMenu) return;
      accountMenu.hidden ? openMenu() : closeMenu();
    };
  } else {
    removeMenu();
    accountLink.onclick = null;
    accountLink.textContent = "Entrar";
    accountLink.href = "/login/";
    accountLink.title = "Entrar na conta GuiaSys";
    accountLink.removeAttribute("role");
    accountLink.removeAttribute("aria-haspopup");
    accountLink.removeAttribute("aria-expanded");
  }
});

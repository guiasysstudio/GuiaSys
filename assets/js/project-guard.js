import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth, db } from "./firebase-app.js";

const slug = document.body.dataset.projectSlug;

const allowPage = () => {
  document.body.classList.add("project-access-ready");
};

const denyPage = () => {
  window.location.replace("/projetos/");
};

const userIsAdmin = async (user) => {
  if (!user) return false;
  try {
    const snap = await getDoc(doc(db, "admins", user.uid));
    return snap.exists() && snap.data().enabled === true;
  } catch {
    return false;
  }
};

const checkAccess = async (user) => {
  if (!slug) {
    allowPage();
    return;
  }

  try {
    const project = await getDoc(doc(db, "projects", slug));
    if (project.exists() && project.data().visible === true) {
      allowPage();
      return;
    }

    if (await userIsAdmin(user)) {
      allowPage();
      return;
    }

    denyPage();
  } catch (error) {
    if (await userIsAdmin(user)) {
      allowPage();
      return;
    }
    denyPage();
  }
};

onAuthStateChanged(auth, checkAccess);

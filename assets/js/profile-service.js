import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase-db.js?v=20261015-2";
import { STUDIO_COLLECTIONS } from "./firebase-schema.js?v=20261015-1";

export const safeNextPath = (value, fallback = "/conta/") => {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
};

export const getUserProfile = async (uid) => {
  const snapshot = await getDoc(doc(db, STUDIO_COLLECTIONS.profiles, uid));
  return snapshot.exists() ? snapshot.data() : null;
};

export const isProfileComplete = (profile) => profile?.profileComplete === true;

export const routeAfterAuthentication = async (user, requestedNext = "/conta/") => {
  const next = safeNextPath(requestedNext, "/conta/");
  const profile = await getUserProfile(user.uid);

  if (!isProfileComplete(profile)) {
    const params = new URLSearchParams({ required: "1", next });
    window.location.href = `/conta/perfil/?${params.toString()}`;
    return;
  }

  window.location.href = next;
};

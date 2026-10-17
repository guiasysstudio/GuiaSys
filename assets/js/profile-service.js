import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase-db.js?v=20261015-2";
import { auth } from "./firebase-auth.js?v=20261015-2";
import { STUDIO_COLLECTIONS } from "./firebase-schema.js?v=20261015-1";

const LICENSING_PROFILE_API = "https://licencas.guiasys.com.br/api/v1/customer/me";

const licensingRequest = async (options = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error("authentication_required");
  const response = await fetch(LICENSING_PROFILE_API, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}`, ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Não foi possível acessar o perfil compartilhado.");
  return payload.account;
};

const studioProfileFromAccount = (account) => ({
  uid: auth.currentUser?.uid || "", fullName: account.displayName || "",
  email: account.email || auth.currentUser?.email || "", cpf: account.taxId || "",
  birthDate: account.birthDate || "", phone: account.phone || "", cep: account.postalCode || "",
  street: account.street || "", number: account.number || "", complement: account.complement || "",
  neighborhood: account.neighborhood || "", city: account.city || "", state: account.state || "",
  profileComplete: account.profileComplete === true
});

export const saveSharedProfile = async (profile) => studioProfileFromAccount(await licensingRequest({
  method: "PATCH",
  body: JSON.stringify({
    displayName: profile.fullName, taxId: profile.cpf, birthDate: profile.birthDate,
    phone: profile.phone, postalCode: profile.cep, street: profile.street,
    number: profile.number, complement: profile.complement,
    neighborhood: profile.neighborhood, city: profile.city, state: profile.state
  })
}));

export const safeNextPath = (value, fallback = "/conta/") => {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
};

export const getUserProfile = async (uid) => {
  try {
    return studioProfileFromAccount(await licensingRequest());
  } catch (error) {
    console.warn("shared_profile_unavailable", error);
    const snapshot = await getDoc(doc(db, STUDIO_COLLECTIONS.profiles, uid));
    return snapshot.exists() ? snapshot.data() : null;
  }
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

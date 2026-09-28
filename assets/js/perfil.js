import {
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase-app.js";
import { safeNextPath } from "./profile-service.js";

const form = document.querySelector("#profile-form");
const message = document.querySelector("#profile-message");
const loading = document.querySelector("#profile-loading");
const content = document.querySelector("#profile-content");
const status = document.querySelector("#profile-status");
const cepButton = document.querySelector("#lookup-cep");

const fields = {
  fullName: document.querySelector("#full-name"),
  email: document.querySelector("#profile-email"),
  cpf: document.querySelector("#cpf"),
  birthDate: document.querySelector("#birth-date"),
  phone: document.querySelector("#phone"),
  cep: document.querySelector("#cep"),
  street: document.querySelector("#street"),
  number: document.querySelector("#number"),
  complement: document.querySelector("#complement"),
  neighborhood: document.querySelector("#neighborhood"),
  city: document.querySelector("#city"),
  state: document.querySelector("#state")
};

let currentUser = null;
let existingProfile = null;

const digits = (value) => String(value || "").replace(/\D/g, "");

const formatCPF = (value) => {
  const v = digits(value).slice(0, 11);
  return v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const formatPhone = (value) => {
  const v = digits(value).slice(0, 11);
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

const formatCEP = (value) => digits(value).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

const show = (text, type = "") => {
  message.textContent = text;
  message.className = `auth-message ${type}`;
};

const setStatus = (complete) => {
  status.textContent = complete ? "Cadastro completo" : "Cadastro incompleto";
  status.className = `profile-status ${complete ? "complete" : "incomplete"}`;
};

const isValidCPF = (cpfValue) => {
  const cpf = digits(cpfValue);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculate = (length) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(cpf[i]) * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculate(9) === Number(cpf[9]) && calculate(10) === Number(cpf[10]);
};

const isValidBirthDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return false;

  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return date.getTime() <= todayUTC && year >= 1900;
};

const validate = () => {
  if (fields.fullName.value.trim().length < 3) return "Informe seu nome completo.";
  if (!isValidCPF(fields.cpf.value)) return "Informe um CPF válido.";
  if (!isValidBirthDate(fields.birthDate.value)) return "Informe uma data de nascimento válida.";

  const phone = digits(fields.phone.value);
  if (!/^\d{10,11}$/.test(phone)) return "Informe um telefone válido com DDD.";

  if (!/^\d{8}$/.test(digits(fields.cep.value))) return "Informe um CEP válido.";
  if (fields.street.value.trim().length < 2) return "Informe o logradouro.";
  if (!fields.number.value.trim()) return "Informe o número do endereço.";
  if (!fields.neighborhood.value.trim()) return "Informe o bairro.";
  if (!fields.city.value.trim()) return "Informe a cidade.";
  if (!/^[A-Za-z]{2}$/.test(fields.state.value.trim())) return "Informe a UF com 2 letras.";

  return null;
};

const fillProfile = (profile, user) => {
  fields.fullName.value = profile?.fullName || user.displayName || "";
  fields.email.value = user.email || profile?.email || "";
  fields.cpf.value = formatCPF(profile?.cpf || "");
  fields.birthDate.value = profile?.birthDate || "";
  fields.phone.value = formatPhone(profile?.phone || "");
  fields.cep.value = formatCEP(profile?.cep || "");
  fields.street.value = profile?.street || "";
  fields.number.value = profile?.number || "";
  fields.complement.value = profile?.complement || "";
  fields.neighborhood.value = profile?.neighborhood || "";
  fields.city.value = profile?.city || "";
  fields.state.value = profile?.state || "";
  setStatus(profile?.profileComplete === true);
};

const lookupCEP = async () => {
  const cep = digits(fields.cep.value);
  if (!/^\d{8}$/.test(cep)) {
    show("Digite um CEP válido antes de pesquisar.", "error");
    fields.cep.focus();
    return;
  }

  cepButton.disabled = true;
  cepButton.textContent = "Buscando...";
  show("Consultando CEP...");

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error("cep-request-failed");
    const data = await response.json();
    if (data.erro) throw new Error("cep-not-found");

    fields.street.value = data.logradouro || fields.street.value;
    fields.neighborhood.value = data.bairro || fields.neighborhood.value;
    fields.city.value = data.localidade || fields.city.value;
    fields.state.value = (data.uf || fields.state.value).toUpperCase();
    show("Endereço localizado. Confira os dados e informe o número.", "success");
    fields.number.focus();
  } catch (error) {
    show("Não foi possível localizar esse CEP. Você pode preencher o endereço manualmente.", "error");
  } finally {
    cepButton.disabled = false;
    cepButton.textContent = "Buscar CEP";
  }
};

fields.cpf.addEventListener("input", () => { fields.cpf.value = formatCPF(fields.cpf.value); });
fields.phone.addEventListener("input", () => { fields.phone.value = formatPhone(fields.phone.value); });
fields.cep.addEventListener("input", () => { fields.cep.value = formatCEP(fields.cep.value); });
fields.state.addEventListener("input", () => { fields.state.value = fields.state.value.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase(); });
cepButton?.addEventListener("click", lookupCEP);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login/?next=${next}`);
    return;
  }

  currentUser = user;

  try {
    const ref = doc(db, "users", user.uid);
    const snapshot = await getDoc(ref);
    existingProfile = snapshot.exists() ? snapshot.data() : null;
    fillProfile(existingProfile, user);
    loading.hidden = true;
    content.hidden = false;
  } catch (error) {
    loading.textContent = "Não foi possível carregar seu perfil. Atualize a página e tente novamente.";
  }
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;

  const validationError = validate();
  if (validationError) {
    show(validationError, "error");
    return;
  }

  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "Salvando...";
  show("Salvando seus dados...");

  const payload = {
    uid: currentUser.uid,
    fullName: fields.fullName.value.trim(),
    email: currentUser.email || "",
    cpf: digits(fields.cpf.value),
    birthDate: fields.birthDate.value,
    phone: digits(fields.phone.value),
    cep: digits(fields.cep.value),
    street: fields.street.value.trim(),
    number: fields.number.value.trim(),
    complement: fields.complement.value.trim(),
    neighborhood: fields.neighborhood.value.trim(),
    city: fields.city.value.trim(),
    state: fields.state.value.trim().toUpperCase(),
    profileComplete: true,
    schemaVersion: 1,
    updatedAt: serverTimestamp()
  };

  try {
    const ref = doc(db, "users", currentUser.uid);

    if (existingProfile) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp()
      });
    }

    if (currentUser.displayName !== payload.fullName) {
      await updateProfile(currentUser, { displayName: payload.fullName });
    }

    setStatus(true);
    show("Cadastro salvo com sucesso.", "success");

    const params = new URLSearchParams(window.location.search);
    const next = safeNextPath(params.get("next"), "/conta/");
    window.setTimeout(() => { window.location.href = next; }, 650);
  } catch (error) {
    console.error(error);
    show("Não foi possível salvar seu cadastro. Confira as regras do Firestore e tente novamente.", "error");
    submit.disabled = false;
    submit.textContent = "Salvar cadastro";
  }
});

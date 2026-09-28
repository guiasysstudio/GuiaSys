import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase-app.js";

const form = document.querySelector("#site-search-form");
const input = document.querySelector("#site-search-input");
const results = document.querySelector("#site-search-results");
const summary = document.querySelector("#site-search-summary");

const staticPages = [
  { title: "Início", description: "Página inicial da GuiaSys Studio.", url: "/", keywords: "guiasys studio software desenvolvimento tecnologia" },
  { title: "Projetos", description: "Programas, aplicativos e sites desenvolvidos pela GuiaSys Studio.", url: "/projetos/", keywords: "projetos programas aplicativos sites" },
  { title: "Sobre a GuiaSys Studio", description: "Conheça a atuação, o processo de desenvolvimento e a proposta da GuiaSys Studio.", url: "/sobre/", keywords: "sobre empresa desenvolvimento desktop web integração" },
  { title: "Contato", description: "Fale com a GuiaSys Studio pelo formulário ou WhatsApp.", url: "/contato/", keywords: "contato whatsapp suporte atendimento" },
  { title: "FAQ", description: "Respostas para dúvidas frequentes sobre a GuiaSys Studio e seus projetos.", url: "/faq/", keywords: "faq dúvidas perguntas ajuda" },
  { title: "Novidades", description: "Atualizações e novidades da GuiaSys Studio.", url: "/novidades/", keywords: "novidades atualizações releases" },
  { title: "Solicitar projeto", description: "Envie uma solicitação de projeto ou solução personalizada.", url: "/solicitar-projeto/", keywords: "orçamento projeto personalizado site programa sistema" }
];

let searchableItems = [...staticPages];

const normalize = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR");

const escapeHtml = value => String(value ?? "")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#039;");

const loadProjects = async () => {
  try {
    const snapshot = await getDocs(query(collection(db, "projects"), where("visible", "==", true)));
    searchableItems.push(...snapshot.docs.map(item => {
      const data = item.data();
      return {
        title: data.name || item.id,
        description: data.description || `Projeto ${data.name || item.id} da GuiaSys Studio.`,
        url: data.path || `/projetos/${item.id}/`,
        keywords: `${data.category || ""} ${data.platforms || ""} projeto`
      };
    }));
  } catch (error) {
    console.error("Não foi possível carregar os projetos para a busca.", error);
  }
};

const render = term => {
  const needle = normalize(term.trim());

  if (!needle) {
    summary.textContent = "Digite uma palavra para pesquisar.";
    results.innerHTML = "";
    return;
  }

  const matches = searchableItems.filter(item => {
    const haystack = normalize(`${item.title} ${item.description} ${item.keywords}`);
    return haystack.includes(needle);
  });

  summary.textContent = matches.length
    ? `${matches.length} resultado${matches.length === 1 ? "" : "s"} para “${term.trim()}”.`
    : `Nenhum resultado para “${term.trim()}”.`;

  results.innerHTML = matches.map(item => `
    <a class="search-result" href="${escapeHtml(item.url)}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.description)}</span>
      <small>${escapeHtml(item.url)}</small>
    </a>
  `).join("");
};

form?.addEventListener("submit", event => {
  event.preventDefault();
  const term = input.value;
  const url = new URL(window.location.href);
  if (term.trim()) url.searchParams.set("q", term.trim());
  else url.searchParams.delete("q");
  history.replaceState({}, "", url);
  render(term);
});

await loadProjects();

const initial = new URLSearchParams(window.location.search).get("q") || "";
input.value = initial;
if (initial) render(initial);

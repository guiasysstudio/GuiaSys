import { loadPublicProjects } from "./public-project-api.js?v=20261014-7";

const section = document.querySelector("#featured-projects");
const grid = document.querySelector("#featured-projects-grid");

const initials = (name) => String(name || "GuiaSys")
  .split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

const makeCard = (project) => {
  const card = document.createElement("a");
  card.className = "featured-project-card";
  card.href = `/projetos/${encodeURIComponent(project.slug)}/`;

  const media = document.createElement("div");
  media.className = "featured-project-media";
  if (project.bannerUrl) {
    const image = document.createElement("img");
    image.src = project.bannerUrl;
    image.alt = "";
    image.loading = "lazy";
    media.append(image);
  }

  const logo = document.createElement(project.logoUrl ? "img" : "span");
  logo.className = "featured-project-logo";
  if (project.logoUrl) {
    logo.src = project.logoUrl;
    logo.alt = `Logo ${project.name}`;
  } else {
    logo.textContent = initials(project.name);
  }
  media.append(logo);

  const body = document.createElement("div");
  body.className = "featured-project-body";
  const categories = document.createElement("span");
  categories.className = "eyebrow";
  categories.textContent = (project.categories || []).join(" • ");
  const title = document.createElement("h3");
  title.textContent = project.name;
  const description = document.createElement("p");
  description.textContent = project.shortDescription || "Conheça este projeto da GuiaSys Studio.";
  body.append(categories, title, description);
  card.append(media, body);
  return card;
};

if (section && grid) {
  try {
    const projects = (await loadPublicProjects())
      .filter((project) => project.featured === true)
      .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
      .slice(0, 6);

    if (projects.length) {
      grid.replaceChildren(...projects.map(makeCard));
      section.hidden = false;
    }
  } catch (error) {
    console.error("featured_projects_load_failed", error);
  }
}

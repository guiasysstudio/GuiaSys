const CACHE_KEY = "guiasys-public-projects-v1";
const CACHE_TTL = 5 * 60 * 1000;

const readCache = () => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    return cached && Array.isArray(cached.projects) && Date.now() - cached.savedAt < CACHE_TTL
      ? cached.projects
      : null;
  } catch {
    return null;
  }
};

const writeCache = (projects) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), projects }));
  } catch {
    // A página continua funcionando mesmo quando o navegador bloqueia storage.
  }
};

const requestJson = async (url) => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const error = new Error(`projects_http_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const loadPublicProjects = async () => {
  const cached = readCache();
  if (cached) return cached;
  const data = await requestJson("/api/projects");
  const projects = Array.isArray(data.projects) ? data.projects : [];
  writeCache(projects);
  return projects;
};

export const loadPublicProject = async (slug) => {
  const cached = readCache();
  const match = cached?.find((project) => project.slug === slug);
  if (match) return match;
  const data = await requestJson(`/api/projects?slug=${encodeURIComponent(slug)}`);
  return data.project;
};

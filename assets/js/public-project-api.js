const API_VERSION = "20261016-1";

const currentUrl = (url) => `${url}${url.includes("?") ? "&" : "?"}v=${API_VERSION}`;

const requestJson = async (url) => {
  const response = await fetch(currentUrl(url), {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
  if (!response.ok) {
    const error = new Error(`projects_http_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const loadPublicProjects = async () => {
  const data = await requestJson("/api/projects");
  return Array.isArray(data.projects) ? data.projects : [];
};

export const loadPublicProject = async (slug) => {
  const data = await requestJson(`/api/projects?slug=${encodeURIComponent(slug)}`);
  return data.project;
};

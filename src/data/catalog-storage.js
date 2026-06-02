const catalogStorageKey = "gpg-project-catalog";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `API respondeu ${response.status}`);
  }

  return data;
}

export function loadProjectCatalog(baseProjects) {
  const savedCatalog = window.localStorage.getItem(catalogStorageKey);

  if (!savedCatalog) {
    return structuredClone(baseProjects);
  }

  try {
    return JSON.parse(savedCatalog);
  } catch {
    window.localStorage.removeItem(catalogStorageKey);
    return structuredClone(baseProjects);
  }
}

export async function loadRemoteProjectCatalog(baseProjects) {
  try {
    const data = await apiRequest("/api/projects");

    if (Array.isArray(data.projects) && data.projects.length) {
      return data.projects;
    }
  } catch {
    // O fallback local preserva o terminal quando a API ainda nao esta pronta.
  }

  return loadProjectCatalog(baseProjects);
}

export function saveProjectCatalog(projects) {
  window.localStorage.setItem(catalogStorageKey, JSON.stringify(projects, null, 2));
}

export async function saveRemoteProject(project) {
  await apiRequest(`/api/projects/${encodeURIComponent(project.id)}`, {
    method: "PUT",
    body: JSON.stringify({ project }),
  });
}

export async function deleteRemoteProject(id) {
  await apiRequest(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function seedRemoteProjectCatalog(projects) {
  await apiRequest("/api/projects/seed", {
    method: "POST",
    body: JSON.stringify({ projects }),
  });
}

export function resetProjectCatalog() {
  window.localStorage.removeItem(catalogStorageKey);
}

export function exportProjectCatalog(projects) {
  return JSON.stringify(projects, null, 2);
}

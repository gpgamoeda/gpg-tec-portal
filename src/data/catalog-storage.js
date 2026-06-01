const catalogStorageKey = "gpg-project-catalog";

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

export function saveProjectCatalog(projects) {
  window.localStorage.setItem(catalogStorageKey, JSON.stringify(projects, null, 2));
}

export function resetProjectCatalog() {
  window.localStorage.removeItem(catalogStorageKey);
}

export function exportProjectCatalog(projects) {
  return JSON.stringify(projects, null, 2);
}

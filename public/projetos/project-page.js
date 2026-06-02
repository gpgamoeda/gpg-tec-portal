import { fallbackProjects } from "./fallback-projects.js";

const apiBaseUrl = window.GPG_API_BASE_URL || "";

function projectIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get("id");

  if (queryId) {
    return queryId;
  }

  const parts = window.location.pathname.replace(/\/+$/, "").split("/");
  const projectIndex = parts.lastIndexOf("projetos");
  return projectIndex >= 0 ? parts[projectIndex + 1] : "";
}

async function loadProjectsFrom(path) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
  });
  const data = await response.json();

  if (response.ok && Array.isArray(data.projects) && data.projects.length) {
    return data.projects;
  }

  return [];
}

async function loadProjects() {
  if (!apiBaseUrl) {
    return fallbackProjects;
  }

  const projects = [];

  try {
    projects.push(...await loadProjectsFrom("/api/public/projects"));
  } catch {
    // A ficha publica continua funcionando com fallback se a API cair.
  }

  try {
    projects.push(...await loadProjectsFrom("/api/projects"));
  } catch {
    // Projetos privados exigem sessao; visitantes veem apenas o catalogo publico.
  }

  if (projects.length) {
    return Array.from(new Map(projects.map((project) => [project.id, project])).values());
  }

  return fallbackProjects;
}

function findProject(projects, id) {
  const normalizedId = id.toLowerCase();

  return projects.find((project) => {
    const names = [project.id, project.codename, project.title, ...(project.aliases || [])];
    return names.some((name) => String(name).toLowerCase() === normalizedId);
  });
}

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = value || "";
  }
}

function renderList(selector, items, fallback) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.textContent = "";
  (items?.length ? items : fallback).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    element.appendChild(li);
  });
}

function originLabel(project) {
  if (project.cloudflare?.type) {
    return `cloudflare / ${project.cloudflare.type}`;
  }

  if (project.github) {
    return `github / ${project.github.owner}/${project.github.repo}`;
  }

  return project.repo ? "repositorio vinculado" : "catalogo";
}

function renderProject(project) {
  const primaryTag = project.tags?.[0] || project.cloudflare?.type || "projeto";
  const command = `abrir ${project.aliases?.[0] || project.id}`;
  const openLink = document.querySelector("[data-project-open]");
  const repoLink = document.querySelector("[data-project-repo]");

  document.title = `${project.codename} | GPG TEC`;
  setText("[data-project-kicker]", `arquivo // ${primaryTag}`);
  setText("[data-project-codename]", project.codename);
  setText("[data-project-summary]", project.summary);
  setText("[data-project-mission]", project.summary);
  setText("[data-project-title]", project.title);
  setText("[data-project-status]", project.status);
  setText("[data-project-stack]", (project.stack || []).join(" / ") || "nao informado");
  setText("[data-project-updated]", project.updated);
  setText("[data-project-command]", command);
  setText("[data-project-origin]", originLabel(project));

  renderList("[data-project-modules]", project.next, ["mapear proximos passos"]);
  renderList("[data-project-next]", project.next, ["revisar roadmap do projeto"]);

  if (openLink) {
    openLink.href = project.url || project.repo || "../index.html";
    openLink.hidden = !project.url && !project.repo;
  }

  if (repoLink) {
    repoLink.href = project.repo || "../index.html";
    repoLink.hidden = !project.repo;
  }
}

function renderMissingProject(id) {
  document.title = "Projeto nao localizado | GPG TEC";
  setText("[data-project-kicker]", "arquivo // ausente");
  setText("[data-project-codename]", "sinal perdido");
  setText("[data-project-summary]", `nenhum projeto encontrado para: ${id || "sem codigo"}`);
  setText("[data-project-mission]", "volte ao terminal e consulte a lista de projetos.");
  setText("[data-project-title]", "nao localizado");
  setText("[data-project-status]", "offline");
  setText("[data-project-stack]", "nao informado");
  setText("[data-project-updated]", "nao informado");
  setText("[data-project-command]", "projetos");
  setText("[data-project-origin]", "terminal");
  renderList("[data-project-modules]", ["consultar projetos no terminal"], []);
  renderList("[data-project-next]", ["digite projetos"], []);
}

document.querySelector("[data-terminal-back]")?.addEventListener("click", (event) => {
  if (window.history.length <= 1) {
    return;
  }

  event.preventDefault();
  window.history.back();
});

const id = projectIdFromUrl();
const projects = await loadProjects();
const project = findProject(projects, id);

if (project) {
  renderProject(project);
} else {
  renderMissingProject(id);
}

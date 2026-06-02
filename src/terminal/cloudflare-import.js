const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

async function apiGet(path) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `API respondeu ${response.status}`);
  }

  return data;
}

function fallbackNext(type) {
  return type === "pages"
    ? ["vincular repositorio ao catalogo", "revisar descricao publica do projeto"]
    : ["documentar contrato da API", "avaliar exposicao no portal"];
}

export async function listCloudflareProjects(type) {
  const path = type === "workers" ? "/api/cloudflare/workers" : "/api/cloudflare/pages";
  const data = await apiGet(path);
  return data.projects || [];
}

export function catalogProjectFromCloudflare(project) {
  const typeLabel = project.type === "worker" ? "worker" : "pages";

  return {
    id: project.id,
    codename: project.title,
    aliases: Array.from(new Set([project.id, project.name].filter(Boolean))),
    title: project.title,
    status: project.status || "ativo",
    visibility: "public",
    priority: 3,
    tags: ["cloudflare", typeLabel],
    path: `projetos/${project.id}/index.html`,
    page: `projetos/ficha.html?id=${project.id}`,
    url: project.url,
    repo: project.repo || "",
    summary: `Projeto ${typeLabel} detectado na Cloudflare.`,
    updated: project.updated,
    stack: ["cloudflare", typeLabel],
    next: fallbackNext(typeLabel),
    cloudflare: {
      name: project.name,
      type: project.type,
      productionBranch: project.productionBranch || "",
    },
  };
}

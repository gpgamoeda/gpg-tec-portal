function normalizeRepo(input) {
  const trimmed = input.trim();

  if (trimmed.includes("github.com")) {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const parts = url.pathname.replace(/^\/|\/$/g, "").split("/");
    return { owner: parts[0], repo: parts[1] };
  }

  const [owner, repo] = trimmed.replace(/^\/|\/$/g, "").split("/");
  return { owner, repo };
}

function titleFromRepoName(name) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function firstReadmeParagraph(readme) {
  const lines = readme
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("[!") && !line.startsWith("!"));

  return lines.find((line) => line.length > 32)?.replace(/[`*_>#]/g, "") || "";
}

function roadmapItems(readme) {
  const markerIndex = readme.toLowerCase().search(/roadmap|pr[oó]ximos|todo|next/i);

  if (markerIndex === -1) {
    return [];
  }

  return readme
    .slice(markerIndex)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+|\d+\.\s+/.test(line))
    .slice(0, 5)
    .map((line) => line.replace(/^[-*]\s+|\d+\.\s+/, "").replace(/[`*_]/g, ""));
}

async function fetchReadme(owner, repo) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    headers: { Accept: "application/vnd.github.raw+json" },
  });

  if (!response.ok) {
    return "";
  }

  return response.text();
}

export async function importProjectFromGithub(input) {
  const { owner, repo } = normalizeRepo(input);

  if (!owner || !repo) {
    throw new Error("Use owner/repo ou uma URL do GitHub.");
  }

  const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!repoResponse.ok) {
    throw new Error(`GitHub respondeu ${repoResponse.status}. Verifique se o repositorio e publico.`);
  }

  const repoData = await repoResponse.json();
  const readme = await fetchReadme(owner, repo);
  const summary = repoData.description || firstReadmeParagraph(readme) || "Projeto importado do GitHub.";
  const next = roadmapItems(readme);
  const id = repoData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const alias = id.split("-")[0] || id;

  return {
    id,
    codename: titleFromRepoName(repoData.name),
    aliases: Array.from(new Set([alias, repoData.name.toLowerCase()])),
    title: titleFromRepoName(repoData.name),
    status: "importado",
    visibility: repoData.private ? "private" : "public",
    priority: 3,
    tags: [
      "github",
      repoData.language?.toLowerCase(),
      ...(repoData.topics || []),
    ].filter(Boolean),
    path: `projetos/${id}/index.html`,
    url: repoData.homepage || repoData.html_url,
    repo: repoData.html_url,
    summary,
    updated: (repoData.pushed_at || repoData.updated_at || new Date().toISOString()).slice(0, 10),
    stack: [repoData.language || "unknown"],
    next: next.length ? next : ["revisar README importado", "definir proximos passos no portal"],
    github: {
      owner,
      repo,
      defaultBranch: repoData.default_branch,
      stars: repoData.stargazers_count,
    },
  };
}

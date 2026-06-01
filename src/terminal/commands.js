import { createAdminCommands } from "./admin.js";

export function createCommandHandler({ projects, terminal, ui }) {
  let previousTerminalScreen = "";

  function findProject(query) {
    const normalizedQuery = query.trim().toLowerCase();

    return projects.find((project) => {
      const names = [project.id, project.codename, project.title, ...project.aliases];
      return names.some((name) => name.toLowerCase() === normalizedQuery);
    });
  }

  const admin = createAdminCommands({ baseProjects: projects.baseProjects || projects, findProject, projects, terminal, ui });

  function listProjects() {
    const lines = ["arquivos encontrados:"];

    visibleProjects().forEach((project, index) => {
      lines.push(`${String(index + 1).padStart(2, "0")}  ${project.codename}  ::  ${project.status}`);
      lines.push(`    ${project.summary}`);
      lines.push(`    acesso: abrir ${project.aliases[0]} | dossie ${project.aliases[0]}`);
    });

    ui.typeLines(lines);
  }

  function showHelp() {
    ui.typeLines([
      "comandos disponiveis:",
      "  help              lista comandos",
      "  projetos          lista os projetos",
      "  dossie <codigo>   mostra detalhes do projeto",
      "  repo <codigo>     mostra repositorio/link tecnico",
      "  buscar <termo>     filtra projetos por texto/tag",
      "  tags              lista tags conhecidas",
      "  online            lista projetos com destino publico",
      "  recentes          lista ultimas atualizacoes",
      "  status            resume o estado do portal",
      "  abrir <codigo>    abre um projeto",
      "  admin             interface administrativa experimental",
      "  sobre             mostra a identidade do terminal",
      "  voltar            retorna do dossie",
      "  clear             limpa a sessao",
      "  logout            encerra o acesso",
    ]);
  }

  function visibleProjects() {
    return projects.filter((project) => project.visibility !== "hidden");
  }

  function openProject(query) {
    if (!query) {
      ui.appendLine("informe um codigo. exemplo: abrir martelo", "warning");
      return;
    }

    const project = findProject(query);

    if (!project) {
      ui.appendLine(`projeto nao localizado: ${query}`, "warning");
      ui.appendLine("digite projetos para ver os codigos disponiveis.", "dim");
      return;
    }

    const targetPath = project.url || (project.path.endsWith("/") ? `${project.path}index.html` : project.path);
    const targetUrl = project.url ? project.url : new URL(targetPath, window.location.href).href;
    const opened = window.open(targetUrl, "_blank", "noopener");

    ui.appendLine(`abrindo ${project.codename} em nova aba...`);

    if (!opened) {
      ui.appendLine("o navegador bloqueou a nova aba. permita pop-ups para este site.", "warning");
      ui.appendLine(`destino: ${targetUrl}`, "dim");
    }
  }

  function showProjectDossier(query) {
    if (!query) {
      ui.appendLine("informe um codigo. exemplo: dossie oraculo", "warning");
      return;
    }

    const project = findProject(query);

    if (!project) {
      ui.appendLine(`dossie nao encontrado: ${query}`, "warning");
      ui.appendLine("digite projetos para ver os codigos disponiveis.", "dim");
      return;
    }

    previousTerminalScreen = ui.terminalOutput.innerHTML;
    terminal.screen = "dossier";
    ui.clearOutput();

    ui.typeLines([
      `dossie: ${project.codename}`,
      `nome civil: ${project.title}`,
      `estado: ${project.status}`,
      `visibilidade: ${project.visibility}`,
      `tags: ${(project.tags || []).join(", ") || "sem tags"}`,
      `ultima alteracao: ${project.updated}`,
      `pilha: ${project.stack.join(" / ")}`,
      `resumo: ${project.summary}`,
      project.repo ? `repositorio: ${project.repo}` : "repositorio: nao informado",
      project.github ? `github: ${project.github.owner}/${project.github.repo}` : "github: nao vinculado",
      project.github ? `branch: ${project.github.defaultBranch} | stars: ${project.github.stars}` : "",
      "proximos sinais:",
      ...project.next.map((item) => `  - ${item}`),
      `comando de acesso: abrir ${project.aliases[0]}`,
      `destino: ${project.url || project.path}`,
      "",
      "digite voltar para retornar a tela anterior.",
    ]);
  }

  function showProjectRepo(query) {
    if (!query) {
      ui.appendLine("informe um codigo. exemplo: repo oraculo", "warning");
      return;
    }

    const project = findProject(query);

    if (!project) {
      ui.appendLine(`repo nao encontrado: ${query}`, "warning");
      return;
    }

    ui.typeLines([
      `repo: ${project.codename}`,
      `repositorio: ${project.repo || "nao informado"}`,
      `destino: ${project.url || project.path}`,
      project.github ? `github: ${project.github.owner}/${project.github.repo}` : "github: nao vinculado",
      project.github ? `branch: ${project.github.defaultBranch}` : "",
      project.github ? `stars: ${project.github.stars}` : "",
    ].filter(Boolean));
  }

  function showTags() {
    const tags = Array.from(
      new Set(visibleProjects().flatMap((project) => project.tags || [])),
    ).sort();

    ui.typeLines([
      "tags conhecidas:",
      ...tags.map((tag) => `  ${tag}`),
      "use: buscar <tag>",
    ]);
  }

  function searchProjects(query) {
    if (!query) {
      ui.appendLine("informe um termo. exemplo: buscar copa", "warning");
      return;
    }

    const normalizedQuery = query.toLowerCase();
    const matches = visibleProjects().filter((project) => {
      const haystack = [
        project.id,
        project.codename,
        project.title,
        project.status,
        project.summary,
        ...(project.tags || []),
        ...(project.aliases || []),
        ...(project.stack || []),
      ].join(" ").toLowerCase();

      return haystack.includes(normalizedQuery);
    });

    if (!matches.length) {
      ui.appendLine(`nenhum projeto encontrado para: ${query}`, "warning");
      return;
    }

    ui.typeLines([
      `resultado da busca: ${query}`,
      ...matches.flatMap((project) => [
        `  ${project.codename} :: ${project.status}`,
        `    abrir ${project.aliases[0]} | dossie ${project.aliases[0]}`,
      ]),
    ]);
  }

  function listOnlineProjects() {
    const online = visibleProjects().filter((project) => project.url || project.path);

    ui.typeLines([
      "projetos com destino configurado:",
      ...online.map((project) => `  ${project.codename} -> ${project.url || project.path}`),
    ]);
  }

  function listRecentProjects() {
    const recent = [...visibleProjects()]
      .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
      .slice(0, 8);

    ui.typeLines([
      "ultimas atualizacoes:",
      ...recent.map((project) => `  ${project.updated} :: ${project.codename} :: ${project.status}`),
    ]);
  }

  function restorePreviousScreen() {
    if (!previousTerminalScreen) {
      ui.appendLine("nenhuma tela anterior registrada.", "warning");
      return;
    }

    ui.terminalOutput.innerHTML = previousTerminalScreen;
    ui.terminalOutput.scrollTop = ui.terminalOutput.scrollHeight;
    previousTerminalScreen = "";
    terminal.screen = "main";
  }

  function clearCommandState() {
    previousTerminalScreen = "";
    terminal.screen = "main";
  }

  function showStatus() {
    const visible = visibleProjects();
    const inProgress = visible.filter((project) => project.status.includes("desenvolvimento")).length;
    const prototypes = visible.filter((project) => project.status.includes("prototipo")).length;
    const imported = visible.filter((project) => project.repo || project.github).length;

    ui.typeLines([
      "estado do portal:",
      `  projetos indexados: ${visible.length}`,
      `  em desenvolvimento: ${inProgress}`,
      `  prototipos: ${prototypes}`,
      `  importados do github: ${imported}`,
      "  terminal: online",
      "  chuva matrix: concluida",
    ]);
  }

  function run(value) {
    const command = value.trim().toLowerCase();
    ui.appendLine(`${terminal.user}@gpg:~$ ${value}`, "command");

    if (!command) {
      return "handled";
    }

    if (command === "clear") {
      ui.clearOutput();
      clearCommandState();
      return "handled";
    }

    if (admin.run(command, value)) {
      return "handled";
    }

    if (command === "voltar" || command === "back") {
      restorePreviousScreen();
      return "handled";
    }

    if (command === "help" || command === "?") {
      showHelp();
      return "handled";
    }

    if (command === "projetos" || command === "ls" || command === "dir") {
      listProjects();
      return "handled";
    }

    if (command === "tags") {
      showTags();
      return "handled";
    }

    if (command === "online") {
      listOnlineProjects();
      return "handled";
    }

    if (command === "recentes") {
      listRecentProjects();
      return "handled";
    }

    if (command === "status") {
      showStatus();
      return "handled";
    }

    if (command === "sobre") {
      ui.typeLines([
        "gpg.tec.br e um portal de projetos pessoais em modo terminal.",
        "cada experimento recebe um codinome antes de ganhar forma publica.",
      ]);
      return "handled";
    }

    if (command.startsWith("dossie ") || command.startsWith("info ")) {
      showProjectDossier(command.replace("dossie ", "").replace("info ", ""));
      return "handled";
    }

    if (command.startsWith("repo ")) {
      showProjectRepo(command.replace("repo ", ""));
      return "handled";
    }

    if (command.startsWith("buscar ") || command.startsWith("search ")) {
      searchProjects(value.replace(/^(buscar|search)\s+/i, ""));
      return "handled";
    }

    if (command.startsWith("abrir ")) {
      openProject(command.replace("abrir ", ""));
      return "handled";
    }

    const directProject = findProject(command);
    if (directProject) {
      openProject(command);
      return "handled";
    }

    ui.appendLine(`comando nao reconhecido: ${command}`, "warning");
    ui.appendLine("digite help para consultar o indice.", "dim");
    return "handled";
  }

  return { clearCommandState, run };
}

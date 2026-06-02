import {
  deleteRemoteProject,
  exportProjectCatalog,
  resetProjectCatalog,
  saveProjectCatalog,
  saveRemoteProject,
  seedRemoteProjectCatalog,
} from "../data/catalog-storage.js";
import {
  catalogProjectFromCloudflare,
  listCloudflareProjects,
} from "./cloudflare-import.js";
import { importProjectFromGithub } from "./github-import.js";

export function createAdminCommands({ baseProjects, projects, terminal, ui, findProject }) {
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function slugify(value) {
    return value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function parseProjectValue(rawValue, prefix) {
    const rest = rawValue.replace(prefix, "").trim();
    const [query, ...valueParts] = rest.split(/\s+/);
    return { query, value: valueParts.join(" ").trim() };
  }

  function parseProjectToken(rawValue, prefix) {
    const rest = rawValue.replace(prefix, "").trim();
    const [query, token] = rest.split(/\s+/);
    return { query, token };
  }

  function enterAdminMode() {
    terminal.admin = true;
    ui.typeLines([
      "modo admin: interface experimental",
      "alteracoes sao salvas no navegador local.",
      "comandos: admin projetos | admin ver <codigo> | admin github <owner/repo> | admin sair",
    ]);
  }

  function exitAdminMode() {
    terminal.admin = false;
    ui.appendLine("modo admin encerrado.", "dim");
  }

  function listProjects() {
    const lines = ["admin/projetos:"];

    projects.forEach((project, index) => {
      lines.push(
        `${String(index + 1).padStart(2, "0")} ${project.id} :: ${project.visibility} :: prioridade ${project.priority}`,
      );
      lines.push(`   ${project.codename} | ${project.status} | ${project.tags.join(", ")}`);
    });

    ui.typeLines(lines);
  }

  function persist(message = "catalogo salvo.") {
    saveProjectCatalog(projects);
    ui.appendLine(message, "dim");
  }

  async function persistProject(project, message = "catalogo salvo no D1.") {
    saveProjectCatalog(projects);

    try {
      await saveRemoteProject(project);
      ui.appendLine(message, "dim");
    } catch (error) {
      ui.appendLine(`catalogo salvo localmente; D1 falhou: ${error.message}`, "warning");
    }
  }

  async function persistCatalog(message = "catalogo salvo no D1.") {
    saveProjectCatalog(projects);

    try {
      await seedRemoteProjectCatalog(projects);
      ui.appendLine(message, "dim");
    } catch (error) {
      ui.appendLine(`catalogo salvo localmente; D1 falhou: ${error.message}`, "warning");
    }
  }

  async function removeRemoteProject(id) {
    try {
      await deleteRemoteProject(id);
      ui.appendLine(`admin: ${id} removido do D1.`, "dim");
    } catch (error) {
      ui.appendLine(`remocao local feita; D1 falhou: ${error.message}`, "warning");
    }
  }

  function viewProject(query) {
    if (!query) {
      ui.appendLine("informe um codigo. exemplo: admin ver oraculo", "warning");
      return;
    }

    const project = findProject(query);

    if (!project) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    ui.typeLines([
      `admin/ver: ${project.id}`,
      `codinome: ${project.codename}`,
      `nome civil: ${project.title}`,
      `visibilidade: ${project.visibility}`,
      `prioridade: ${project.priority}`,
      `status: ${project.status}`,
      `tags: ${project.tags.join(", ")}`,
      `destino: ${project.url || project.path}`,
      `repo: ${project.repo || "nao informado"}`,
      `atualizado: ${project.updated}`,
    ]);
  }

  function updateProjectField(query, field, value) {
    if (!query || !value) {
      ui.appendLine(`uso: admin ${field} <codigo> <valor>`, "warning");
      return;
    }

    const project = findProject(query);

    if (!project) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    project[field] = value;
    project.updated = today();
    persistProject(project, `admin: ${field} atualizado em ${project.id}.`);
  }

  function updatePriority(query, value) {
    if (!query || !value) {
      ui.appendLine("uso: admin prioridade <codigo> <numero>", "warning");
      return;
    }

    const priority = Number.parseInt(value, 10);

    if (!Number.isFinite(priority)) {
      ui.appendLine("prioridade precisa ser um numero.", "warning");
      return;
    }

    updateProjectField(query, "priority", priority);
  }

  function addTag(query, tag) {
    if (!query || !tag) {
      ui.appendLine("uso: admin tag add <codigo> <tag>", "warning");
      return;
    }

    const project = findProject(query);

    if (!project) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    project.tags = Array.from(new Set([...(project.tags || []), tag]));
    project.updated = today();
    persistProject(project, `admin: tag adicionada em ${project.id}.`);
  }

  function removeTag(query, tag) {
    if (!query || !tag) {
      ui.appendLine("uso: admin tag rm <codigo> <tag>", "warning");
      return;
    }

    const project = findProject(query);

    if (!project) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    project.tags = (project.tags || []).filter((item) => item !== tag);
    project.updated = today();
    persistProject(project, `admin: tag removida de ${project.id}.`);
  }

  function exportCatalog() {
    ui.clearOutput();
    ui.appendLine("admin/export:");
    ui.appendLine(exportProjectCatalog(projects));
  }

  async function copyCatalog() {
    if (!navigator.clipboard?.writeText) {
      ui.appendLine("clipboard indisponivel neste navegador.", "warning");
      return;
    }

    await navigator.clipboard.writeText(exportProjectCatalog(projects));
    ui.appendLine("admin: catalogo copiado para o clipboard.", "dim");
  }

  function downloadCatalog() {
    const blob = new Blob([exportProjectCatalog(projects)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `gpg-project-catalog-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    ui.appendLine("admin: download do catalogo iniciado.", "dim");
  }

  function replaceCatalog(importedProjects) {
    if (!Array.isArray(importedProjects)) {
      ui.appendLine("JSON invalido: esperava uma lista de projetos.", "warning");
      return;
    }

    projects.splice(0, projects.length, ...importedProjects);
    persistCatalog("admin: catalogo importado e salvo no D1.");
  }

  async function pasteCatalog() {
    if (!navigator.clipboard?.readText) {
      ui.appendLine("leitura do clipboard indisponivel neste navegador.", "warning");
      return;
    }

    try {
      replaceCatalog(JSON.parse(await navigator.clipboard.readText()));
    } catch {
      ui.appendLine("clipboard nao contem JSON valido.", "warning");
    }
  }

  function importCatalog(rawValue) {
    const jsonText = rawValue.replace(/^admin\s+importar\s+/i, "").trim();

    if (!jsonText) {
      ui.appendLine("uso: admin importar <json>", "warning");
      ui.appendLine("alternativa: copie o JSON e use admin colar.", "dim");
      return;
    }

    try {
      replaceCatalog(JSON.parse(jsonText));
    } catch {
      ui.appendLine("JSON invalido.", "warning");
    }
  }

  function resetCatalog() {
    projects.splice(0, projects.length, ...structuredClone(baseProjects));
    resetProjectCatalog();
    persistCatalog("admin: catalogo restaurado para a base do repositorio no D1.");
  }

  function updateTextCommand(rawValue, prefix, field) {
    const { query, value } = parseProjectValue(rawValue, prefix);
    updateProjectField(query, field, value);
  }

  function updateCodename(rawValue) {
    const { query, value } = parseProjectValue(rawValue, /^admin\s+codinome\s+/i);

    if (!query || !value) {
      ui.appendLine("uso: admin codinome <codigo> <texto>", "warning");
      return;
    }

    const project = findProject(query);

    if (!project) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    project.codename = value;
    project.updated = today();
    persistProject(project, `admin: codinome atualizado em ${project.id}.`);
  }

  function updateAliases(query, alias, mode) {
    if (!query || !alias) {
      ui.appendLine(`uso: admin alias ${mode} <codigo> <alias>`, "warning");
      return;
    }

    const project = findProject(query);

    if (!project) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    if (mode === "add") {
      project.aliases = Array.from(new Set([...(project.aliases || []), alias]));
    } else {
      project.aliases = (project.aliases || []).filter((item) => item !== alias);
    }

    project.updated = today();
    persistProject(project, `admin: aliases atualizados em ${project.id}.`);
  }

  function updateStack(query, item, mode) {
    if (!query || !item) {
      ui.appendLine(`uso: admin stack ${mode} <codigo> <item>`, "warning");
      return;
    }

    const project = findProject(query);

    if (!project) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    if (mode === "add") {
      project.stack = Array.from(new Set([...(project.stack || []), item]));
    } else {
      project.stack = (project.stack || []).filter((value) => value.toLowerCase() !== item.toLowerCase());
    }

    project.updated = today();
    persistProject(project, `admin: stack atualizado em ${project.id}.`);
  }

  function addNext(rawValue) {
    const { query, value } = parseProjectValue(rawValue, /^admin\s+next\s+add\s+/i);

    if (!query || !value) {
      ui.appendLine("uso: admin next add <codigo> <texto>", "warning");
      return;
    }

    const project = findProject(query);

    if (!project) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    project.next = [...(project.next || []), value];
    project.updated = today();
    persistProject(project, `admin: proximo passo adicionado em ${project.id}.`);
  }

  function removeNext(query, indexText) {
    const project = findProject(query);
    const index = Number.parseInt(indexText, 10) - 1;

    if (!project) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    if (!Number.isInteger(index) || index < 0 || index >= (project.next || []).length) {
      ui.appendLine("uso: admin next rm <codigo> <numero>", "warning");
      return;
    }

    project.next.splice(index, 1);
    project.updated = today();
    persistProject(project, `admin: proximo passo removido de ${project.id}.`);
  }

  function listNext(query) {
    const project = findProject(query);

    if (!project) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    ui.typeLines([
      `admin/next: ${project.id}`,
      ...(project.next || []).map((item, index) => `  ${index + 1}. ${item}`),
    ]);
  }

  function duplicateProject(query, requestedId) {
    const project = findProject(query);

    if (!project) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    const nextId = slugify(requestedId || `${project.id}-copia`);

    if (!nextId) {
      ui.appendLine("uso: admin duplicar <codigo> <novo-id>", "warning");
      return;
    }

    if (projects.some((item) => item.id === nextId)) {
      ui.appendLine(`admin: ja existe projeto com id ${nextId}.`, "warning");
      return;
    }

    const duplicatedProject = {
      ...structuredClone(project),
      id: nextId,
      codename: `${project.codename} Clone`,
      aliases: [nextId],
      status: "rascunho",
      visibility: "hidden",
      priority: Number(project.priority || 3) + 1,
      updated: today(),
    };

    projects.push(duplicatedProject);

    persistProject(duplicatedProject, `admin: ${project.id} duplicado como ${nextId}.`);
  }

  function removeProject(query) {
    const index = projects.findIndex((project) => {
      const names = [project.id, project.codename, project.title, ...(project.aliases || [])];
      return names.some((name) => name.toLowerCase() === query.toLowerCase());
    });

    if (index === -1) {
      ui.appendLine(`admin: projeto nao localizado: ${query}`, "warning");
      return;
    }

    const [removedProject] = projects.splice(index, 1);
    saveProjectCatalog(projects);
    ui.appendLine(`admin: ${removedProject.id} removido do catalogo local.`, "dim");
    removeRemoteProject(removedProject.id);
  }

  async function importGithubProject(query) {
    if (!query) {
      ui.appendLine("use: admin github owner/repo", "warning");
      return;
    }

    ui.appendLine(`admin/github: consultando ${query}...`);

    try {
      const importedProject = await importProjectFromGithub(query);
      const existingIndex = projects.findIndex((project) => project.id === importedProject.id);

      if (existingIndex >= 0) {
        projects.splice(existingIndex, 1, importedProject);
      } else {
        projects.push(importedProject);
      }

      await persistProject(importedProject, `admin/github: ${importedProject.id} importado.`);
      viewProject(importedProject.id);
    } catch (error) {
      ui.appendLine(`admin/github falhou: ${error.message}`, "warning");
      ui.appendLine("repositorios privados exigirao backend/token no proximo passo.", "dim");
    }
  }

  async function listCloudflare(type) {
    const label = type === "workers" ? "workers" : "pages";

    ui.appendLine(`admin/cloudflare: consultando ${label}...`);

    try {
      const cloudflareProjects = await listCloudflareProjects(label);

      if (!cloudflareProjects.length) {
        ui.appendLine(`admin/cloudflare: nenhum ${label} localizado.`, "dim");
        return;
      }

      ui.typeLines([
        `admin/cloudflare/${label}:`,
        ...cloudflareProjects.map((project, index) => (
          `${String(index + 1).padStart(2, "0")} ${project.id} :: ${project.status} :: ${project.url || "sem url"}`
        )),
      ]);
    } catch (error) {
      ui.appendLine(`admin/cloudflare falhou: ${error.message}`, "warning");
      ui.appendLine("verifique CF_ACCOUNT_ID e CF_API_TOKEN no Worker.", "dim");
    }
  }

  async function importCloudflareProject(type, query) {
    const label = type === "workers" ? "workers" : "pages";

    if (!query) {
      ui.appendLine(`uso: admin cloudflare importar ${label} <nome>`, "warning");
      return;
    }

    ui.appendLine(`admin/cloudflare: importando ${query} de ${label}...`);

    try {
      const cloudflareProjects = await listCloudflareProjects(label);
      const cloudflareProject = cloudflareProjects.find((project) => {
        const names = [project.id, project.name, project.title].filter(Boolean);
        return names.some((name) => name.toLowerCase() === query.toLowerCase());
      });

      if (!cloudflareProject) {
        ui.appendLine(`admin/cloudflare: projeto nao localizado: ${query}`, "warning");
        return;
      }

      const importedProject = catalogProjectFromCloudflare(cloudflareProject);
      const existingIndex = projects.findIndex((project) => project.id === importedProject.id);

      if (existingIndex >= 0) {
        projects.splice(existingIndex, 1, importedProject);
      } else {
        projects.push(importedProject);
      }

      await persistProject(importedProject, `admin/cloudflare: ${importedProject.id} importado.`);
      viewProject(importedProject.id);
    } catch (error) {
      ui.appendLine(`admin/cloudflare falhou: ${error.message}`, "warning");
      ui.appendLine("verifique CF_ACCOUNT_ID e CF_API_TOKEN no Worker.", "dim");
    }
  }

  function showHelp() {
    ui.typeLines([
      "admin/comandos:",
      "  admin              entra no modo admin",
      "  admin projetos     lista catalogo administrativo",
      "  admin ver <codigo> mostra registro completo",
      "  admin status <codigo> <status>",
      "  admin titulo <codigo> <texto>",
      "  admin codinome <codigo> <texto>",
      "  admin resumo <codigo> <texto>",
      "  admin visibilidade <codigo> public|private|hidden",
      "  admin prioridade <codigo> <numero>",
      "  admin url <codigo> <url>",
      "  admin alias add|rm <codigo> <alias>",
      "  admin tag add <codigo> <tag>",
      "  admin tag rm <codigo> <tag>",
      "  admin stack add|rm <codigo> <item>",
      "  admin next add|rm|list <codigo> [valor]",
      "  admin duplicar <codigo> <novo-id>",
      "  admin remover <codigo>",
      "  admin github <owner/repo> importa repo publico",
      "  admin cloudflare pages lista Pages ativos",
      "  admin cloudflare workers lista Workers ativos",
      "  admin cloudflare importar pages|workers <nome>",
      "  admin sincronizar   salva catalogo atual no D1",
      "  admin export        mostra JSON do catalogo local",
      "  admin copiar        copia JSON para clipboard",
      "  admin download      baixa JSON do catalogo",
      "  admin colar         importa JSON do clipboard",
      "  admin reset         restaura catalogo base",
      "  admin sair         encerra modo admin",
    ]);
  }

  function run(command, rawValue = command) {
    if (command === "admin") {
      enterAdminMode();
      return true;
    }

    if (command === "admin sair" || command === "admin exit") {
      exitAdminMode();
      return true;
    }

    if (command === "admin help" || command === "admin ?") {
      showHelp();
      return true;
    }

    if (command === "admin projetos" || command === "admin ls") {
      listProjects();
      return true;
    }

    if (command === "admin export") {
      exportCatalog();
      return true;
    }

    if (command === "admin copiar") {
      copyCatalog();
      return true;
    }

    if (command === "admin download") {
      downloadCatalog();
      return true;
    }

    if (command === "admin colar") {
      pasteCatalog();
      return true;
    }

    if (command === "admin reset") {
      resetCatalog();
      return true;
    }

    if (command === "admin sincronizar" || command === "admin sync") {
      persistCatalog("admin: catalogo atual sincronizado no D1.");
      return true;
    }

    if (command.startsWith("admin importar ")) {
      importCatalog(rawValue);
      return true;
    }

    if (command.startsWith("admin ver ")) {
      viewProject(command.replace("admin ver ", ""));
      return true;
    }

    if (command.startsWith("admin status ")) {
      const [, , query, ...statusParts] = rawValue.trim().split(/\s+/);
      updateProjectField(query, "status", statusParts.join(" "));
      return true;
    }

    if (command.startsWith("admin titulo ")) {
      updateTextCommand(rawValue, /^admin\s+titulo\s+/i, "title");
      return true;
    }

    if (command.startsWith("admin codinome ")) {
      updateCodename(rawValue);
      return true;
    }

    if (command.startsWith("admin resumo ")) {
      updateTextCommand(rawValue, /^admin\s+resumo\s+/i, "summary");
      return true;
    }

    if (command.startsWith("admin visibilidade ")) {
      const [, , query, visibility] = command.split(/\s+/);
      updateProjectField(query, "visibility", visibility);
      return true;
    }

    if (command.startsWith("admin prioridade ")) {
      const [, , query, priority] = command.split(/\s+/);
      updatePriority(query, priority);
      return true;
    }

    if (command.startsWith("admin url ")) {
      const [, , query, url] = rawValue.trim().split(/\s+/);
      updateProjectField(query, "url", url);
      return true;
    }

    if (command.startsWith("admin tag add ")) {
      const [, , , query, tag] = command.split(/\s+/);
      addTag(query, tag);
      return true;
    }

    if (command.startsWith("admin tag rm ")) {
      const [, , , query, tag] = command.split(/\s+/);
      removeTag(query, tag);
      return true;
    }

    if (command.startsWith("admin alias add ")) {
      const { query, token } = parseProjectToken(command, /^admin\s+alias\s+add\s+/i);
      updateAliases(query, token, "add");
      return true;
    }

    if (command.startsWith("admin alias rm ")) {
      const { query, token } = parseProjectToken(command, /^admin\s+alias\s+rm\s+/i);
      updateAliases(query, token, "rm");
      return true;
    }

    if (command.startsWith("admin stack add ")) {
      const { query, token } = parseProjectToken(rawValue, /^admin\s+stack\s+add\s+/i);
      updateStack(query, token, "add");
      return true;
    }

    if (command.startsWith("admin stack rm ")) {
      const { query, token } = parseProjectToken(rawValue, /^admin\s+stack\s+rm\s+/i);
      updateStack(query, token, "rm");
      return true;
    }

    if (command.startsWith("admin next add ")) {
      addNext(rawValue);
      return true;
    }

    if (command.startsWith("admin next rm ")) {
      const [, , , query, indexText] = command.split(/\s+/);
      removeNext(query, indexText);
      return true;
    }

    if (command.startsWith("admin next list ")) {
      listNext(command.replace("admin next list ", ""));
      return true;
    }

    if (command.startsWith("admin duplicar ")) {
      const [, , query, requestedId] = command.split(/\s+/);
      duplicateProject(query, requestedId);
      return true;
    }

    if (command.startsWith("admin remover ")) {
      removeProject(command.replace("admin remover ", ""));
      return true;
    }

    if (command.startsWith("admin github ")) {
      importGithubProject(rawValue.replace(/^admin\s+github\s+/i, ""));
      return true;
    }

    if (command === "admin cloudflare pages") {
      listCloudflare("pages");
      return true;
    }

    if (command === "admin cloudflare workers") {
      listCloudflare("workers");
      return true;
    }

    if (command.startsWith("admin cloudflare importar ")) {
      const [, , , type, ...queryParts] = rawValue.trim().split(/\s+/);
      importCloudflareProject(type, queryParts.join(" "));
      return true;
    }

    if (command.startsWith("admin ")) {
      ui.appendLine(`admin: comando nao reconhecido: ${command}`, "warning");
      ui.appendLine("digite admin help para consultar a interface.", "dim");
      return true;
    }

    return false;
  }

  return { run };
}

import {
  exportProjectCatalog,
  resetProjectCatalog,
  saveProjectCatalog,
} from "../data/catalog-storage.js";
import { importProjectFromGithub } from "./github-import.js";

export function createAdminCommands({ baseProjects, projects, terminal, ui, findProject }) {
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

  function persist(message = "catalogo salvo no navegador local.") {
    saveProjectCatalog(projects);
    ui.appendLine(message, "dim");
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
    project.updated = new Date().toISOString().slice(0, 10);
    persist(`admin: ${field} atualizado em ${project.id}.`);
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
    project.updated = new Date().toISOString().slice(0, 10);
    persist(`admin: tag adicionada em ${project.id}.`);
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
    project.updated = new Date().toISOString().slice(0, 10);
    persist(`admin: tag removida de ${project.id}.`);
  }

  function exportCatalog() {
    ui.clearOutput();
    ui.appendLine("admin/export:");
    ui.appendLine(exportProjectCatalog(projects));
  }

  function resetCatalog() {
    projects.splice(0, projects.length, ...structuredClone(baseProjects));
    resetProjectCatalog();
    ui.appendLine("admin: catalogo local restaurado para a base do repositorio.", "dim");
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

      persist(`admin/github: ${importedProject.id} importado.`);
      viewProject(importedProject.id);
    } catch (error) {
      ui.appendLine(`admin/github falhou: ${error.message}`, "warning");
      ui.appendLine("repositorios privados exigirao backend/token no proximo passo.", "dim");
    }
  }

  function showHelp() {
    ui.typeLines([
      "admin/comandos:",
      "  admin              entra no modo admin",
      "  admin projetos     lista catalogo administrativo",
      "  admin ver <codigo> mostra registro completo",
      "  admin status <codigo> <status>",
      "  admin visibilidade <codigo> public|private|hidden",
      "  admin prioridade <codigo> <numero>",
      "  admin url <codigo> <url>",
      "  admin tag add <codigo> <tag>",
      "  admin tag rm <codigo> <tag>",
      "  admin github <owner/repo> importa repo publico",
      "  admin export        mostra JSON do catalogo local",
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

    if (command === "admin reset") {
      resetCatalog();
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

    if (command.startsWith("admin github ")) {
      importGithubProject(rawValue.replace(/^admin\s+github\s+/i, ""));
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

import { projects as baseProjects } from "../data/projects.js";
import { loadRemoteProjectCatalog } from "../data/catalog-storage.js";
import { createCommandHandler } from "./commands.js";
import { getTerminalDom } from "./dom.js";
import { createSignalGlitch } from "./glitch.js";
import { createIdleController } from "./idle.js";
import { createMatrixRain } from "./matrix.js";
import { clearSession, loadSession, login } from "./session.js";
import { createTerminalUi } from "./ui.js";

const dom = getTerminalDom();
const ui = createTerminalUi(dom);
const projects = structuredClone(baseProjects);
projects.baseProjects = baseProjects;

let terminalReady = false;
let commandHistory = [];
let historyIndex = 0;

const terminal = {
  step: "user",
  user: "",
  authenticated: false,
  admin: false,
  screen: "main",
};

const matrix = createMatrixRain({
  canvas: dom.canvas,
  ctx: dom.ctx,
  onIntroComplete: revealTerminal,
});

const glitch = createSignalGlitch({
  scene: dom.scene,
  isReady: () => terminalReady,
});

const idle = createIdleController({
  glitch,
  isReady: () => terminalReady,
  matrix,
  scene: dom.scene,
  terminalInput: dom.terminalInput,
});

let commands = createCommandHandler({ projects, terminal, ui });

function replaceProjects(nextProjects) {
  projects.splice(0, projects.length, ...nextProjects);
  projects.baseProjects = baseProjects;
  commands = createCommandHandler({ projects, terminal, ui });
}

async function syncProjects() {
  replaceProjects(await loadRemoteProjectCatalog(baseProjects));
}

function markTerminalReady() {
  glitch.start();
  idle.reset();
}

function revealTerminal() {
  if (terminalReady) {
    return;
  }

  terminalReady = true;
  ui.revealPrompt(markTerminalReady);
}

async function restoreTerminalSession() {
  const user = await loadSession();

  if (!user) {
    return false;
  }

  await syncProjects();
  terminalReady = true;
  terminal.authenticated = true;
  terminal.step = "command";
  terminal.user = user.email;
  dom.canvas.classList.add("is-fading");
  dom.terminalForm.classList.remove("is-hidden");
  dom.terminalInput.disabled = false;
  ui.clearOutput();
  ui.appendLine("sessao restaurada.", "dim");
  ui.appendLine(`operador: ${terminal.user}`, "dim");
  ui.setPrompt(`${terminal.user}@gpg:~$`);
  markTerminalReady();
  return true;
}

async function handleLogin(value) {
  if (terminal.step === "user") {
    if (!value) {
      ui.appendLine("informe o operador.", "warning");
      ui.setPrompt("login:");
      return;
    }

    terminal.user = value;
    terminal.step = "password";
    ui.setPrompt("senha:", true);
    return;
  }

  dom.terminalInput.disabled = true;

  try {
    const user = await login(terminal.user, value);
    await syncProjects();
    terminal.authenticated = true;
    terminal.step = "command";
    terminal.user = user.email;
    await ui.typeLines([
      "acesso concedido.",
      `operador: ${terminal.user}`,
      "digite help para consultar o indice.",
    ]);
    ui.setPrompt(`${terminal.user}@gpg:~$`);
  } catch (error) {
    terminal.step = "user";
    terminal.user = "";
    ui.appendLine(`acesso negado: ${error.message}`, "warning");
    ui.setPrompt("login:");
  } finally {
    dom.terminalInput.disabled = false;
    dom.terminalInput.focus();
  }
}

async function logout() {
  terminal.authenticated = false;
  terminal.admin = false;
  terminal.step = "user";
  terminal.user = "";
  terminal.screen = "main";
  commands.clearCommandState();
  await clearSession();
  ui.clearOutput();
  ui.setPrompt("login:");
}

async function handleCommand(value) {
  const command = value.trim().toLowerCase();

  if (command === "logout" || command === "exit") {
    ui.appendLine(`${terminal.user}@gpg:~$ ${value}`, "command");
    await logout();
    return;
  }

  commands.run(value);
  ui.setPrompt(`${terminal.user}@gpg:~$`);
}

dom.terminalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  idle.reset();

  if (dom.terminalInput.disabled) {
    return;
  }

  const value = dom.terminalInput.value.trim();

  if (terminal.authenticated && value) {
    commandHistory.push(value);
    historyIndex = commandHistory.length;
  }

  if (!terminal.authenticated) {
    await handleLogin(value);
    return;
  }

  await handleCommand(value);
});

dom.terminalInput.addEventListener("keydown", (event) => {
  idle.reset();

  if (!terminal.authenticated || !commandHistory.length) {
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    historyIndex = Math.max(0, historyIndex - 1);
    dom.terminalInput.value = commandHistory[historyIndex] || "";
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    historyIndex = Math.min(commandHistory.length, historyIndex + 1);
    dom.terminalInput.value = commandHistory[historyIndex] || "";
  }
});

document.addEventListener("keydown", () => {
  if (idle.isIdle()) {
    idle.wake();
    return;
  }

  idle.reset();
});

document.addEventListener("pointerdown", idle.reset);

window.addEventListener("resize", () => {
  matrix.handleResize();

  if (!terminalReady) {
    matrix.startIntro();
  }
});

async function start() {
  matrix.handleResize();

  if (!(await restoreTerminalSession())) {
    matrix.startIntro();
  }
}

start();

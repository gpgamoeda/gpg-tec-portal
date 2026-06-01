import { projects as baseProjects } from "../data/projects.js";
import { loadProjectCatalog } from "../data/catalog-storage.js";
import { createCommandHandler } from "./commands.js";
import { getTerminalDom } from "./dom.js";
import { createSignalGlitch } from "./glitch.js";
import { createIdleController } from "./idle.js";
import { createMatrixRain } from "./matrix.js";
import { clearSession, loadSession, saveSession } from "./session.js";
import { createTerminalUi } from "./ui.js";

const dom = getTerminalDom();
const ui = createTerminalUi(dom);
const projects = loadProjectCatalog(baseProjects);
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

const commands = createCommandHandler({ projects, terminal, ui });

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

function restoreTerminalSession() {
  const session = loadSession();

  if (!session) {
    return false;
  }

  terminalReady = true;
  terminal.authenticated = true;
  terminal.step = "command";
  terminal.user = session.user;
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

function handleLogin(value) {
  if (terminal.step === "user") {
    terminal.user = value || "guest";
    terminal.step = "password";
    ui.setPrompt("senha:", true);
    return;
  }

  terminal.authenticated = true;
  terminal.step = "command";
  saveSession(terminal.user);
  ui.typeLines([
    "acesso concedido.",
    `operador: ${terminal.user}`,
    "digite help para consultar o indice.",
  ]);
  ui.setPrompt(`${terminal.user}@gpg:~$`);
}

function logout() {
  terminal.authenticated = false;
  terminal.admin = false;
  terminal.step = "user";
  terminal.user = "";
  terminal.screen = "main";
  commands.clearCommandState();
  clearSession();
  ui.clearOutput();
  ui.setPrompt("login:");
}

function handleCommand(value) {
  const command = value.trim().toLowerCase();

  if (command === "logout" || command === "exit") {
    ui.appendLine(`${terminal.user}@gpg:~$ ${value}`, "command");
    logout();
    return;
  }

  commands.run(value);
  ui.setPrompt(`${terminal.user}@gpg:~$`);
}

dom.terminalForm.addEventListener("submit", (event) => {
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
    handleLogin(value);
    return;
  }

  handleCommand(value);
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

matrix.handleResize();

if (!restoreTerminalSession()) {
  matrix.startIntro();
}

export function getTerminalDom() {
  const canvas = document.querySelector("#matrix-rain");

  return {
    canvas,
    ctx: canvas.getContext("2d"),
    scene: document.querySelector(".scene"),
    terminalOutput: document.querySelector("#terminal-output"),
    terminalForm: document.querySelector("#terminal-form"),
    terminalInput: document.querySelector("#terminal-command"),
    promptLabel: document.querySelector("#prompt-label"),
  };
}

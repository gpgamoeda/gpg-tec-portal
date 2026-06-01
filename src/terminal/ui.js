import { glyphs, prefersReducedMotion, timings } from "./config.js";

function randomGlyph() {
  return glyphs[Math.floor(Math.random() * glyphs.length)];
}

export function createTerminalUi({ terminalOutput, terminalForm, terminalInput, promptLabel }) {
  function appendLine(text = "", type = "system") {
    const line = document.createElement("p");
    line.className = `terminal-line ${type}`;
    line.textContent = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  function appendTypedLine(text = "", type = "system") {
    if (prefersReducedMotion || !text) {
      appendLine(text, type);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const line = document.createElement("p");
      let index = 0;

      line.className = `terminal-line ${type}`;
      terminalOutput.appendChild(line);

      const timer = window.setInterval(() => {
        line.textContent = text.slice(0, index + 1);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
        index += 1;

        if (index >= text.length) {
          window.clearInterval(timer);
          resolve();
        }
      }, 12);
    });
  }

  async function typeLines(lines, type = "system") {
    terminalInput.disabled = true;

    for (const line of lines) {
      await appendTypedLine(line, type);
    }

    terminalInput.disabled = false;
    terminalInput.focus();
  }

  function setPrompt(text, password = false) {
    promptLabel.textContent = text;
    terminalInput.type = password ? "password" : "text";
    terminalInput.value = "";
    terminalInput.focus();
  }

  function revealPrompt(onReady) {
    terminalForm.classList.remove("is-hidden");

    const finalText = "login:";
    const start = performance.now();
    const scrambleTimer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / timings.revealDuration);
      const fixedCount = Math.floor(progress * finalText.length);

      promptLabel.textContent = finalText
        .split("")
        .map((char, index) => (index < fixedCount ? char : randomGlyph()))
        .join("");

      if (progress >= 1) {
        window.clearInterval(scrambleTimer);
        promptLabel.textContent = finalText;
        terminalInput.disabled = false;
        terminalInput.focus();
        onReady();
      }
    }, 60);

    window.setTimeout(() => {
      window.clearInterval(scrambleTimer);
      promptLabel.textContent = finalText;
      terminalInput.disabled = false;
      terminalInput.focus();
      onReady();
    }, timings.revealDuration);
  }

  function clearOutput() {
    terminalOutput.textContent = "";
  }

  return {
    appendLine,
    appendTypedLine,
    clearOutput,
    revealPrompt,
    setPrompt,
    terminalOutput,
    terminalInput,
    typeLines,
  };
}

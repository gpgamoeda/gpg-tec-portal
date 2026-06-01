document.querySelector("[data-terminal-back]")?.addEventListener("click", (event) => {
  if (window.history.length <= 1) {
    return;
  }

  event.preventDefault();
  window.history.back();
});

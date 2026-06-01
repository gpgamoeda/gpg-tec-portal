import { prefersReducedMotion } from "./config.js";

export function createSignalGlitch({ scene, isReady }) {
  let glitchTimer;
  let enabled = false;

  function trigger() {
    if (!enabled || !isReady() || prefersReducedMotion) {
      schedule();
      return;
    }

    const direction = Math.random() > 0.5 ? 1 : -1;
    const intensity = 0.12 + Math.random() * 0.42;
    const duration = 150 + Math.random() * 320;
    const x = direction * (1 + Math.random() * 5);
    const y = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 2.5);

    scene.style.setProperty("--glitch-intensity", intensity.toFixed(2));
    scene.style.setProperty("--glitch-duration", `${Math.round(duration)}ms`);
    scene.style.setProperty("--glitch-x", `${x.toFixed(2)}px`);
    scene.style.setProperty("--glitch-y", `${y.toFixed(2)}px`);
    scene.classList.add("is-glitching");

    window.setTimeout(() => {
      scene.classList.remove("is-glitching");
      schedule();
    }, duration + 40);
  }

  function schedule() {
    if (!enabled || prefersReducedMotion) {
      return;
    }

    window.clearTimeout(glitchTimer);
    glitchTimer = window.setTimeout(trigger, 9000 + Math.random() * 18000);
  }

  function start() {
    if (enabled || prefersReducedMotion) {
      return;
    }

    enabled = true;
    window.clearTimeout(glitchTimer);
    glitchTimer = window.setTimeout(trigger, 6000 + Math.random() * 6000);
  }

  function pause() {
    window.clearTimeout(glitchTimer);
    scene.classList.remove("is-glitching");
  }

  return { pause, schedule, start };
}

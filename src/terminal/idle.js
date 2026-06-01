import { timings } from "./config.js";

export function createIdleController({ isReady, matrix, scene, terminalInput, glitch }) {
  let idleTimer;
  let idleRainActive = false;
  let wakingFromIdle = false;

  function reset() {
    window.clearTimeout(idleTimer);

    if (!isReady() || wakingFromIdle) {
      return;
    }

    idleTimer = window.setTimeout(startIdleRain, timings.idleDelay);
  }

  function startIdleRain() {
    if (!isReady() || idleRainActive || wakingFromIdle) {
      return;
    }

    idleRainActive = true;
    glitch.pause();
    scene.classList.add("is-idle");
    matrix.startIdle();
  }

  function wake() {
    if (!idleRainActive || wakingFromIdle) {
      reset();
      return;
    }

    wakingFromIdle = true;
    idleRainActive = false;

    matrix.stopIdleWithFade(() => {
      scene.classList.remove("is-idle");
      wakingFromIdle = false;
      terminalInput.focus();
      glitch.schedule();
      reset();
    });
  }

  function isIdle() {
    return idleRainActive;
  }

  return { isIdle, reset, wake };
}

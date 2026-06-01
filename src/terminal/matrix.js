import { glyphs, timings } from "./config.js";

function randomGlyph() {
  return glyphs[Math.floor(Math.random() * glyphs.length)];
}

export function createMatrixRain({ canvas, ctx, onIntroComplete }) {
  let columns = [];
  let fontSize = 18;
  let animationFrame;
  let startedAt = performance.now();
  let fadeTimer;
  let revealTimer;
  let idleRainActive = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    fontSize = window.innerWidth < 720 ? 15 : 18;
    const count = Math.ceil(window.innerWidth / fontSize);
    columns = Array.from({ length: count }, () => ({
      y: Math.random() * -window.innerHeight,
      speed: 0.7 + Math.random() * 1.65,
      glow: Math.random() > 0.76,
    }));

    clear();
  }

  function clear() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function drawColumns(intensity = 1, fadeProgress = 0) {
    ctx.font = `${fontSize}px "Share Tech Mono", Consolas, monospace`;

    columns.forEach((column, index) => {
      const x = index * fontSize;

      ctx.globalAlpha = intensity * (column.glow ? 0.9 : 0.68);
      ctx.fillStyle = column.glow ? "#e6ffef" : "#41ff7a";
      ctx.shadowColor = "#41ff7a";
      ctx.shadowBlur = intensity * (column.glow ? 12 : 4);
      ctx.fillText(randomGlyph(), x, column.y);

      column.y += fontSize * column.speed * (1 - fadeProgress * 0.58);
      if (column.y > window.innerHeight + Math.random() * 520) {
        column.y = Math.random() * -260;
        column.speed = 0.7 + Math.random() * 1.65;
        column.glow = Math.random() > 0.76;
      }
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawIntro(now = performance.now()) {
    const elapsed = now - startedAt;
    const fadeElapsed = Math.max(0, elapsed - timings.fadeStartTime);
    const fadeProgress = Math.min(1, fadeElapsed / timings.fadeDuration);
    const intensity = 1 - fadeProgress;

    ctx.fillStyle = fadeProgress > 0 ? "rgba(0, 0, 0, 0.22)" : "rgba(0, 0, 0, 0.34)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    if (intensity > 0) {
      drawColumns(intensity, fadeProgress);
    }

    if (fadeProgress < 1) {
      animationFrame = requestAnimationFrame(drawIntro);
      return;
    }

    finishIntro();
  }

  function finishIntro() {
    stop();
    clear();
    onIntroComplete();
  }

  function startIntro() {
    window.clearTimeout(fadeTimer);
    window.clearTimeout(revealTimer);
    stop();
    resize();
    canvas.classList.remove("is-fading");
    startedAt = performance.now();

    fadeTimer = window.setTimeout(() => {
      canvas.classList.add("is-fading");
    }, timings.fadeStartTime);

    revealTimer = window.setTimeout(finishIntro, timings.rainDuration);
    drawIntro();
  }

  function drawIdle() {
    if (!idleRainActive) {
      return;
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    drawColumns(0.9, 0);
    animationFrame = requestAnimationFrame(drawIdle);
  }

  function startIdle() {
    idleRainActive = true;
    stop();
    canvas.classList.remove("is-fading");
    resize();
    drawIdle();
  }

  function stopIdleWithFade(onDone) {
    idleRainActive = false;
    stop();
    canvas.classList.add("is-fading");

    window.setTimeout(() => {
      clear();
      onDone();
    }, timings.idleFadeDuration);
  }

  function stop() {
    window.cancelAnimationFrame(animationFrame);
  }

  function handleResize() {
    stop();
    resize();

    if (idleRainActive) {
      drawIdle();
    }
  }

  return {
    clear,
    handleResize,
    startIdle,
    startIntro,
    stop,
    stopIdleWithFade,
  };
}

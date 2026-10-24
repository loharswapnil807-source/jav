const PARTICLE_COUNT = 42;
const TAU = Math.PI * 2;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hexToRgba(color, alpha) {
  if (typeof color !== 'string' || !color.startsWith('#')) {
    return color;
  }

  const hex = color.slice(1);
  const normalized = hex.length === 3
    ? hex.split('').map((character) => `${character}${character}`).join('')
    : hex;
  if (normalized.length !== 6) {
    return color;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function safeGradient(createGradient, fallback, stops) {
  try {
    const gradient = createGradient();
    if (gradient && typeof gradient.addColorStop === 'function') {
      for (const [offset, color] of stops) {
        gradient.addColorStop(offset, color);
      }
      return gradient;
    }
  } catch {
    // A reduced test canvas can omit gradient support.
  }
  return fallback;
}

function seededValue(index, salt = 0) {
  const value = Math.sin(index * 91.17 + salt * 17.31) * 43758.5453;
  return value - Math.floor(value);
}

function makeParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
    x: seededValue(index, 1),
    y: seededValue(index, 2),
    depth: 0.28 + seededValue(index, 3) * 0.72,
    size: 0.5 + seededValue(index, 4) * 1.8,
    phase: seededValue(index, 5) * TAU,
  }));
}

export function createReactorScene({ canvas, getSnapshot, getTheme }) {
  const context = canvas?.getContext?.('2d');
  if (!context) {
    throw new Error('A 2D canvas context is required to create the reactor scene.');
  }

  const particles = makeParticles();
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let width = 640;
  let height = 480;
  let devicePixelRatio = 1;
  let time = 0;
  let lastTimestamp = 0;
  let frameId = null;
  let running = true;

  function resize() {
    const bounds = canvas.getBoundingClientRect?.() ?? {};
    width = Math.max(1, Number(bounds.width) || Number(canvas.clientWidth) || 640);
    height = Math.max(1, Number(bounds.height) || Number(canvas.clientHeight) || 480);
    devicePixelRatio = Math.min(2, Number(globalThis.devicePixelRatio) || 1);
    canvas.width = Math.round(width * devicePixelRatio);
    canvas.height = Math.round(height * devicePixelRatio);
    draw(lastTimestamp || 0);
  }

  function setPointer(x, y) {
    pointer.targetX = clamp(Number(x) || 0, -1, 1);
    pointer.targetY = clamp(Number(y) || 0, -1, 1);
  }

  function drawGrid(colors, cameraX) {
    const horizon = height * 0.69;
    context.save();
    context.strokeStyle = colors.grid;
    context.lineWidth = 1;

    for (let line = 0; line < 13; line += 1) {
      const progress = line / 12;
      const y = horizon + (height - horizon) * (progress ** 1.8);
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    for (let column = -12; column <= 12; column += 1) {
      const topX = width / 2 + column * width * 0.055 + cameraX * 0.22;
      const bottomX = width / 2 + column * width * 0.22 + cameraX;
      context.beginPath();
      context.moveTo(topX, horizon);
      context.lineTo(bottomX, height);
      context.stroke();
    }
    context.restore();
  }

  function drawParticles(colors, cameraX, cameraY, motionTime, reducedMotion) {
    context.save();
    context.fillStyle = colors.accent;
    context.globalAlpha = reducedMotion ? 0.22 : 0.34;
    for (const particle of particles) {
      const drift = reducedMotion ? 0 : Math.sin(motionTime * 0.22 + particle.phase) * 0.012;
      const x = particle.x * width + cameraX * particle.depth * 0.7;
      const y = (particle.y + drift) * height + cameraY * particle.depth * 0.7;
      const size = particle.size * particle.depth;
      context.globalAlpha = (0.08 + particle.depth * 0.36) * (reducedMotion ? 0.5 : 1);
      context.fillRect(x, y, size, size);
    }
    context.restore();
  }

  function drawOrbitNode(colors, centerX, centerY, x, y, radius, labelAngle) {
    context.save();
    context.strokeStyle = hexToRgba(colors.accent, 0.18);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(x, y);
    context.stroke();

    context.fillStyle = safeGradient(
      () => context.createRadialGradient(x, y, 0, x, y, radius * 2.8),
      colors.accent,
      [[0, colors.ink], [0.22, colors.accent], [1, hexToRgba(colors.accent, 0)]],
    );
    context.beginPath();
    context.arc(x, y, radius * 2.8, 0, TAU);
    context.fill();

    context.fillStyle = colors.ink;
    context.beginPath();
    context.arc(x, y, radius * 0.42, 0, TAU);
    context.fill();

    context.strokeStyle = colors.accent;
    context.globalAlpha = 0.7;
    context.beginPath();
    context.arc(x, y, radius * 1.5, labelAngle, labelAngle + Math.PI * 1.3);
    context.stroke();
    context.restore();
  }

  function drawCore(colors, centerX, centerY, radius, motionTime, reducedMotion) {
    const pulse = reducedMotion ? 1 : 1 + Math.sin(motionTime * 1.5) * 0.025;
    const coreRadius = radius * pulse;
    const glow = safeGradient(
      () => context.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 2.5),
      colors.accent,
      [[0, hexToRgba(colors.ink, 0.95)], [0.24, hexToRgba(colors.accent, 0.7)], [0.72, hexToRgba(colors.accent, 0.12)], [1, hexToRgba(colors.accent, 0)]],
    );

    context.save();
    context.globalCompositeOperation = 'screen';
    context.fillStyle = glow;
    context.beginPath();
    context.arc(centerX, centerY, coreRadius * 2.5, 0, TAU);
    context.fill();
    context.globalCompositeOperation = 'source-over';

    for (let ring = 0; ring < 5; ring += 1) {
      const ringProgress = ring / 5;
      context.save();
      context.translate(centerX, centerY);
      context.rotate(motionTime * (ring % 2 === 0 ? 0.08 : -0.06) + ringProgress * Math.PI);
      context.strokeStyle = ring === 0 ? colors.lineStrong : hexToRgba(colors.accent, 0.28 - ringProgress * 0.03);
      context.lineWidth = ring === 0 ? 1.5 : 1;
      context.setLineDash(ring === 0 ? [] : [radius * 0.12, radius * (0.1 + ringProgress * 0.08)]);
      context.beginPath();
      context.ellipse(0, 0, radius * (1.12 + ringProgress * 0.32), radius * (0.72 + ringProgress * 0.18), ringProgress * 0.45, 0, TAU);
      context.stroke();
      context.restore();
    }

    context.fillStyle = safeGradient(
      () => context.createRadialGradient(centerX - coreRadius * 0.3, centerY - coreRadius * 0.4, 0, centerX, centerY, coreRadius),
      colors.accent,
      [[0, colors.ink], [0.2, colors.accent], [0.6, colors.accentStrong], [1, colors.surfaceDeep]],
    );
    context.beginPath();
    context.arc(centerX, centerY, coreRadius, 0, TAU);
    context.fill();

    context.strokeStyle = colors.lineStrong;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(centerX, centerY, coreRadius * 0.75, -Math.PI * 0.72, Math.PI * 0.52);
    context.stroke();
    context.restore();
  }

  function draw(timestamp) {
    const snapshot = getSnapshot?.() ?? {};
    const theme = getTheme?.() ?? {};
    const themeVariables = theme.variables ?? {};
    const colors = {
      surface: themeVariables.surface ?? '#080b0e',
      surfaceDeep: themeVariables['surface-deep'] ?? '#050608',
      ink: themeVariables.ink ?? '#f1eee6',
      accent: themeVariables.accent ?? '#8ef4ff',
      accentStrong: themeVariables['accent-strong'] ?? '#34dbe8',
      line: themeVariables.line ?? 'rgba(255,255,255,0.15)',
      lineStrong: themeVariables['line-strong'] ?? 'rgba(255,255,255,0.35)',
      grid: themeVariables.grid ?? 'rgba(142,244,255,0.08)',
      glow: themeVariables.glow ?? 'rgba(63,222,237,0.28)',
    };
    const reducedMotion = Boolean(snapshot.reducedMotion);
    const timestampSeconds = Number(timestamp) / 1000;
    if (!reducedMotion && lastTimestamp) {
      time += clamp((Number(timestamp) - lastTimestamp) / 1000, 0, 0.05);
    }
    lastTimestamp = Number(timestamp) || lastTimestamp;
    pointer.x += (pointer.targetX - pointer.x) * (reducedMotion ? 1 : 0.08);
    pointer.y += (pointer.targetY - pointer.y) * (reducedMotion ? 1 : 0.08);

    context.setTransform?.(1, 0, 0, 1, 0, 0);
    context.clearRect?.(0, 0, canvas.width, canvas.height);
    context.scale?.(devicePixelRatio, devicePixelRatio);

    const background = safeGradient(
      () => context.createRadialGradient(width * 0.5, height * 0.43, 0, width * 0.5, height * 0.45, Math.max(width, height) * 0.68),
      colors.surface,
      [[0, colors.glow], [0.33, colors.surface], [1, colors.surfaceDeep]],
    );
    context.fillStyle = background;
    context.fillRect?.(0, 0, width, height);

    const cameraX = pointer.x * Math.min(width, height) * 0.04;
    const cameraY = pointer.y * Math.min(width, height) * 0.025;
    drawParticles(colors, cameraX, cameraY, reducedMotion ? 0 : time, reducedMotion);
    drawGrid(colors, cameraX);

    const centerX = width * 0.5 + cameraX;
    const centerY = height * 0.43 + cameraY;
    const coreRadius = Math.max(42, Math.min(width, height) * 0.125);
    drawCore(colors, centerX, centerY, coreRadius, reducedMotion ? 0 : time, reducedMotion);

    const orbitRadius = coreRadius * 2.05;
    for (let node = 0; node < 5; node += 1) {
      const orbitAngle = (node / 5) * TAU + (reducedMotion ? 0.3 : time * (node % 2 === 0 ? 0.12 : -0.09));
      const nodeX = centerX + Math.cos(orbitAngle) * orbitRadius;
      const nodeY = centerY + Math.sin(orbitAngle) * orbitRadius * 0.58;
      drawOrbitNode(colors, centerX, centerY, nodeX, nodeY, Math.max(2.3, coreRadius * 0.055), orbitAngle + Math.PI / 2);
    }

    context.save();
    context.globalAlpha = 0.35;
    context.strokeStyle = colors.line;
    context.setLineDash([2, 9]);
    context.beginPath();
    context.arc(centerX, centerY, orbitRadius * 1.25, 0, TAU);
    context.stroke();
    context.restore();

    // Keep a stable timestamp reference in reduced-motion mode for deterministic testing.
    void timestampSeconds;
  }

  function schedule() {
    if (!running || frameId !== null || typeof globalThis.requestAnimationFrame !== 'function') {
      return;
    }
    frameId = globalThis.requestAnimationFrame((timestamp) => {
      frameId = null;
      draw(timestamp);
      schedule();
    });
  }

  function pause() {
    running = false;
    if (frameId !== null && typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function resume() {
    running = true;
    schedule();
  }

  const resizeObserver = typeof globalThis.ResizeObserver === 'function'
    ? new globalThis.ResizeObserver(resize)
    : null;
  resizeObserver?.observe(canvas);
  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('resize', resize, { passive: true });
  }
  resize();
  schedule();

  return {
    resize,
    setPointer,
    pause,
    resume,
    destroy() {
      pause();
      resizeObserver?.disconnect();
      if (typeof globalThis.removeEventListener === 'function') {
        globalThis.removeEventListener('resize', resize);
      }
    },
  };
}

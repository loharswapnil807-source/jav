import { applyTheme, getTheme, THEMES } from './theme.js';

const MODULES = Object.freeze([
  Object.freeze({
    id: 'core',
    index: '01',
    label: 'CORE / APERTURE',
    title: 'Aperture control',
    summary: 'Primary energy lens stabilized across the command envelope.',
    health: 98,
    delta: '+0.08%',
    mode: 'Nominal',
    note: 'All systems holding at nominal aperture.',
  }),
  Object.freeze({
    id: 'sentinel',
    index: '02',
    label: 'SENTINEL / PERIMETER',
    title: 'Perimeter watch',
    summary: 'Outer ring telemetry is reading clean across all active sectors.',
    health: 94,
    delta: '+0.14%',
    mode: 'Scanning',
    note: 'Perimeter sweep complete. No external variance detected.',
  }),
  Object.freeze({
    id: 'orbital',
    index: '03',
    label: 'ORBITAL / TRAJECTORY',
    title: 'Trajectory mesh',
    summary: 'Orbital paths are nested and holding the predicted vector.',
    health: 87,
    delta: '-0.04%',
    mode: 'Tracking',
    note: 'Trajectory mesh is holding a clean predictive lock.',
  }),
  Object.freeze({
    id: 'archive',
    index: '04',
    label: 'ARCHIVE / MEMORY',
    title: 'Memory lattice',
    summary: 'Local command history is indexed and ready for a clean handoff.',
    health: 100,
    delta: '+0.00%',
    mode: 'Ready',
    note: 'Memory lattice is sealed and ready for operator handoff.',
  }),
]);

const SIGNALS = Object.freeze({
  booting: Object.freeze({
    label: 'Synchronizing surface',
    state: 'Boot sequence',
    stage: 'Calibrating lens',
    note: 'Establishing the local bridge signal.',
    tone: 'booting',
    strength: '—58 dB',
    dialog: '—58 dB / calibrating',
  }),
  online: Object.freeze({
    label: 'Systems online',
    state: 'Nominal',
    stage: 'Live telemetry',
    note: 'All systems holding at nominal aperture.',
    tone: 'online',
    strength: '—42 dB',
    dialog: '—42 dB / clean',
  }),
  standby: Object.freeze({
    label: 'Sentinel standby',
    state: 'Standby',
    stage: 'Reduced telemetry',
    note: 'One subsystem has moved to standby; bridge remains available.',
    tone: 'standby',
    strength: '—49 dB',
    dialog: '—49 dB / standby',
  }),
  interrupted: Object.freeze({
    label: 'Signal interrupted',
    state: 'Interrupted',
    stage: 'Signal attention',
    note: 'Signal interrupted. Run a local check to restore the bridge.',
    tone: 'interrupted',
    strength: '—71 dB',
    dialog: '—71 dB / interrupted',
  }),
});

const FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function findModule(moduleId) {
  return MODULES.find((module) => module.id === moduleId) ?? MODULES[0];
}

function getSignal(signalState) {
  return SIGNALS[signalState] ?? SIGNALS.booting;
}

function addListener(cleanups, target, eventName, handler, options) {
  target?.addEventListener?.(eventName, handler, options);
  cleanups.push(() => target?.removeEventListener?.(eventName, handler, options));
}

export function mountBridgeUI({ root, state, scene }) {
  const doc = root?.ownerDocument ?? globalThis.document;
  if (!doc || !state) {
    return { destroy() {} };
  }

  const app = doc.querySelector('#command-bridge');
  const dialog = doc.querySelector('#bridge-dialog');
  const dialogHeading = doc.querySelector('#bridge-dialog-title');
  const stage = doc.querySelector('#stage-shell');
  const cleanups = [];
  let lastTrigger = null;
  let bootTimer = null;
  let coordinateTimer = null;

  if (!app || !dialog) {
    return { destroy() {} };
  }

  if (dialogHeading) {
    dialogHeading.tabIndex = -1;
  }

  function setText(selector, value) {
    const element = doc.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  }

  function setHealth(module) {
    setText('[data-health-value]', `${module.health}%`);
    setText('[data-health-delta]', module.delta);
    setText('[data-dialog-health]', `${module.health}%`);
    for (const bar of doc.querySelectorAll('[data-health-bar], [data-dialog-health-bar]')) {
      bar.style.setProperty('--health', `${module.health}%`);
    }
    const meter = doc.querySelector('.health-meter');
    meter?.setAttribute('aria-label', `System integrity ${module.health} percent`);
  }

  function renderModule(snapshot) {
    const module = findModule(snapshot.activeModuleId);
    setText('[data-module-index]', module.index);
    setText('[data-module-label]', module.label);
    setText('[data-module-title]', module.title);
    setText('[data-module-summary]', module.summary);
    setText('[data-dialog-module-index]', module.index);
    setText('[data-dialog-module-title]', module.title);
    setText('[data-dialog-module-label]', module.label);
    setText('[data-dialog-module-summary]', module.summary);
    setText('[data-telemetry-note]', module.note);
    setHealth(module);
    app.dataset.module = module.id;

    for (const button of doc.querySelectorAll('[data-module-id]')) {
      const isActive = button.dataset.moduleId === module.id;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }
  }

  function renderThemes(snapshot) {
    applyTheme(root, snapshot.themeId);
    for (const button of doc.querySelectorAll('[data-theme-id]')) {
      const isActive = button.dataset.themeId === snapshot.themeId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
      const theme = THEMES[button.dataset.themeId];
      if (theme) {
        button.title = theme.description;
      }
    }
  }

  function renderSignal(snapshot) {
    const signal = getSignal(snapshot.signalState);
    // Keep the root state marker distinct from the text binding selector below.
    // Using data-signal-state here would make querySelector('[data-signal-state]')
    // match the entire <main> and replace the bridge DOM with the status label.
    app.dataset.signalTone = signal.tone;
    setText('[data-signal-label]', signal.label);
    setText('[data-signal-state]', signal.state);
    setText('[data-stage-status]', signal.stage);
    setText('[data-telemetry-note]', signal.note);
    setText('[data-signal-strength]', signal.strength);
    setText('[data-dialog-signal]', signal.dialog);
  }

  function focusDialogHeading() {
    globalThis.queueMicrotask?.(() => dialogHeading?.focus?.());
  }

  function openDialog() {
    if (dialog.open) {
      return;
    }
    try {
      dialog.showModal?.();
    } catch {
      dialog.setAttribute('open', '');
    }
    dialog.setAttribute('aria-modal', 'true');
    root.classList.add('modal-open');
    doc.body?.classList.add('modal-open');
    focusDialogHeading();
  }

  function closeDialog({ restoreFocus = true } = {}) {
    if (dialog.open && typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    dialog.removeAttribute('aria-modal');
    root.classList.remove('modal-open');
    doc.body?.classList.remove('modal-open');
    if (restoreFocus) {
      lastTrigger?.focus?.();
    }
    lastTrigger = null;
  }

  function renderModal(snapshot) {
    const trigger = doc.querySelector('[data-action="open-dialog"]');
    trigger?.setAttribute('aria-expanded', String(snapshot.modalOpen));
    if (snapshot.modalOpen) {
      openDialog();
    } else {
      closeDialog();
    }
  }

  function render(snapshot) {
    renderThemes(snapshot);
    renderModule(snapshot);
    renderSignal(snapshot);
    renderModal(snapshot);
  }

  function cycleSignal() {
    const currentSignal = state.getSnapshot().signalState;
    const nextSignal = currentSignal === 'online'
      ? 'standby'
      : currentSignal === 'standby'
        ? 'interrupted'
        : 'booting';
    state.setSignalState(nextSignal);
    if (bootTimer) {
      globalThis.clearTimeout?.(bootTimer);
      bootTimer = null;
    }
    if (nextSignal === 'booting') {
      bootTimer = globalThis.setTimeout?.(() => {
        state.setSignalState('online');
        bootTimer = null;
      }, 720);
    }
  }

  function handleKeydown(event) {
    if (!state.getSnapshot().modalOpen) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      state.closeBridge();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)];
    if (!focusable.length) {
      event.preventDefault();
      dialogHeading?.focus?.();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleDialogCancel(event) {
    event.preventDefault();
    state.closeBridge();
  }

  function handleDialogClick(event) {
    if (event.target === dialog) {
      state.closeBridge();
    }
  }

  for (const button of doc.querySelectorAll('[data-theme-id]')) {
    addListener(cleanups, button, 'click', () => state.setTheme(button.dataset.themeId));
  }
  for (const button of doc.querySelectorAll('[data-module-id]')) {
    addListener(cleanups, button, 'click', () => state.selectModule(button.dataset.moduleId));
  }
  for (const button of doc.querySelectorAll('[data-action="open-dialog"]')) {
    addListener(cleanups, button, 'click', () => {
      lastTrigger = button;
      state.openBridge();
    });
  }
  for (const button of doc.querySelectorAll('[data-action="close-dialog"]')) {
    addListener(cleanups, button, 'click', () => state.closeBridge());
  }
  for (const button of doc.querySelectorAll('[data-action="signal-check"]')) {
    addListener(cleanups, button, 'click', cycleSignal);
  }
  for (const card of doc.querySelectorAll('[data-command]')) {
    addListener(cleanups, card, 'click', () => {
      card.classList.add('is-complete');
      setText('[data-telemetry-note]', `${card.querySelector('strong')?.textContent ?? 'Command'} queued locally.`);
      globalThis.setTimeout?.(() => card.classList.remove('is-complete'), 820);
    });
  }

  addListener(cleanups, doc, 'keydown', handleKeydown);
  addListener(cleanups, dialog, 'cancel', handleDialogCancel);
  addListener(cleanups, dialog, 'click', handleDialogClick);

  if (stage && scene) {
    addListener(cleanups, stage, 'pointermove', (event) => {
      const bounds = stage.getBoundingClientRect();
      scene.setPointer(((event.clientX - bounds.left) / bounds.width) * 2 - 1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1);
    });
    addListener(cleanups, stage, 'pointerleave', () => scene.setPointer(0, 0));
  }

  const unsubscribe = state.subscribe(render);
  cleanups.push(unsubscribe);
  render(state.getSnapshot());

  if (state.getSnapshot().signalState === 'booting') {
    bootTimer = globalThis.setTimeout?.(() => {
      state.setSignalState('online');
      bootTimer = null;
    }, 980);
  }

  coordinateTimer = globalThis.setInterval?.(() => {
    const seconds = Math.floor(Date.now() / 1000);
    const azimuth = ((seconds % 3600) / 3600) * 28 - 14;
    setText('[data-coordinate]', `00° ${String(Math.floor(Math.abs(azimuth))).padStart(2, '0')}′ ${String(seconds % 60).padStart(2, '0')}″`);
    setText('[data-azimuth]', `${azimuth >= 0 ? '+' : '−'}${Math.abs(azimuth).toFixed(1)}°`);
  }, 1200);

  return {
    destroy() {
      for (const cleanup of cleanups.splice(0)) {
        cleanup?.();
      }
      if (bootTimer) {
        globalThis.clearTimeout?.(bootTimer);
      }
      if (coordinateTimer) {
        globalThis.clearInterval?.(coordinateTimer);
      }
      closeDialog({ restoreFocus: false });
    },
  };
}

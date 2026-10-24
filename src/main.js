import { createBridgeState } from './state.js';
import { applyTheme, getStoredThemeId, getTheme } from './theme.js';
import { createReactorScene } from './scene.js';
import { mountBridgeUI } from './ui.js';

const documentRoot = globalThis.document?.documentElement;
const canvas = globalThis.document?.querySelector('#reactor-canvas');

if (documentRoot) {
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const state = createBridgeState({
    themeId: getStoredThemeId(),
    reducedMotion,
    signalState: 'booting',
  });

  applyTheme(documentRoot, state.getSnapshot().themeId);
  let scene = {
    pause() {},
    resume() {},
    setPointer() {},
    destroy() {},
  };

  if (canvas) {
    try {
      scene = createReactorScene({
        canvas,
        getSnapshot: state.getSnapshot,
        getTheme: () => getTheme(state.getSnapshot().themeId),
      });
      documentRoot.dataset.sceneState = 'ready';
    } catch (error) {
      documentRoot.dataset.sceneState = 'fallback';
      globalThis.console?.error?.('JARVIS reactor scene unavailable; using the static bridge surface.', error);
    }
  } else {
    documentRoot.dataset.sceneState = 'fallback';
  }

  const ui = mountBridgeUI({ root: documentRoot, state, scene });
  documentRoot.dataset.appReady = 'true';

  const handleVisibility = () => {
    if (globalThis.document.hidden) {
      scene.pause();
    } else {
      scene.resume();
    }
  };
  globalThis.document.addEventListener('visibilitychange', handleVisibility);

  globalThis.addEventListener?.('beforeunload', () => {
    globalThis.document.removeEventListener('visibilitychange', handleVisibility);
    ui.destroy();
    scene.destroy();
  }, { once: true });
}

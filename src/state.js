import { getStoredThemeId, getTheme, persistThemeId } from './theme.js';

const DEFAULT_STATE = Object.freeze({
  themeId: 'obsidian-arc',
  activeModuleId: 'core',
  modalOpen: false,
  signalState: 'booting',
  reducedMotion: false,
});

export function createBridgeState(initialState = {}) {
  const initialThemeId = getTheme(initialState.themeId ?? getStoredThemeId()).id;
  let snapshot = Object.freeze({
    ...DEFAULT_STATE,
    ...initialState,
    themeId: initialThemeId,
    reducedMotion: Boolean(initialState.reducedMotion ?? DEFAULT_STATE.reducedMotion),
  });
  const listeners = new Set();

  function notify() {
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function update(patch) {
    snapshot = Object.freeze({ ...snapshot, ...patch });
    notify();
    return snapshot;
  }

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setTheme(themeId) {
      const nextThemeId = getTheme(themeId).id;
      persistThemeId(nextThemeId);
      return update({ themeId: nextThemeId });
    },
    selectModule(activeModuleId) {
      return update({ activeModuleId });
    },
    openBridge() {
      return update({ modalOpen: true });
    },
    closeBridge() {
      return update({ modalOpen: false });
    },
    setSignalState(signalState) {
      return update({ signalState });
    },
  };
}

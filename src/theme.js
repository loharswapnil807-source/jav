const THEME_VARIABLES = Object.freeze([
  'surface',
  'surface-raised',
  'surface-deep',
  'panel',
  'ink',
  'muted',
  'subtle',
  'accent',
  'accent-strong',
  'accent-soft',
  'accent-warm',
  'line',
  'line-strong',
  'grid',
  'glow',
  'shadow',
  'alert',
]);

export const DEFAULT_THEME_ID = 'obsidian-arc';

export const THEMES = Object.freeze({
  'obsidian-arc': Object.freeze({
    id: 'obsidian-arc',
    label: 'Obsidian Arc',
    description: 'Graphite, warm titanium, and a quiet arc-reactor cyan.',
    variables: Object.freeze({
      surface: '#080b0e',
      'surface-raised': '#0d1216',
      'surface-deep': '#050608',
      panel: '#12191e',
      ink: '#f1eee6',
      muted: '#9da9ad',
      subtle: '#66747a',
      accent: '#8ef4ff',
      'accent-strong': '#34dbe8',
      'accent-soft': 'rgba(142, 244, 255, 0.16)',
      'accent-warm': '#d7c6a5',
      line: 'rgba(194, 211, 215, 0.15)',
      'line-strong': 'rgba(220, 234, 232, 0.36)',
      grid: 'rgba(142, 244, 255, 0.08)',
      glow: 'rgba(63, 222, 237, 0.28)',
      shadow: 'rgba(0, 0, 0, 0.46)',
      alert: '#ffad80',
    }),
  }),
  'pearl-alloy': Object.freeze({
    id: 'pearl-alloy',
    label: 'Pearl Alloy',
    description: 'Porcelain, brushed silver, ink, and a restrained cyan edge.',
    variables: Object.freeze({
      surface: '#e8e6df',
      'surface-raised': '#f4f2ec',
      'surface-deep': '#d5d4cd',
      panel: '#efeee8',
      ink: '#172126',
      muted: '#58666b',
      subtle: '#77858a',
      accent: '#157f8b',
      'accent-strong': '#0b606b',
      'accent-soft': 'rgba(21, 127, 139, 0.13)',
      'accent-warm': '#9d7049',
      line: 'rgba(23, 33, 38, 0.16)',
      'line-strong': 'rgba(23, 33, 38, 0.38)',
      grid: 'rgba(21, 127, 139, 0.12)',
      glow: 'rgba(21, 127, 139, 0.18)',
      shadow: 'rgba(30, 38, 40, 0.2)',
      alert: '#a5563c',
    }),
  }),
  'cobalt-night': Object.freeze({
    id: 'cobalt-night',
    label: 'Cobalt Night',
    description: 'Midnight blue, electric cobalt, and pale ice telemetry.',
    variables: Object.freeze({
      surface: '#060b18',
      'surface-raised': '#0b1426',
      'surface-deep': '#030610',
      panel: '#101c32',
      ink: '#edf4ff',
      muted: '#8e9fb8',
      subtle: '#5a6c89',
      accent: '#6ea8ff',
      'accent-strong': '#347ee8',
      'accent-soft': 'rgba(110, 168, 255, 0.16)',
      'accent-warm': '#b9c9e1',
      line: 'rgba(178, 207, 255, 0.16)',
      'line-strong': 'rgba(205, 225, 255, 0.4)',
      grid: 'rgba(110, 168, 255, 0.1)',
      glow: 'rgba(70, 135, 240, 0.3)',
      shadow: 'rgba(0, 4, 15, 0.58)',
      alert: '#ffb384',
    }),
  }),
  'ember-copper': Object.freeze({
    id: 'ember-copper',
    label: 'Ember Copper',
    description: 'Smoked black, copper, ember orange, and champagne highlights.',
    variables: Object.freeze({
      surface: '#100b09',
      'surface-raised': '#1b120e',
      'surface-deep': '#080504',
      panel: '#211612',
      ink: '#fff2df',
      muted: '#b9a495',
      subtle: '#7f6c60',
      accent: '#f0a46d',
      'accent-strong': '#d86d36',
      'accent-soft': 'rgba(240, 164, 109, 0.16)',
      'accent-warm': '#f1d09a',
      line: 'rgba(255, 226, 199, 0.16)',
      'line-strong': 'rgba(255, 236, 216, 0.4)',
      grid: 'rgba(240, 164, 109, 0.1)',
      glow: 'rgba(216, 109, 54, 0.3)',
      shadow: 'rgba(10, 3, 0, 0.58)',
      alert: '#ff8e71',
    }),
  }),
});

function toCssVariableName(name) {
  return `--${name}`;
}

export function getTheme(themeId = DEFAULT_THEME_ID) {
  return THEMES[themeId] ?? THEMES[DEFAULT_THEME_ID];
}

export function getStoredThemeId() {
  try {
    const storedThemeId = globalThis.localStorage?.getItem('jarvis-theme');
    return THEMES[storedThemeId] ? storedThemeId : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function persistThemeId(themeId) {
  try {
    globalThis.localStorage?.setItem('jarvis-theme', getTheme(themeId).id);
  } catch {
    // Storage can be unavailable in privacy modes and server-side tests.
  }
}

export function applyTheme(root, themeId = DEFAULT_THEME_ID) {
  const theme = getTheme(themeId);
  if (!root) {
    return theme;
  }

  root.dataset.theme = theme.id;
  for (const variableName of THEME_VARIABLES) {
    const value = theme.variables[variableName];
    if (value) {
      root.style.setProperty(toCssVariableName(variableName), value);
    }
  }

  return theme;
}

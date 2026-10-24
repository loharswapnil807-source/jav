import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_THEME_ID, THEMES, getTheme } from '../src/theme.js';
import { createBridgeState } from '../src/state.js';
import { createReactorScene } from '../src/scene.js';
import { mountBridgeUI } from '../src/ui.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const requiredFiles = [
  'package.json',
  'package-lock.json',
  '.nvmrc',
  'Makefile',
  'Dockerfile',
  '.dockerignore',
  'server.mjs',
  'index.html',
  'scripts/test-jarvis.mjs',
  'README.md',
];

for (const relativePath of requiredFiles) {
  assert.ok(existsSync(join(root, relativePath)), `missing ${relativePath}`);
}

const html = readFileSync(join(root, 'index.html'), 'utf8');
assert.match(html, /<main\b/i, 'index.html must contain a main landmark');
assert.match(html, /reactor-canvas|stage-shell/i, 'index.html must contain the stage hook');
assert.match(html, /bridge-dialog|command-dialog/i, 'index.html must contain the dialog hook');
assert.match(html, /reactor-fallback/, 'index.html must contain a static reactor fallback');
assert.match(html, /20261023-full/, 'index.html must version browser assets after a visual rebuild');

const themeIds = ['obsidian-arc', 'pearl-alloy', 'cobalt-night', 'ember-copper'];
assert.deepEqual(Object.keys(THEMES), themeIds, 'theme IDs must stay stable');
for (const themeId of themeIds) {
  const theme = getTheme(themeId);
  assert.ok(theme.label && theme.description, `${themeId} needs label and description`);
  assert.ok(theme.variables.surface, `${themeId} needs a surface token`);
  assert.ok(theme.variables.ink, `${themeId} needs an ink token`);
  assert.ok(theme.variables.accent, `${themeId} needs an accent token`);
}

const state = createBridgeState();
assert.equal(DEFAULT_THEME_ID, 'obsidian-arc');
assert.equal(state.getSnapshot().themeId, 'obsidian-arc');
assert.equal(state.getSnapshot().activeModuleId, 'core');

let notifications = 0;
const unsubscribe = state.subscribe(() => {
  notifications += 1;
});
state.setTheme('pearl-alloy');
state.selectModule('sentinel');
state.openBridge();
assert.equal(state.getSnapshot().themeId, 'pearl-alloy');
assert.equal(state.getSnapshot().activeModuleId, 'sentinel');
assert.equal(state.getSnapshot().modalOpen, true);
state.closeBridge();
assert.equal(state.getSnapshot().modalOpen, false);
assert.equal(notifications, 4);
unsubscribe();

const sceneSource = readFileSync(join(root, 'src/scene.js'), 'utf8');
assert.match(sceneSource, /devicePixelRatio/, 'scene must account for high-DPI displays');
assert.match(sceneSource, /resize/, 'scene must expose resize behavior');
assert.match(sceneSource, /reducedMotion/, 'scene must branch for reduced motion');

const fakeContext = new Proxy({}, { get: () => () => {} });
const fakeCanvas = {
  width: 0,
  height: 0,
  getContext: () => fakeContext,
  getBoundingClientRect: () => ({ width: 640, height: 480 }),
};
const scene = createReactorScene({
  canvas: fakeCanvas,
  getSnapshot: () => ({ reducedMotion: true }),
  getTheme: () => getTheme(),
});
for (const methodName of ['resize', 'setPointer', 'pause', 'resume', 'destroy']) {
  assert.equal(typeof scene[methodName], 'function', `scene must expose ${methodName}()`);
}
scene.destroy();

assert.match(html, /data-theme-id="obsidian-arc"/, 'HTML needs labeled theme controls');
assert.match(html, /data-theme-id="pearl-alloy"/, 'HTML needs all four theme controls');
assert.match(html, /data-theme-id="cobalt-night"/, 'HTML needs all four theme controls');
assert.match(html, /data-theme-id="ember-copper"/, 'HTML needs all four theme controls');
assert.equal((html.match(/data-module-id=/g) ?? []).length, 4, 'HTML needs four module controls');
assert.match(html, /aria-controls="bridge-dialog"/, 'bridge trigger needs aria-controls');
assert.match(html, /aria-labelledby="bridge-dialog-title"/, 'dialog needs a label relationship');
assert.match(html, /role="dialog"/, 'dialog needs an explicit dialog role');
assert.match(html, /data-action="close-dialog"/, 'dialog needs a close control');
assert.match(html, /data-action="open-dialog"/, 'bridge needs a primary trigger');

const uiSource = readFileSync(join(root, 'src/ui.js'), 'utf8');
assert.equal(typeof mountBridgeUI, 'function', 'UI module must export mountBridgeUI');
assert.match(uiSource, /Escape/, 'UI must handle Escape');
assert.match(uiSource, /activeElement|focus/, 'UI must restore focus');
assert.match(uiSource, /aria-expanded/, 'UI must update aria-expanded');
assert.match(uiSource, /applyTheme/, 'UI must apply selected themes');
assert.doesNotMatch(uiSource, /app\.dataset\.signalState/, 'root signal marker must not collide with the signal text binding');
assert.match(uiSource, /app\.dataset\.signalTone/, 'root signal marker should use a distinct data attribute');

const styles = readFileSync(join(root, 'src/styles.css'), 'utf8');
for (const themeId of themeIds) {
  assert.match(styles, new RegExp(`data-theme=["']${themeId}["']`), `${themeId} needs a theme selector`);
}
assert.match(styles, /@media\s*\([^)]*max-width/i, 'styles need responsive breakpoints');
assert.match(styles, /perspective\s*:/, 'styles need a perspective stage');
assert.match(styles, /backdrop-filter\s*:/, 'styles need glass blur treatment');
assert.match(styles, /background(?:-color)?\s*:/, 'styles need a backdrop fallback');
assert.match(styles, /@keyframes/, 'styles need deliberate motion');
assert.match(styles, /:focus-visible/, 'styles need visible keyboard focus');
assert.match(styles, /prefers-reduced-motion/, 'styles need reduced motion support');
assert.match(styles, /min-height\s*:\s*44px/, 'controls need touch-sized targets');
assert.match(styles, /body\.modal-open/, 'styles need modal scroll locking');

const readme = readFileSync(join(root, 'README.md'), 'utf8');
for (const command of ['npm ci --offline', 'npm test', 'npm start', 'docker build', 'docker run']) {
  assert.match(readme, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `README needs ${command}`);
}
assert.match(readme, /browser/i, 'README needs browser verification guidance');
assert.equal(existsSync(join(root, 'evidence/design-evidence.json')), true, 'evidence record is required');
const evidence = JSON.parse(readFileSync(join(root, 'evidence/design-evidence.json'), 'utf8'));
assert.deepEqual(evidence.targetViewports, ['1440x900', '1024x768', '390x844']);
assert.equal(evidence.accessibility.status, 'pass');
assert.equal(evidence.responsive.status, 'pass');
assert.ok(evidence.contentStates && typeof evidence.contentStates === 'object');
assert.ok(Array.isArray(evidence.renderedEvidence) && evidence.renderedEvidence.length >= 3);

console.log(`Jarvis shell contract passed: ${requiredFiles.length} files`);

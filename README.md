# JARVIS Command Bridge

A self-contained, zero-dependency cinematic command bridge built with semantic
HTML, CSS custom properties, vanilla ES modules, and Canvas 2D.

## Runtime

- Node.js `20.12.0` (see `.nvmrc`)
- No runtime dependencies or remote assets
- Local server binds to `127.0.0.1` on port `4173` by default

## Run locally

From `G:\skills goted\jarvis`:

```powershell
npm ci --offline
npm test
npm start
```

Open `http://127.0.0.1:4173` in a browser.

If a previous preview is still cached, use `Ctrl+Shift+R` once after restarting
the server. The bridge also sends no-store headers and a cache-clear hint on the
root document so the full shell is loaded instead of an older preview.

The same commands are available through:

```powershell
make test
make start
```

## Docker

```powershell
docker build -t jarvis-command-bridge:local .
docker run --rm -p 4173:4173 jarvis-command-bridge:local
```

## Browser verification

With the local server running, verify the first viewport at `1440x900`,
`1024x768`, and `390x844`. Check that the reactor responds to pointer movement,
all four theme swatches update the surface, the bridge dialog opens and closes
with the button and Escape, focus stays inside the dialog while it is open, and
the narrow layout has no horizontal overflow. Enable reduced motion in the
browser or operating system and confirm that state changes remain available
without camera drift or particle movement.

## Experience

The first viewport is a luxury command bridge with a procedural reactor, camera
anchor parallax, orbiting signal nodes, module rail, system status pane, and
telemetry dock. The bridge dialog moves through the reactor with depth and
returns focus to its trigger when closed. Four themes are kept on semantic
tokens: Obsidian Arc, Pearl Alloy, Cobalt Night, and Ember Copper.

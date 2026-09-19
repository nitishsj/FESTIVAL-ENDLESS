# Ganapati Modak Dash — 3D Festival Chase Runner

A premium browser-based 3D endless runner built with **Three.js / WebGL**.
Lord Ganesha chases a mythological **Rakshasa (Demon)** across three levels of a
Ganesh Chaturthi celebration set against dramatic Himalayan mountains, ending in a
gentle golden transformation.

100% client-side — **no backend, no accounts, no paid APIs**. Deployable as a static site.

## Play locally
```bash
cd frontend
yarn install
yarn start        # http://localhost:3000
```

## Build a static bundle
```bash
cd frontend
yarn build        # outputs to frontend/build/
```
`"homepage": "."` is set in `frontend/package.json`, so the build uses **relative asset
paths** and can be hosted from any subfolder (GitHub Pages, Netlify, itch.io, a plain
static server, etc.).

## Deploy to GitHub Pages
1. `cd frontend && yarn build`
2. Push the contents of `frontend/build/` to your `gh-pages` branch (or use the
   `gh-pages` npm package / GitHub Actions).
3. Because paths are relative, it works at `https://<user>.github.io/<repo>/`.

Quick option:
```bash
cd frontend
yarn add -D gh-pages
npx gh-pages -d build
```

## Source layout (modular)
```
frontend/src/
├── GanapatiDash.jsx        # React shell: menu, HUD, panels, cinematics, input
└── game/
    ├── Game.js             # engine: scene, camera, world, physics, collisions, states
    ├── characters.js       # Ganesha (player) + Mushika (companion)
    ├── demon.js            # Rakshasa antagonist + procedural animation
    ├── chase.js            # ChaseManager: demon AI state machine, levels, catch/escape
    ├── mountains.js        # Himalayan backdrop + snow
    ├── props.js            # collectibles, obstacles (stone/lightning/sword), decorations
    ├── particles.js        # pooled particle bursts + petal/flower field
    ├── audio.js            # Web Audio procedural music + SFX (asset slots documented)
    ├── storage.js          # localStorage leaderboard + settings
    └── game.css            # festival UI theme
```

## Ending integration hook (modular / replaceable)
The final Level-3 catch fires a single, clean trigger:

```
LEVEL_3_COMPLETE  ->  DEMON_CAUGHT_FINAL  ->  Game.triggerEnding()
```

`Game.triggerEnding()`:
- emits the event `onEvent("ENDING_TRIGGER", stats)`,
- calls the optional callback `opts.onEnding(stats)` passed into `new Game(container, opts)`,
- plays the built-in golden transformation cutscene, then `onState("ending", stats)`.

To swap in a different ending, supply your own `onEnding` handler (or replace the body of
`Game._updateEnding`) — the chase/level system does not need to change.

## Controls
- **Desktop:** A/D or arrows move · W/Up/Space jump · S/Down slide-duck · E blessing
- **Mobile:** swipe (any direction) or the on-screen buttons

## Levels
| Level | Distance | Mood | Obstacles |
|------|----------|------|-----------|
| 1 | ~500 m | misty dawn peaks | stones, first swords |
| 2 | ~700 m | stormy peaks + snow | + lightning |
| 3 | ~900 m | dark thunder summit | all, denser combos |

At the end of Levels 1 and 2 the demon is caught and escapes; at the end of Level 3 the
transformation ending plays.

## Audio assets (optional, future)
Procedural Web Audio is used by default. Drop royalty-free files into `frontend/public/audio/`
and wire them in `game/audio.js` (slots documented at the top of that file).

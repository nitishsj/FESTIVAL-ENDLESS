# Ganapati Modak Dash — PRD

## Original Problem Statement
Build a premium, visually spectacular browser-based 3D endless runner for a Ganesh Chaturthi
game design contest. Lord Ganesha is the playable character; Mushika is his companion.
Genuine WebGL/Three.js 3D game (not an HTML/canvas demo), no backend, deployable to GitHub Pages,
no paid APIs, no mandatory accounts. Subway-Surfers-level feel (camera, animation, density) but
100% original assets and culturally respectful.

## User Choices (confirmed)
- First version = core runner; polish added progressively.
- Fully procedural stylized Three.js geometry (no external model files).
- Procedural Web Audio sounds + marked slots for future royalty-free files.
- Hosted as the main React app (Three.js canvas + React UI overlays).
- LOW/MEDIUM/HIGH graphics + auto-detect; swipe + on-screen touch controls.

## Architecture
- Frontend only. React (CRA/craco) renders `GanapatiDash.jsx` which mounts a vanilla Three.js
  engine (`src/game/Game.js`) into a container div and overlays React UI (menu/HUD/game-over/panels).
- Engine modules under `src/game/`:
  - `Game.js` — scene, lights, shadows, fog, camera, world treadmill, object pooling,
    spawning, collision, scoring, stages, events, blessing/magnet/golden, state machine.
  - `characters.js` — procedural `Ganesha` (elephant head, trunk, 4 arms, crown, ornaments,
    aura/halo) and `Mushika` mouse, with procedural run/lean/duck/jump animations.
  - `props.js` — modak, golden modak, marigold flower, obstacles (drum/box/cart/low/high),
    decorations (house, street lamp, pandal, arch, crowd).
  - `particles.js` — pooled additive `Particles` bursts + `PetalField` (flower shower).
  - `audio.js` — Web Audio procedural music sequencer + SFX. Asset slots documented in file.
  - `storage.js` — localStorage leaderboard (key `ganapati_modak_dash_v1`) + settings.
- No env vars, no MongoDB, no API routes used (self-contained client game).

## Personas
- Casual mobile/desktop player at a festival-themed contest booth.
- Contest judges evaluating polish, originality, cultural respect, and game feel.

## Core Requirements (static)
3-lane endless run; Ganesha auto-runs; jump/duck; increasing speed & difficulty; modaks,
marigolds, golden modak; combo; near miss; blessing meter + activation; magnet; 3 lives;
four festival stages; Dhol Rush + Flower Shower events; dynamic camera; particles; audio;
main menu; game over; restart; local high score; graphics settings; responsive + touch.

## Implemented (2026-06-17)
- [x] 3D Ganesha playable + Mushika companion (menu, run, celebrate, game-over presence).
- [x] Third-person follow camera: bob, dynamic FOV by speed, shake, power-zoom, lookahead.
- [x] 3-lane movement, jump, graceful low-duck (lean), landing squash + dust particles.
- [x] Procedural world: pooled ground segments, decorations, obstacles, collectibles; recycling.
- [x] Modaks (score/combo), marigolds (charge blessing), golden modak (2x, 10s).
- [x] Combo system + animated combo UI; near-miss detection w/ slow-mo + bonus + toast.
- [x] Blessing: fill meter, activate → invincibility + speed + magnet + aura/halo + Mushika celebrates.
- [x] 3 lives + invuln window + stumble + screen shake + damage particles → Game Over.
- [x] Four stages by distance with smooth sky/fog/light/ground color transitions + banner.
- [x] Festival events: Dhol Rush (faster, denser, music intensity up), Flower Shower (petal field, bonus).
- [x] Web Audio music + SFX (collect/jump/land/nearmiss/hit/powerup/blessing/bell/ui/gameover/event).
- [x] Premium UI: glass HUD (score/distance/combo/lives/blessing), toasts, stage banner.
- [x] Cinematic main menu (orbiting camera, idle Ganesha + Mushika) with title + 4 buttons.
- [x] Game-over screen with stats + NEW PERSONAL BEST celebration; Play Again / Main Menu.
- [x] Local leaderboard panel + How To Play + Settings (quality/music/sfx/touch).
- [x] LOW/MEDIUM/HIGH + auto-detect (pixel ratio, shadows, view distance, particle/deco density).
- [x] Mobile: swipe (dir by distance/velocity) + large on-screen buttons; page-scroll prevented.
- [x] Object pooling, frustum-friendly recycling, throttled HUD updates.
- Verified via testing agent: 100% frontend pass, no bugs (iteration_1.json).

## Backlog / Remaining polish (P1/P2)
- P1: Post-processing bloom via EffectComposer/UnrealBloom (currently approximated with emissive+additive glow).
- P1: Skeletal GLTF characters / richer procedural detail; more distinct per-stage props
  (dhol/tasha players, decorative vehicles, ornamental arches density in procession).
- P1: LOD + InstancedMesh for dense crowds/decorations at HIGH.
- P2: Speed lines / motion trails shader; adaptive resolution based on measured FPS.
- P2: Split GanapatiDash.jsx into HUD/Panels/InputHooks components.
- P2: Merge Storage.getSettings() with a DEFAULT_SETTINGS object for forward-compat.
- P2: Wire optional royalty-free audio files into the documented slots in audio.js.

## Next Tasks
- Add UnrealBloom post-processing at MEDIUM/HIGH for the festival glow "wow".
- Enrich Stage 3 (procession) with dhol/tasha performers + decorative float + confetti.
- Add motion trails + speed lines during Dhol Rush and Blessing.

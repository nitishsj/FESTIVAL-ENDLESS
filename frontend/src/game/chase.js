import * as THREE from "three";

// Chase & Level orchestration between Lord Ganesha (pursuer) and the Demon.
// Owns the Demon's kinematics + AI state machine, distance-based levels,
// obstacle placement scheduling, and the catch / escape cinematics.
// The final Level-3 catch calls game.triggerEnding() — a clean, replaceable hook.
const LEVELS = [
  {
    id: 1,
    name: "The Chase Begins",
    target: 500,
    speedMul: 1.0,
    placeInterval: 44,
    kinds: ["stone", "stone", "sword"],
    doubleChance: 0,
  },
  {
    id: 2,
    name: "Storm Pursuit",
    target: 700,
    speedMul: 1.13,
    placeInterval: 36,
    kinds: ["stone", "sword", "lightning"],
    doubleChance: 0.25,
  },
  {
    id: 3,
    name: "Final Reckoning",
    target: 900,
    speedMul: 1.26,
    placeInterval: 28,
    kinds: ["stone", "sword", "lightning", "stone"],
    doubleChance: 0.5,
  },
];

export class ChaseManager {
  constructor(game) {
    this.game = game;
    this.demon = game.demon;
  }

  start(levelIndex = 0) {
    this.levelIndex = levelIndex;
    this.cfg = LEVELS[levelIndex];
    this.levelDist = 0;
    this.phase = "chase"; // chase | catch | escape
    this.placeAccum = 0;
    this.placing = false;
    this.placeT = 0;
    this.pendingSpawn = null;
    this.lookBack = 0;
    this.place = 0;
    this.caught = 0;
    // demon kinematics
    this.demonLane = 1;
    this.demonX = 0;
    this.demonZ = -32;
    this.laneTimer = 0;
    this.cineT = 0;
    this.game.levelSpeedMul = this.cfg.speedMul;
    this.demon.group.visible = true;
    this.demon.group.rotation.y = Math.PI; // faces away (running forward, into screen)
    this._placeDemon();
  }

  get level() {
    return this.cfg.id;
  }
  get levelName() {
    return this.cfg.name;
  }
  get progress() {
    return Math.min(1, this.levelDist / this.cfg.target);
  }

  _placeDemon() {
    this.demon.group.position.set(this.demonX, 0, this.demonZ);
  }

  // Called during state === "playing"
  updateChase(dt, effSpeed) {
    if (this.phase !== "chase") return;
    this.levelDist += effSpeed * dt * 0.8;

    // demon lane wandering
    this.laneTimer -= dt;
    if (this.laneTimer <= 0 && !this.placing) {
      this.laneTimer = 1.6 + Math.random() * 1.8;
      this.demonLane = Math.floor(Math.random() * 3);
    }
    const LANES = this.game.LANES;
    const targetX = LANES[this.demonLane];
    this.demonX += (targetX - this.demonX) * Math.min(1, dt * 3);
    // dynamic distance ahead — surges closer/farther to feel like a real chase
    const surge = Math.sin(this.levelDist * 0.02) * 4;
    const targetZ = -26 - surge;
    this.demonZ += (targetZ - this.demonZ) * Math.min(1, dt * 2);
    this._placeDemon();

    // obstacle placement scheduling
    this.placeAccum += effSpeed * dt * 0.8;
    if (!this.placing && this.placeAccum >= this.cfg.placeInterval) {
      this.placeAccum = 0;
      this._startPlacement();
    }
    if (this.placing) this._updatePlacement(dt);

    // demon animation params
    this.demon.update(dt, {
      running: true,
      speedFactor: (effSpeed - this.game.baseSpeed) / 16,
      lookBack: this.lookBack,
      place: this.place,
      caught: 0,
    });

    // reached end of level -> catch
    if (this.levelDist >= this.cfg.target) {
      this._beginCatch();
    }
  }

  _startPlacement() {
    this.placing = true;
    this.placeT = 0;
    // decide obstacle now; spawn at the throw beat
    const kinds = this.cfg.kinds;
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    let lane = this.demonLane;
    // pick a blocked lane leaving a safe path; sword spans all lanes (duckable)
    const openBias = Math.floor(Math.random() * 3);
    lane = openBias;
    this.pendingSpawn = { kind, lane, done: false };
    // second obstacle in harder levels (still leaves a safe lane)
    if (kind !== "sword" && Math.random() < this.cfg.doubleChance) {
      const lanes = [0, 1, 2].filter((l) => l !== lane);
      const l2 = lanes[Math.floor(Math.random() * lanes.length)];
      this.pendingSpawn.second = { kind: this.cfg.kinds[0], lane: l2 };
    }
  }

  _updatePlacement(dt) {
    this.placeT += dt;
    // 0.0-0.35 look back; 0.35-0.6 throw; 0.6-1.0 recover
    if (this.placeT < 0.35) {
      this.lookBack = this.placeT / 0.35;
      this.place = 0;
    } else if (this.placeT < 0.62) {
      this.lookBack = 1;
      this.place = (this.placeT - 0.35) / 0.27;
      if (!this.pendingSpawn.done && this.placeT >= 0.5) {
        this._doSpawn();
        this.pendingSpawn.done = true;
      }
    } else if (this.placeT < 1.0) {
      const k = (this.placeT - 0.62) / 0.38;
      this.lookBack = 1 - k;
      this.place = 1 - k;
    } else {
      this.placing = false;
      this.lookBack = 0;
      this.place = 0;
      this.pendingSpawn = null;
    }
  }

  _doSpawn() {
    const p = this.pendingSpawn;
    this.game.spawnDemonObstacle(p.kind, p.lane, this.demonX, this.demonZ);
    if (p.second) {
      this.game.spawnDemonObstacle(p.second.kind, p.second.lane, this.demonX, this.demonZ - 1.5);
    }
    this.game.audio?.play(p.kind === "lightning" ? "event" : "duck", { pitch: 1 });
    // dark energy burst from the demon's hand
    this.game.particles.burst("red", new THREE.Vector3(this.demonX, 1.4, this.demonZ), {
      speed: 3,
      up: 1,
      life: 0.5,
      spread: 1.2,
    });
  }

  // ---- catch cinematic ----
  _beginCatch() {
    this.phase = "catch";
    this.cineT = 0;
    this.placing = false;
    this.lookBack = 0;
    this.place = 0;
    this.game.state = "cinematic";
    this.game.onEvent("CATCH", { level: this.cfg.id });
    this.game.audio?.play("bell");
  }

  // Called during state === "cinematic"
  updateCinematic(dt) {
    this.cineT += dt;
    const g = this.game;
    const t = this.cineT;

    if (this.phase === "catch") {
      // world glides to a stop, demon pulled close, Ganesha reaches him
      g.cineSpeedMul = Math.max(0, 1 - t * 1.1);
      const pull = Math.min(1, t / 1.2);
      this.demonZ += (-3.2 - this.demonZ) * Math.min(1, dt * 4);
      this.demonX += (g.px - this.demonX) * Math.min(1, dt * 3);
      this.caught = pull;
      this._placeDemon();
      this.demon.group.rotation.y += (0 - this.demon.group.rotation.y) * Math.min(1, dt * 4); // turn to face pursuer
      this.demon.update(dt, { running: false, lookBack: 0.2, caught: this.caught });
      // cinematic side camera
      g.setCinematicCam(
        new THREE.Vector3(g.px + 3.2, 2.6, 1.5),
        new THREE.Vector3(g.px, 1.5, -1.5)
      );
      if (t > 2.0) {
        if (this.cfg.id < 3) {
          this.phase = "escape";
          this.cineT = 0;
          g.onEvent("ESCAPE", { level: this.cfg.id });
        } else {
          // FINAL CATCH -> ending trigger (modular / replaceable)
          this.phase = "final";
          this.cineT = 0;
        }
      }
    } else if (this.phase === "escape") {
      // demon breaks free with a supernatural dash; distinct per level
      const k = Math.min(1, this.cineT / 1.6);
      this.caught = Math.max(0, 1 - k * 2);
      if (this.cfg.id === 1) {
        // Level 1: dodges sideways and sprints away
        this.demonX += ((this.game.LANES[(this.demonLane + 1) % 3]) - this.demonX) * Math.min(1, dt * 4);
        this.demonZ += (-34 - this.demonZ) * Math.min(1, dt * 2.5);
      } else {
        // Level 2: supernatural leap + shrink-through smoke
        this.demonZ += (-36 - this.demonZ) * Math.min(1, dt * 3);
        this.game.demon.group.position.y = Math.sin(k * Math.PI) * 2.2;
      }
      this._placeDemon();
      this.demon.update(dt, { running: k > 0.3, speedFactor: 1, caught: this.caught });
      if (this.cineT < 0.3) {
        this.game.particles.burst("red", new THREE.Vector3(this.demonX, 1.2, this.demonZ), {
          speed: 5,
          up: 2,
          life: 0.6,
          spread: 2,
        });
      }
      if (k >= 1) {
        // next level
        this.game.demon.group.position.y = 0;
        this.start(this.levelIndex + 1);
        this.game.beginNextLevel(this.cfg.id, this.cfg.name);
      }
    } else if (this.phase === "final") {
      // hold a beat, then trigger the (replaceable) ending sequence
      g.cineSpeedMul = 0;
      this.demon.update(dt, { running: false, caught: 1 });
      g.setCinematicCam(
        new THREE.Vector3(g.px + 2.4, 2.4, 2.2),
        new THREE.Vector3(g.px, 1.5, -1.5)
      );
      if (this.cineT > 0.8) {
        this.game.triggerEnding();
      }
    }
  }

  // used by ending sequence to keep demon in front of Ganesha
  getDemonPos() {
    return new THREE.Vector3(this.demonX, this.demon.group.position.y, this.demonZ);
  }
}

export { LEVELS };

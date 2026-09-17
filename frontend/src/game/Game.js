import * as THREE from "three";
import { Ganesha, Mushika } from "./characters";
import {
  buildModak,
  buildFlower,
  buildObstacle,
  buildStreetLamp,
  buildHouse,
  buildPandal,
  buildArch,
  buildCrowd,
} from "./props";
import { Particles, PetalField } from "./particles";

const LANES = [-2.4, 0, 2.4];
const GRAVITY = -34;
const JUMP_V = 12.5;

const QUALITY = {
  low: { pr: 1, shadow: 0, seg: 5, view: 68, petals: 60, decoStep: 22 },
  medium: { pr: 1.5, shadow: 1024, seg: 6, view: 90, petals: 120, decoStep: 16 },
  high: { pr: 2, shadow: 2048, seg: 7, view: 115, petals: 200, decoStep: 12 },
};

// Stage themes (smoothly interpolated)
const STAGES = [
  {
    name: "Neighborhood Celebration",
    sky: 0x9ad4ff,
    fog: 0xbfe4ff,
    ground: 0x8a6d4f,
    ambient: 0x88aacc,
    ambientI: 0.75,
    sun: 0xfff2d0,
    sunI: 1.5,
    housePalette: [0xf2d0a4, 0xe8b88a, 0xd98c6a, 0xf0c8b0, 0xcfd8a0],
    evening: false,
  },
  {
    name: "Grand Festival Street",
    sky: 0xffd9a0,
    fog: 0xffe0b0,
    ground: 0x9a6a4a,
    ambient: 0xffbb88,
    ambientI: 0.85,
    sun: 0xffe6b0,
    sunI: 1.6,
    housePalette: [0xffb46a, 0xff8a5a, 0xe86a4a, 0xffca88],
    evening: false,
  },
  {
    name: "Grand Ganesh Procession",
    sky: 0xffb066,
    fog: 0xffc080,
    ground: 0x8a5a3a,
    ambient: 0xffaa66,
    ambientI: 0.95,
    sun: 0xffc27a,
    sunI: 1.7,
    housePalette: [0xff9a4a, 0xff7a3a, 0xd95a2a, 0xffb46a],
    evening: false,
  },
  {
    name: "Evening Visarjan Route",
    sky: 0x3a2a5a,
    fog: 0x5a3a6a,
    ground: 0x2e2440,
    ambient: 0x664488,
    ambientI: 0.7,
    sun: 0xff8844,
    sunI: 1.2,
    housePalette: [0x5a4a7a, 0x7a4a6a, 0x4a3a6a, 0x8a5a5a],
    evening: true,
  },
];

function lerpColor(cur, target, k) {
  cur.lerp(target, k);
}

export class Game {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = opts;
    this.audio = opts.audio;
    this.onHud = opts.onHud || (() => {});
    this.onState = opts.onState || (() => {});
    this.onEvent = opts.onEvent || (() => {});
    this.quality = opts.quality || "high";
    this.q = QUALITY[this.quality];

    this.state = "menu";
    this.clock = new THREE.Clock();
    this._raf = null;
    this._hudFrame = 0;

    this._initRenderer();
    this._initScene();
    this._initLights();
    this._initGround();
    this._initCharacters();
    this._initPools();
    this._initParticles();
    this._resetRunVars();
    this._bindResize();

    this.loop = this.loop.bind(this);
    this._raf = requestAnimationFrame(this.loop);
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.quality !== "low",
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.q.pr));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = this.q.shadow > 0;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.curSky = new THREE.Color(STAGES[0].sky);
    this.curFog = new THREE.Color(STAGES[0].fog);
    this.curGround = new THREE.Color(STAGES[0].ground);
    this.scene.background = this.curSky.clone();
    this.scene.fog = new THREE.Fog(this.curFog.clone(), 25, this.q.view);

    this.camera = new THREE.PerspectiveCamera(
      62,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      400
    );
    this.camera.position.set(0, 4.2, 8.6);
    this.camera.lookAt(0, 1.4, -6);
    this.camShake = 0;
    this.camZoom = 0;
  }

  _initLights() {
    this.ambient = new THREE.HemisphereLight(
      STAGES[0].ambient,
      0x442a1a,
      STAGES[0].ambientI
    );
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(STAGES[0].sun, STAGES[0].sunI);
    this.sun.position.set(6, 14, 4);
    if (this.q.shadow > 0) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(this.q.shadow, this.q.shadow);
      const d = 16;
      this.sun.shadow.camera.left = -d;
      this.sun.shadow.camera.right = d;
      this.sun.shadow.camera.top = d;
      this.sun.shadow.camera.bottom = -d;
      this.sun.shadow.camera.near = 1;
      this.sun.shadow.camera.far = 60;
      this.sun.shadow.bias = -0.0005;
    }
    this.sun.target.position.set(0, 0, -6);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // warm rim fill
    this.rim = new THREE.DirectionalLight(0xffaa55, 0.5);
    this.rim.position.set(-6, 6, -10);
    this.scene.add(this.rim);
  }

  _initGround() {
    this.segLen = 26;
    this.nSeg = this.q.seg;
    this.segments = [];
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x6b5236,
      roughness: 0.95,
    });
    this.roadMat = roadMat;
    for (let i = 0; i < this.nSeg; i++) {
      const seg = new THREE.Group();
      // road
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(9, 0.4, this.segLen),
        roadMat
      );
      road.position.y = -0.2;
      road.receiveShadow = true;
      seg.add(road);
      // lane dividers
      [-1.2, 1.2].forEach((x) => {
        for (let j = 0; j < 6; j++) {
          const dash = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.02, 1.4),
            new THREE.MeshStandardMaterial({ color: 0xffe8b0, roughness: 0.6 })
          );
          dash.position.set(x, 0.01, -this.segLen / 2 + 2 + j * 4.3);
          seg.add(dash);
        }
      });
      // side ground strips
      [-7.5, 7.5].forEach((x) => {
        const side = new THREE.Mesh(
          new THREE.BoxGeometry(6, 0.3, this.segLen),
          new THREE.MeshStandardMaterial({ color: 0x5c7a3a, roughness: 1 })
        );
        side.position.set(x, -0.25, 0);
        side.receiveShadow = true;
        seg.add(side);
      });
      seg.position.z = -i * this.segLen;
      this.scene.add(seg);
      this.segments.push(seg);
    }
  }

  _initCharacters() {
    this.ganesha = new Ganesha(this.quality);
    this.ganesha.group.position.set(0, 0, 0);
    this.scene.add(this.ganesha.group);

    this.mushika = new Mushika();
    this.mushika.group.position.set(-1.4, 0, 1.2);
    this.scene.add(this.mushika.group);
    this.mushikaMode = "menu";
  }

  _makePool(factory, n) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const obj = factory();
      obj.visible = false;
      obj.userData.active = false;
      this.scene.add(obj);
      arr.push(obj);
    }
    return arr;
  }

  _initPools() {
    this.pools = {
      drum: this._makePool(() => buildObstacle("drum"), 6),
      box: this._makePool(() => buildObstacle("box"), 6),
      cart: this._makePool(() => buildObstacle("cart"), 5),
      low: this._makePool(() => buildObstacle("low"), 5),
      high: this._makePool(() => buildObstacle("high"), 5),
      modak: this._makePool(() => buildModak(false), 40),
      flower: this._makePool(() => buildFlower(), 30),
      golden: this._makePool(() => buildModak(true), 3),
    };
    // decorations
    this.decoPools = {
      house: this._makePool(() => buildHouse(STAGES[0].housePalette), 10),
      lamp: this._makePool(() => buildStreetLamp(false), 8),
      pandal: this._makePool(() => buildPandal(), 4),
      arch: this._makePool(() => buildArch(), 3),
      crowd: this._makePool(() => buildCrowd(), 5),
    };
    this.activeObjects = [];
    this.activeDeco = [];
  }

  _initParticles() {
    this.particles = new Particles(this.scene, this.quality);
    this.petals = new PetalField(this.scene, this.q.petals, [
      0xff8822, 0xffcc33, 0xff4466, 0xff77aa,
    ]);
  }

  _resetRunVars() {
    this.speed = 13;
    this.baseSpeed = 13;
    this.distance = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.modaksCollected = 0;
    this.lives = 3;
    this.blessing = 0; // 0..100
    this.blessingActive = 0; // seconds remaining
    this.magnet = 0;
    this.multiplier = 1;
    this.goldenTime = 0;
    this.invuln = 0;
    this.slowmo = 0;
    this.lane = 1;
    this.px = 0;
    this.py = 0;
    this.vy = 0;
    this.grounded = true;
    this.ducking = false;
    this.duckTimer = 0;
    this.stumble = 0;
    this.rowTimer = 0;
    this.rowGap = 8;
    this.decoTimer = 0;
    this.eventTimer = 18;
    this.activeEvent = null;
    this.eventTime = 0;
    this.stageIndex = 0;
    this.stageBlend = 0;
    this._passObstacles = new Set();
  }

  // ---------- state control ----------
  startRun() {
    this._clearActive();
    this._resetRunVars();
    this.state = "playing";
    this.ganesha.group.position.set(0, 0, 0);
    this.ganesha.group.rotation.set(0, 0, 0);
    this.mushikaMode = "run";
    this.audio?.resume();
    this.audio?.startMusic();
    this._prewarm();
    this.onState("playing");
    this._pushHud(true);
  }

  // populate the visible stretch so the world never starts empty
  _prewarm() {
    // decorations along both sides across the whole view distance
    for (let z = -12; z > -this.q.view - 6; z -= this.q.decoStep) {
      const savedTimer = this.decoTimer;
      this._spawnDecoAt(z);
      this.decoTimer = savedTimer;
    }
    // a few gentle collectible rows ahead (no obstacles for the first stretch)
    this._collectibleLine(1, -22, "modak", 4);
    this._collectibleArc(0, -40);
    this._collectibleLine(2, -58, "flower", 4);
    this._collectibleLine(1, -76, "modak", 4);
  }

  toMenu() {
    this._clearActive();
    this.state = "menu";
    this.stageIndex = 0;
    this.ganesha.group.position.set(0.3, 0, 0);
    this.ganesha.group.rotation.set(0, -0.5, 0);
    this.mushika.group.position.set(-1.4, 0, 1.2);
    this.mushikaMode = "menu";
    this.audio?.stopMusic();
    this.onState("menu");
  }

  gameOver() {
    this.state = "gameover";
    this.mushikaMode = "gameover";
    this.audio?.stopMusic();
    this.audio?.play("gameover");
    this.ganesha.group.rotation.set(0, 0, 0);
    this.onState("gameover", {
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      combo: this.maxCombo,
      modaks: this.modaksCollected,
    });
  }

  _clearActive() {
    this.activeObjects.forEach((o) => {
      o.visible = false;
      o.userData.active = false;
    });
    this.activeObjects = [];
    this.activeDeco.forEach((o) => {
      o.visible = false;
      o.userData.active = false;
    });
    this.activeDeco = [];
    if (this.petals) this.petals.setVisible(false);
  }

  // ---------- input ----------
  moveLeft() {
    if (this.state !== "playing") return;
    if (this.lane > 0) {
      this.lane--;
      this.ganesha.setLane(-1);
      this.audio?.play("duck", { pitch: 2 });
    }
  }
  moveRight() {
    if (this.state !== "playing") return;
    if (this.lane < 2) {
      this.lane++;
      this.ganesha.setLane(1);
      this.audio?.play("duck", { pitch: 3 });
    }
  }
  jump() {
    if (this.state !== "playing") return;
    if (this.grounded) {
      this.vy = JUMP_V;
      this.grounded = false;
      this.ducking = false;
      this.duckTimer = 0;
      this.audio?.play("jump");
    }
  }
  duck() {
    if (this.state !== "playing") return;
    if (this.grounded) {
      this.ducking = true;
      this.duckTimer = 0.7;
      this.audio?.play("duck");
    } else {
      // fast-fall
      this.vy = Math.min(this.vy, -6);
    }
  }
  activateBlessing() {
    if (this.state !== "playing") return;
    if (this.blessing >= 100 && this.blessingActive <= 0) {
      this.blessing = 0;
      this.blessingActive = 8;
      this.magnet = Math.max(this.magnet, 8);
      this.invuln = Math.max(this.invuln, 8);
      this.camZoom = 1;
      this.audio?.play("blessing");
      this.onEvent("BLESSING");
      this.particles.burst("gold", this._playerPos(1.2), {
        speed: 6,
        up: 4,
        life: 1.2,
        spread: 2,
      });
    }
  }

  setQuality(qName) {
    if (qName === this.quality) return;
    this.quality = qName;
    this.q = QUALITY[qName];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.q.pr));
    this.renderer.shadowMap.enabled = this.q.shadow > 0;
    if (this.sun.castShadow && this.q.shadow > 0) {
      this.sun.shadow.mapSize.set(this.q.shadow, this.q.shadow);
    }
    this.scene.fog.far = this.q.view;
  }

  _playerPos(y = 0) {
    return new THREE.Vector3(this.px, (y || 0) + this.py, 0);
  }

  // ---------- spawning ----------
  _getFromPool(key) {
    const arr = this.pools[key];
    const obj = arr.find((o) => !o.userData.active);
    if (!obj) return null;
    obj.userData.active = true;
    obj.visible = true;
    return obj;
  }

  _spawnRow() {
    const z = -this.q.view;
    const diff = Math.min(1, (this.speed - this.baseSpeed) / 16);
    const roll = Math.random();

    // decide row type: obstacle or collectible-heavy
    if (roll < 0.62) {
      // obstacle row
      const kind = Math.random();
      if (kind < 0.28 && diff > 0.15) {
        // full-width duck garland (high) — leave it, duck under
        const o = this._getFromPool("high");
        if (o) this._place(o, LANES[1], z, "high");
        // reward flowers just after
        this._collectibleLine(1, z - 4, "flower", 3);
      } else if (kind < 0.5 && diff > 0.2) {
        // low barrier across — jump over
        const o = this._getFromPool("low");
        if (o) this._place(o, LANES[1], z, "low");
        this._collectibleArc(Math.floor(Math.random() * 3), z - 3);
      } else {
        // 1 or 2 blocking obstacles leaving open lane(s)
        const blockCount = diff > 0.4 && Math.random() < 0.5 ? 2 : 1;
        const lanesArr = [0, 1, 2];
        for (let b = 0; b < blockCount; b++) {
          if (lanesArr.length <= 1) break;
          const idx = Math.floor(Math.random() * lanesArr.length);
          const laneI = lanesArr.splice(idx, 1)[0];
          const types = ["drum", "box", "cart"];
          const t = types[Math.floor(Math.random() * types.length)];
          const o = this._getFromPool(t);
          if (o) this._place(o, LANES[laneI], z, "full");
        }
        // collectibles in an open lane
        const openLane = lanesArr[Math.floor(Math.random() * lanesArr.length)] ?? 1;
        this._collectibleLine(openLane, z, "modak", 4);
      }
    } else {
      // collectible row
      const lane = Math.floor(Math.random() * 3);
      const flowerRow = Math.random() < 0.4;
      if (flowerRow) {
        this._collectibleLine(lane, z, "flower", 5);
      } else {
        this._collectibleArc(lane, z);
      }
      // rare golden modak
      if (Math.random() < 0.07 + diff * 0.05) {
        const g = this._getFromPool("golden");
        if (g) this._place(g, LANES[Math.floor(Math.random() * 3)], z - 2, "golden");
      }
    }
  }

  _place(obj, x, z, h) {
    obj.position.set(x, obj.userData.type === "obstacle" ? 0 : 1.0, z);
    obj.userData.hRule = h;
    obj.userData.collected = false;
    obj.userData.passed = false;
    obj.userData.spin = Math.random() * Math.PI * 2;
    this.activeObjects.push(obj);
  }

  _collectibleLine(laneI, z, kind, count) {
    for (let i = 0; i < count; i++) {
      const o = this._getFromPool(kind);
      if (!o) break;
      this._place(o, LANES[laneI], z - i * 2.2, kind);
    }
  }

  _collectibleArc(laneI, z) {
    // a gentle jump-arc of modaks (encourage jumping)
    const count = 5;
    for (let i = 0; i < count; i++) {
      const o = this._getFromPool("modak");
      if (!o) break;
      const t = i / (count - 1);
      const y = 1.0 + Math.sin(t * Math.PI) * 1.8;
      o.position.set(LANES[laneI], y, z - i * 1.8);
      o.userData.hRule = "modak";
      o.userData.collected = false;
      o.userData.passed = false;
      o.userData.spin = 0;
      this.activeObjects.push(o);
    }
  }

  _spawnDeco() {
    this._spawnDecoAt(-this.q.view - 6);
  }

  _spawnDecoAt(z) {
    const stage = this.stageIndex;
    [-1, 1].forEach((side) => {
      const r = Math.random();
      let key = "house";
      if (stage >= 1 && r < 0.22) key = "pandal";
      else if (stage >= 1 && r < 0.34) key = "arch";
      else if (stage >= 2 && r < 0.55) key = "crowd";
      else key = r < 0.5 ? "house" : "lamp";
      const obj = this._decoFromPool(key);
      if (obj) {
        let x = side * (6.5 + Math.random() * 2);
        if (key === "arch") {
          obj.position.set(0, 0, z);
        } else if (key === "lamp") {
          obj.position.set(side * 4.6, 0, z);
        } else if (key === "crowd") {
          obj.position.set(side * 5.2, 0.3, z);
        } else {
          obj.position.set(x, 0, z);
        }
        obj.userData.key = key;
        this.activeDeco.push(obj);
      }
      // lamp along road edge often
      if (key !== "lamp" && key !== "arch" && Math.random() < 0.6) {
        const lamp = this._decoFromPool("lamp");
        if (lamp) {
          lamp.position.set(side * 4.6, 0, z + 4);
          lamp.userData.key = "lamp";
          this.activeDeco.push(lamp);
        }
      }
    });
  }

  _decoFromPool(key) {
    const arr = this.decoPools[key];
    const obj = arr.find((o) => !o.userData.active);
    if (!obj) return null;
    obj.userData.active = true;
    obj.visible = true;
    return obj;
  }

  // ---------- update ----------
  loop() {
    this._raf = requestAnimationFrame(this.loop);
    let dt = this.clock.getDelta();
    if (dt > 0.05) dt = 0.05;

    if (this.state === "playing") {
      this._updatePlaying(dt);
    } else if (this.state === "menu") {
      this._updateMenu(dt);
    } else {
      this._updateGameOver(dt);
    }

    this.particles.update(dt);
    this.petals.update(dt, this.state === "playing" ? this.speed : 4);
    this._updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _updateMenu(dt) {
    const t = this.clock.elapsedTime;
    this.ganesha.update(dt, { running: false, blessing: 0.4 });
    this.ganesha.group.rotation.y = -0.5 + Math.sin(t * 0.4) * 0.25;
    this.mushika.update(dt, { running: false, baseY: 0, celebrate: false });
    this.mushika.group.rotation.y = t * 0.6;
    this.mushika.group.position.set(
      -1.4 + Math.sin(t * 0.7) * 0.3,
      0,
      1.2 + Math.cos(t * 0.7) * 0.2
    );
    // slow ground scroll for life
    this._scrollGround(dt, 3);
    this._lerpTheme(dt, STAGES[0]);
  }

  _updateGameOver(dt) {
    this.ganesha.update(dt, { running: false, blessing: 0.2 });
    this.ganesha.group.rotation.y += (0 - this.ganesha.group.rotation.y) * dt * 2;
    this.mushika.update(dt, { running: false, baseY: 0 });
    this.mushika.group.position.lerp(
      new THREE.Vector3(this.px - 1.2, 0, 1.0),
      dt * 3
    );
    this.mushika.group.rotation.y = Math.PI;
  }

  _updatePlaying(dt) {
    // speed ramp
    this.speed = Math.min(30, this.baseSpeed + this.distance * 0.006);
    let effSpeed = this.speed;

    // events
    this._updateEvent(dt);
    if (this.activeEvent === "DHOL") effSpeed *= 1.22;

    if (this.blessingActive > 0) {
      this.blessingActive -= dt;
      effSpeed *= 1.28;
      if (this.blessingActive <= 0) this.onEvent("BLESSING_END");
    }
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      effSpeed *= 0.55;
    }

    this.distance += effSpeed * dt * 0.5;

    // score
    let scoreRate = effSpeed * 1.2;
    if (this.goldenTime > 0) {
      this.goldenTime -= dt;
      this.multiplier = 2;
      if (this.goldenTime <= 0) this.multiplier = 1;
    }
    this.score += scoreRate * this.multiplier * dt;

    // ground + world move
    this._scrollGround(dt, effSpeed);
    this._moveObjects(dt, effSpeed);
    this._moveDeco(dt, effSpeed);

    // spawn timing (distance-based)
    this.rowGap = Math.max(5.5, 9 - (this.speed - this.baseSpeed) * 0.18);
    if (this.activeEvent === "DHOL") this.rowGap *= 0.8;
    this.rowTimer += effSpeed * dt;
    if (this.rowTimer >= this.rowGap) {
      this.rowTimer = 0;
      this._spawnRow();
    }
    this.decoTimer += effSpeed * dt;
    if (this.decoTimer >= this.q.decoStep) {
      this.decoTimer = 0;
      this._spawnDeco();
    }

    // player horizontal
    const targetX = LANES[this.lane];
    this.px += (targetX - this.px) * Math.min(1, dt * 12);
    const laneVel = targetX - this.px;

    // vertical (jump)
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
      this.py += this.vy * dt;
      if (this.py <= 0) {
        this.py = 0;
        this.grounded = true;
        this.vy = 0;
        this.audio?.play("land");
        this._squash = 1;
        this.camShake = Math.max(this.camShake, 0.15);
        this.particles.burst("white", this._playerPos(0.1), {
          speed: 2,
          up: 0.5,
          life: 0.4,
          spread: 1,
          gravity: -2,
        });
      }
    }

    // duck timer
    if (this.ducking) {
      this.duckTimer -= dt;
      if (this.duckTimer <= 0) this.ducking = false;
    }

    // timers
    if (this.invuln > 0) this.invuln -= dt;
    if (this.magnet > 0) this.magnet -= dt;
    if (this.stumble > 0) this.stumble -= dt;

    // blessing meter passive UI
    this.blessing = Math.min(100, this.blessing);

    // character
    this.ganesha.group.position.x = this.px;
    this.ganesha.group.position.y = this.py;
    this.ganesha.update(dt, {
      running: true,
      grounded: this.grounded,
      ducking: this.ducking,
      speed: (this.speed - this.baseSpeed) / 16,
      blessing: this.blessingActive > 0 ? 1 : 0,
      stumble: Math.max(0, this.stumble * 2),
    });

    // mushika runs alongside / ahead
    this._updateMushikaRun(dt, effSpeed);

    // stage progression
    this._updateStage(dt);

    // collisions & collection
    this._checkInteractions(dt);

    // flicker lamps in evening / decorations
    this._animateDeco(dt);

    // HUD
    this._pushHud();

    if (this._squash > 0) this._squash -= dt * 4;
  }

  _updateMushikaRun(dt, effSpeed) {
    const ahead = Math.sin(this.clock.elapsedTime * 0.4) > 0.7;
    const celebrate = this.blessingActive > 0;
    let targetX = this.px - 1.6;
    let targetZ = 1.4;
    if (celebrate) {
      targetX = this.px + Math.sin(this.clock.elapsedTime * 3) * 1.2;
      targetZ = 0.6;
    } else if (ahead) {
      targetZ = -3.5;
      targetX = LANES[this.lane] + Math.sin(this.clock.elapsedTime) * 1.5;
    }
    this.mushika.group.position.x +=
      (targetX - this.mushika.group.position.x) * dt * 3;
    this.mushika.group.position.z +=
      (targetZ - this.mushika.group.position.z) * dt * 3;
    this.mushika.group.rotation.y = Math.PI;
    this.mushika.update(dt, { running: true, baseY: 0, celebrate });
  }

  _scrollGround(dt, speed) {
    const total = this.nSeg * this.segLen;
    for (const seg of this.segments) {
      seg.position.z += speed * dt;
      if (seg.position.z > this.segLen) seg.position.z -= total;
    }
  }

  _moveObjects(dt, speed) {
    for (let i = this.activeObjects.length - 1; i >= 0; i--) {
      const o = this.activeObjects[i];
      o.position.z += speed * dt;
      const type = o.userData.type;
      if (type === "modak" || type === "flower" || type === "golden") {
        o.rotation.y += dt * 2.5;
        o.position.y += Math.sin(this.clock.elapsedTime * 3 + o.userData.spin) * dt * 0.3;
        // magnet pull
        if (this.magnet > 0 && !o.userData.collected) {
          const dz = o.position.z;
          if (dz > -12 && dz < 6) {
            const target = new THREE.Vector3(this.px, 1.1 + this.py, 0);
            o.position.lerp(target, dt * 6);
          }
        }
        if (o.userData.glow) {
          o.userData.glow.scale.setScalar(
            1 + Math.sin(this.clock.elapsedTime * 4) * 0.15
          );
        }
      } else if (type === "obstacle") {
        if (o.userData.hRule === "high") {
          // gentle sway
          o.rotation.z = Math.sin(this.clock.elapsedTime * 2) * 0.03;
        }
      }
      if (o.position.z > 12) {
        o.visible = false;
        o.userData.active = false;
        this.activeObjects.splice(i, 1);
      }
    }
  }

  _moveDeco(dt, speed) {
    for (let i = this.activeDeco.length - 1; i >= 0; i--) {
      const o = this.activeDeco[i];
      o.position.z += speed * dt;
      if (o.position.z > 20) {
        o.visible = false;
        o.userData.active = false;
        this.activeDeco.splice(i, 1);
      }
    }
  }

  _animateDeco(dt) {
    const t = this.clock.elapsedTime;
    const evening = this.stageIndex === 3;
    for (const o of this.activeDeco) {
      if (o.userData.key === "lamp" && o.userData.lamp) {
        const base = evening ? 1.4 : 0.5;
        o.userData.lamp.material.emissiveIntensity =
          base + Math.sin(t * 8 + o.position.x) * 0.25;
      } else if (o.userData.key === "crowd") {
        o.children.forEach((p, i) => {
          p.position.y = 0.05 + Math.abs(Math.sin(t * 4 + i)) * 0.15;
        });
      }
    }
  }

  _updateStage(dt) {
    const thresholds = [0, 380, 850, 1400];
    let idx = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (this.distance >= thresholds[i]) idx = i;
    }
    if (idx !== this.stageIndex) {
      this.stageIndex = idx;
      this.onEvent("STAGE", { name: STAGES[idx].name, index: idx });
      this.audio?.play("bell");
    }
    this._lerpTheme(dt, STAGES[this.stageIndex]);
  }

  _lerpTheme(dt, stage) {
    const k = Math.min(1, dt * 0.8);
    lerpColor(this.curSky, new THREE.Color(stage.sky), k);
    lerpColor(this.curFog, new THREE.Color(stage.fog), k);
    lerpColor(this.curGround, new THREE.Color(stage.ground), k);
    this.scene.background.copy(this.curSky);
    this.scene.fog.color.copy(this.curFog);
    this.roadMat.color.copy(this.curGround);
    this.ambient.color.lerp(new THREE.Color(stage.ambient), k);
    this.ambient.intensity += (stage.ambientI - this.ambient.intensity) * k;
    this.sun.color.lerp(new THREE.Color(stage.sun), k);
    this.sun.intensity += (stage.sunI - this.sun.intensity) * k;
  }

  _updateEvent(dt) {
    if (this.activeEvent) {
      this.eventTime -= dt;
      if (this.eventTime <= 0) {
        const ended = this.activeEvent;
        this.activeEvent = null;
        this.eventTimer = 16 + Math.random() * 12;
        if (ended === "FLOWER") this.petals.setVisible(false);
        this.onEvent("EVENT_END", { type: ended });
        this.audio?.setIntensity(1);
      }
      return;
    }
    this.eventTimer -= dt;
    if (this.eventTimer <= 0 && this.distance > 60) {
      this.activeEvent = Math.random() < 0.5 ? "DHOL" : "FLOWER";
      this.eventTime = 10;
      this.audio?.play("event");
      if (this.activeEvent === "DHOL") {
        this.audio?.setIntensity(1.5);
        this.camShake = Math.max(this.camShake, 0.2);
      } else {
        this.petals.setVisible(true);
      }
      this.onEvent("EVENT", { type: this.activeEvent });
    }
  }

  _checkInteractions(dt) {
    const playerTop = this.py + (this.ducking ? 1.0 : 2.0);
    const playerBottom = this.py;
    for (let i = this.activeObjects.length - 1; i >= 0; i--) {
      const o = this.activeObjects[i];
      const dz = o.position.z; // player at z=0
      const dx = Math.abs(o.position.x - this.px);
      const type = o.userData.type;

      if (type === "obstacle") {
        // near-miss detection when passing in adjacent lane
        if (!o.userData.passed && dz > 0.6) {
          o.userData.passed = true;
          const laneDx = Math.abs(o.position.x - LANES[this.lane]);
          const wasDanger =
            (o.userData.hRule === "high" && this.ducking) ||
            (o.userData.hRule === "low" && !this.grounded) ||
            (o.userData.hRule === "full" && !this.grounded);
          if ((laneDx < 1.4 && dx < 1.4) || wasDanger) {
            if (this.invuln <= 0) this._nearMiss(o);
          }
        }
        // collision window
        if (dz > -0.9 && dz < 0.9 && dx < 1.3 && this.invuln <= 0) {
          let hit = false;
          if (o.userData.hRule === "high") {
            if (!this.ducking) hit = true;
          } else if (o.userData.hRule === "low") {
            if (this.py < 0.55) hit = true;
          } else {
            // full
            if (this.py < 1.05) hit = true;
          }
          if (hit) this._takeHit(o);
        }
      } else {
        // collectible
        if (o.userData.collected) continue;
        const dy = Math.abs(o.position.y - (this.py + 1.1));
        const near = dz > -1.1 && dz < 1.1 && dx < 1.1 && dy < 1.6;
        if (near) this._collect(o, i);
      }
    }
  }

  _collect(o, i) {
    o.userData.collected = true;
    o.visible = false;
    o.userData.active = false;
    this.activeObjects.splice(i, 1);
    const type = o.userData.type;
    const pos = o.position.clone();

    if (type === "flower") {
      this.blessing = Math.min(100, this.blessing + 8);
      this.audio?.play("flower");
      this.particles.burst("orange", pos, { speed: 3, up: 2, life: 0.6, spread: 1.2 });
    } else if (type === "golden") {
      this.goldenTime = 10;
      this.multiplier = 2;
      this.score += 250;
      this.audio?.play("powerup");
      this.onEvent("GOLDEN");
      this.camZoom = Math.max(this.camZoom, 0.6);
      this.particles.burst("gold", pos, { speed: 6, up: 4, life: 1, spread: 2 });
    } else {
      // modak
      this.modaksCollected++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const val = 10 * this.multiplier * (1 + Math.floor(this.combo / 5));
      this.score += val;
      this.audio?.play("collect", { pitch: Math.min(8, this.combo) });
      this.particles.burst("gold", pos, { speed: 3, up: 2.5, life: 0.6, spread: 1.2 });
      if (this.combo > 1 && this.combo % 2 === 0) {
        this.audio?.play("combo", { level: this.combo });
        this.onEvent("COMBO", { combo: this.combo });
      }
      this.camShake = Math.max(this.camShake, 0.05);
    }
  }

  _nearMiss(o) {
    this.score += 25 * this.multiplier;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.slowmo = 0.25;
    this.camShake = Math.max(this.camShake, 0.08);
    this.audio?.play("nearmiss");
    this.onEvent("NEARMISS");
    this.particles.burst("white", this._playerPos(1.2), {
      speed: 4,
      up: 1,
      life: 0.5,
      spread: 1.5,
      gravity: -1,
    });
  }

  _takeHit(o) {
    o.userData.passed = true;
    this.lives--;
    this.combo = 0;
    this.invuln = 1.6;
    this.stumble = 0.6;
    this.camShake = Math.max(this.camShake, 0.4);
    this.audio?.play("hit");
    this.onEvent("HIT", { lives: this.lives });
    this.particles.burst("red", this._playerPos(1.2), {
      speed: 5,
      up: 2,
      life: 0.6,
      spread: 2,
    });
    // knock obstacle away visually
    o.userData.passed = true;
    if (this.lives <= 0) {
      this._pushHud(true);
      this.gameOver();
    }
  }

  // ---------- camera ----------
  _updateCamera(dt) {
    const t = this.clock.elapsedTime;
    if (this.state === "menu") {
      const r = 9;
      this.camera.position.set(
        Math.sin(t * 0.15) * 3,
        3.2 + Math.sin(t * 0.3) * 0.3,
        r
      );
      this.camera.lookAt(0.3, 1.6, 0);
      return;
    }
    if (this.state === "gameover") {
      this.camera.position.lerp(new THREE.Vector3(this.px, 2.6, 5.5), dt * 2);
      this.camera.lookAt(this.px, 1.4, 0);
      return;
    }

    // playing: follow behind
    const bob = Math.abs(Math.sin(t * 8)) * 0.08;
    const targetPos = new THREE.Vector3(
      this.px * 0.5,
      4.2 + bob + this.py * 0.15,
      8.6 - this.camZoom * 1.5
    );
    this.camera.position.lerp(targetPos, Math.min(1, dt * 6));

    // shake
    if (this.camShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.camShake;
      this.camera.position.y += (Math.random() - 0.5) * this.camShake;
      this.camShake *= Math.max(0, 1 - dt * 4);
    }
    if (this.camZoom > 0) this.camZoom *= Math.max(0, 1 - dt * 2);

    // dynamic FOV with speed
    const targetFov = 62 + (this.speed - this.baseSpeed) * 0.7 + (this.blessingActive > 0 ? 6 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 3);
    this.camera.updateProjectionMatrix();

    this.camera.lookAt(this.px * 0.4, 1.5 + this.py * 0.2, -6);
    // keep sun shadow following player
    this.sun.position.set(this.px + 6, 14, 4);
    this.sun.target.position.set(this.px, 0, -6);
  }

  // ---------- HUD ----------
  _pushHud(force) {
    this._hudFrame++;
    if (!force && this._hudFrame % 4 !== 0) return;
    this.onHud({
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      combo: this.combo,
      lives: this.lives,
      blessing: this.blessing,
      blessingReady: this.blessing >= 100 && this.blessingActive <= 0,
      blessingActive: this.blessingActive > 0,
      multiplier: this.multiplier,
      golden: this.goldenTime > 0,
      event: this.activeEvent,
      stage: STAGES[this.stageIndex].name,
    });
  }

  _bindResize() {
    this._onResize = () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener("resize", this._onResize);
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._onResize);
    this.audio?.stopMusic();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

export { STAGES };

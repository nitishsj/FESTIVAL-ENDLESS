import * as THREE from "three";

// ---- shared material helpers ----
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.55,
    metalness: opts.metal ?? 0.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
}
const GOLD = () => mat(0xffcf5c, { metal: 0.9, rough: 0.25 });
const SKIN = () => mat(0xf2a3a0, { rough: 0.5 });
const RED = () => mat(0xd6323b, { rough: 0.5 });

// Original stylized Lord Ganesha built from primitives — divine, joyful, respectful.
export class Ganesha {
  constructor(quality = "high") {
    this.quality = quality;
    this.group = new THREE.Group();
    this.runPhase = 0;
    this.lean = 0;
    this.leanTarget = 0;
    this.duckAmt = 0;
    this.stumble = 0;
    this.blessing = 0;
    this._build();
  }

  _build() {
    const g = this.group;

    // pivot for whole body (for duck/lean/squash)
    this.body = new THREE.Group();
    g.add(this.body);

    // torso — draped dhoti + upper body
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 0.5, 6, 12),
      SKIN()
    );
    torso.position.y = 1.15;
    torso.castShadow = true;
    this.body.add(torso);
    this.torso = torso;

    // belly (Ganesha's rounded belly)
    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 16, 14),
      SKIN()
    );
    belly.position.y = 0.9;
    belly.scale.set(1, 0.85, 0.9);
    belly.castShadow = true;
    this.body.add(belly);

    // dhoti (lower yellow garment)
    const dhoti = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.72, 0.7, 16),
      mat(0xffc93c, { rough: 0.6 })
    );
    dhoti.position.y = 0.5;
    dhoti.castShadow = true;
    this.body.add(dhoti);

    // sash / shawl across chest
    const sash = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.09, 8, 20, Math.PI),
      RED()
    );
    sash.position.set(0, 1.15, 0.05);
    sash.rotation.z = 0.5;
    this.body.add(sash);

    // ---- head group ----
    this.head = new THREE.Group();
    this.head.position.y = 1.95;
    this.body.add(this.head);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 18), SKIN());
    skull.scale.set(1.05, 1, 1);
    skull.castShadow = true;
    this.head.add(skull);

    // trunk (curved tube)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.1, 0.45),
      new THREE.Vector3(0, -0.45, 0.6),
      new THREE.Vector3(0.08, -0.75, 0.5),
      new THREE.Vector3(0.16, -0.9, 0.35),
      new THREE.Vector3(0.1, -1.0, 0.5),
    ]);
    const trunk = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 20, 0.16, 10, false),
      SKIN()
    );
    trunk.castShadow = true;
    this.head.add(trunk);
    this.trunk = trunk;

    // ears (large, flattened)
    const earGeo = new THREE.SphereGeometry(0.42, 14, 12);
    const earL = new THREE.Mesh(earGeo, SKIN());
    earL.scale.set(0.35, 1, 0.9);
    earL.position.set(-0.55, -0.05, -0.05);
    this.head.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.55;
    this.head.add(earR);
    this.earL = earL;
    this.earR = earR;
    // ear inner
    const innerGeo = new THREE.SphereGeometry(0.3, 12, 10);
    [-0.5, 0.5].forEach((x) => {
      const inner = new THREE.Mesh(innerGeo, RED());
      inner.scale.set(0.25, 0.9, 0.8);
      inner.position.set(x, -0.05, 0.02);
      this.head.add(inner);
    });

    // tusks
    const tuskGeo = new THREE.ConeGeometry(0.06, 0.34, 8);
    const tuskMat = mat(0xfff8e6, { rough: 0.3 });
    const tL = new THREE.Mesh(tuskGeo, tuskMat);
    tL.position.set(-0.16, -0.42, 0.42);
    tL.rotation.x = Math.PI * 0.9;
    this.head.add(tL);
    const tR = new THREE.Mesh(tuskGeo, tuskMat);
    tR.position.set(0.16, -0.42, 0.42);
    tR.rotation.x = Math.PI * 0.9;
    this.head.add(tR);

    // eyes (large, expressive, kind)
    const eyeWhite = mat(0xffffff, { rough: 0.2 });
    const eyeGeo = new THREE.SphereGeometry(0.13, 12, 12);
    [-0.2, 0.2].forEach((x) => {
      const e = new THREE.Mesh(eyeGeo, eyeWhite);
      e.position.set(x, 0.12, 0.42);
      e.scale.set(1, 1.1, 0.6);
      this.head.add(e);
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 10),
        mat(0x211a12, { rough: 0.2 })
      );
      p.position.set(x, 0.12, 0.52);
      this.head.add(p);
    });

    // tilak on forehead
    const tilak = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.16, 8),
      RED()
    );
    tilak.position.set(0, 0.34, 0.44);
    this.head.add(tilak);

    // crown (mukut) — golden layered
    const crown = new THREE.Group();
    crown.position.y = 0.42;
    const crownBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.5, 0.22, 16),
      GOLD()
    );
    crown.add(crownBase);
    const crownTop = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.55, 16),
      GOLD()
    );
    crownTop.position.y = 0.36;
    crown.add(crownTop);
    const crownJewel = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      mat(0xff3355, { emissive: 0xff2244, emissiveIntensity: 0.6, rough: 0.2 })
    );
    crownJewel.position.set(0, 0.1, 0.4);
    crown.add(crownJewel);
    // crown tip gem
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 10, 10),
      mat(0x66ddff, { emissive: 0x2299cc, emissiveIntensity: 0.5, rough: 0.2 })
    );
    tip.position.y = 0.66;
    crown.add(tip);
    this.head.add(crown);
    this.crown = crown;

    // ---- four arms ----
    this.arms = [];
    const armConfig = [
      { x: -0.62, y: 1.35, z: 0.05, front: true, side: -1 },
      { x: 0.62, y: 1.35, z: 0.05, front: true, side: 1 },
      { x: -0.6, y: 1.45, z: -0.15, front: false, side: -1 },
      { x: 0.6, y: 1.45, z: -0.15, front: false, side: 1 },
    ];
    armConfig.forEach((c, i) => {
      const arm = new THREE.Group();
      arm.position.set(c.x, c.y, c.z);
      const upper = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.12, 0.55, 4, 8),
        SKIN()
      );
      upper.position.y = -0.3;
      upper.castShadow = true;
      arm.add(upper);
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 10, 10),
        SKIN()
      );
      hand.position.y = -0.65;
      arm.add(hand);
      // golden armlet
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.04, 8, 12),
        GOLD()
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.05;
      arm.add(band);
      arm.rotation.z = c.side * 0.35;
      arm.userData = c;
      this.body.add(arm);
      this.arms.push(arm);

      // front-left hand holds a modak
      if (i === 0) {
        const modak = new THREE.Mesh(
          new THREE.ConeGeometry(0.14, 0.2, 10),
          mat(0xffe08a, { rough: 0.4 })
        );
        modak.position.set(0, -0.78, 0.05);
        arm.add(modak);
      }
      // front-right hand holds a lotus
      if (i === 1) {
        const lotus = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 10, 8),
          mat(0xff77aa, { rough: 0.4 })
        );
        lotus.scale.set(1, 0.5, 1);
        lotus.position.set(0, -0.78, 0.05);
        arm.add(lotus);
      }
    });

    // necklace
    const necklace = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.06, 8, 24),
      GOLD()
    );
    necklace.position.set(0, 1.45, 0.15);
    necklace.rotation.x = 1.3;
    this.body.add(necklace);

    // ---- legs ----
    this.legs = [];
    [-0.24, 0.24].forEach((x) => {
      const leg = new THREE.Group();
      leg.position.set(x, 0.45, 0);
      const l = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.16, 0.4, 4, 8),
        SKIN()
      );
      l.position.y = -0.25;
      l.castShadow = true;
      leg.add(l);
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.12, 0.34),
        mat(0xcc7744)
      );
      foot.position.set(0, -0.5, 0.08);
      leg.add(foot);
      // anklet
      const anklet = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.03, 6, 10),
        GOLD()
      );
      anklet.rotation.x = Math.PI / 2;
      anklet.position.y = -0.42;
      leg.add(anklet);
      this.body.add(leg);
      this.legs.push(leg);
    });

    // divine aura (for blessing) — hidden by default
    this.aura = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 20, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffd24a,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.aura.position.y = 1.1;
    this.group.add(this.aura);

    // halo behind head
    this.halo = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.78, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.halo.position.set(0, 1.95, -0.35);
    this.body.add(this.halo);

    this.group.scale.setScalar(0.92);
  }

  setLane(shift) {
    // shift in [-1,1] relative velocity toward a lane change
    this.leanTarget = shift * 0.4;
  }

  // state: { running, grounded, ducking, speed(0..1), blessing(0..1), stumble }
  update(dt, state) {
    const s = state || {};
    // run cycle
    const rate = s.running ? 8 + (s.speed || 0) * 5 : 2;
    this.runPhase += dt * rate;

    // legs swing
    if (this.legs) {
      const a = Math.sin(this.runPhase) * (s.running ? 0.7 : 0.05);
      this.legs[0].rotation.x = a;
      this.legs[1].rotation.x = -a;
    }
    // arms swing (front pair) & sway (back pair)
    if (this.arms) {
      const a = Math.sin(this.runPhase) * 0.3;
      this.arms[0].rotation.x = -a * 0.6;
      this.arms[1].rotation.x = a * 0.6;
      this.arms[2].rotation.z = -0.5 + Math.sin(this.runPhase * 0.5) * 0.05;
      this.arms[3].rotation.z = 0.5 + Math.sin(this.runPhase * 0.5) * 0.05;
    }

    // body bob
    const bob = s.running ? Math.abs(Math.sin(this.runPhase)) * 0.08 : 0;
    // duck smoothing
    const duckTarget = s.ducking ? 1 : 0;
    this.duckAmt += (duckTarget - this.duckAmt) * Math.min(1, dt * 14);
    // graceful lean-forward duck (not floor slide)
    this.body.rotation.x = this.duckAmt * 0.7;
    this.body.position.y = -this.duckAmt * 0.35 + bob;

    // lean into lane changes
    this.lean += (this.leanTarget - this.lean) * Math.min(1, dt * 10);
    this.leanTarget *= Math.max(0, 1 - dt * 4);
    this.body.rotation.z = -this.lean;

    // head gentle sway + trunk sway
    if (this.head) {
      this.head.rotation.z = Math.sin(this.runPhase * 0.5) * 0.05 + this.lean * 0.4;
      this.head.rotation.y = Math.sin(this.runPhase * 0.25) * 0.05;
    }
    if (this.trunk) this.trunk.rotation.z = Math.sin(this.runPhase) * 0.12;

    // stumble shake
    if (s.stumble > 0) {
      this.body.rotation.z += Math.sin(this.runPhase * 30) * 0.15 * s.stumble;
    }

    // blessing aura
    const bl = s.blessing || 0;
    this.aura.material.opacity = bl * 0.35 * (0.7 + Math.sin(this.runPhase * 4) * 0.3);
    this.aura.scale.setScalar(1 + bl * 0.1 + Math.sin(this.runPhase * 3) * 0.03);
    this.halo.material.opacity = bl * 0.8;
    this.halo.rotation.z += dt * 2;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose?.();
    });
  }
}

// Cute stylized Mushika (mouse) companion.
export class Mushika {
  constructor() {
    this.group = new THREE.Group();
    this.phase = Math.random() * 10;
    this._build();
  }

  _build() {
    const fur = mat(0x9aa4b2, { rough: 0.7 });
    const pink = mat(0xffb0c4, { rough: 0.6 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 12), fur);
    body.scale.set(1, 0.85, 1.3);
    body.castShadow = true;
    this.group.add(body);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.12, 0.32);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), fur);
    h.castShadow = true;
    this.head.add(h);
    // ears
    [-0.16, 0.16].forEach((x) => {
      const ear = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), pink);
      ear.position.set(x, 0.18, 0);
      ear.rotation.y = x > 0 ? -0.3 : 0.3;
      this.head.add(ear);
      const back = ear.clone();
      back.material = fur;
      back.rotation.y += Math.PI;
      back.position.z = -0.01;
      this.head.add(back);
    });
    // nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), pink);
    nose.position.set(0, -0.02, 0.22);
    this.head.add(nose);
    // eyes
    [-0.08, 0.08].forEach((x) => {
      const e = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        mat(0x111111, { rough: 0.2 })
      );
      e.position.set(x, 0.05, 0.19);
      this.head.add(e);
    });
    this.group.add(this.head);

    // tail
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -0.35),
      new THREE.Vector3(0.1, 0.1, -0.6),
      new THREE.Vector3(-0.05, 0.25, -0.8),
    ]);
    const tail = new THREE.Mesh(
      new THREE.TubeGeometry(tailCurve, 12, 0.04, 6),
      pink
    );
    this.group.add(tail);
    this.tail = tail;

    // little legs
    this.legs = [];
    [
      [-0.16, -0.24, 0.15],
      [0.16, -0.24, 0.15],
      [-0.16, -0.24, -0.15],
      [0.16, -0.24, -0.15],
    ].forEach((p) => {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.04, 0.12, 3, 6),
        fur
      );
      leg.position.set(p[0], p[1], p[2]);
      this.group.add(leg);
      this.legs.push(leg);
    });

    this.group.scale.setScalar(1);
  }

  update(dt, opts = {}) {
    const run = opts.running ? 16 : 4;
    this.phase += dt * run;
    const hop = opts.running ? Math.abs(Math.sin(this.phase)) * 0.14 : 0;
    this.group.position.y = (opts.baseY || 0) + hop;
    this.head.rotation.z = Math.sin(this.phase * 0.5) * 0.1;
    if (opts.celebrate) {
      this.group.rotation.y += dt * 8;
    }
    if (this.legs) {
      const a = Math.sin(this.phase) * 0.5;
      this.legs[0].rotation.x = a;
      this.legs[1].rotation.x = -a;
      this.legs[2].rotation.x = -a;
      this.legs[3].rotation.x = a;
    }
  }
}

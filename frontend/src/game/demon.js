import * as THREE from "three";

// Original stylized Indian-mythology Rakshasa (demon) antagonist.
// Muscular warrior build, curved horns, fangs, fierce glowing eyes, flowing
// dark hair, warrior dhoti, gold ornaments and a small tail. Param-driven
// procedural animation (run cycle, look-back, obstacle-throw, caught, escape,
// transform) so a state machine can blend between behaviours smoothly.
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.55,
    metalness: opts.metal ?? 0.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
}
const SKIN = () => mat(0x7c1f2e, { rough: 0.5 });
const SKIN2 = () => mat(0x5a1424, { rough: 0.55 });
const GOLD = () => mat(0xffcf5c, { metal: 0.9, rough: 0.25 });
const DARK = () => mat(0x241326, { rough: 0.7 });

export class Demon {
  constructor() {
    this.group = new THREE.Group();
    this.runPhase = 0;
    this.lookBack = 0; // 0..1
    this.place = 0; // 0..1 throw gesture
    this.caught = 0; // 0..1 caught reaction
    this.transform = 0; // 0..1 ending softening
    this._build();
  }

  _build() {
    const g = this.group;
    this.body = new THREE.Group();
    g.add(this.body);

    // torso (muscular)
    this.torso = new THREE.Group();
    this.torso.position.y = 1.35;
    this.body.add(this.torso);
    const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.55, 6, 12), SKIN());
    chest.scale.set(1.15, 1, 0.9);
    chest.castShadow = true;
    this.torso.add(chest);
    const abs = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), SKIN2());
    abs.position.y = -0.5;
    abs.scale.set(1, 0.9, 0.85);
    this.torso.add(abs);
    // chest armor plate
    const plate = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), GOLD());
    plate.rotation.x = Math.PI;
    plate.position.set(0, 0.1, 0.32);
    plate.scale.set(1, 1.1, 0.5);
    this.torso.add(plate);
    // waist ornament
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 8, 20), GOLD());
    belt.rotation.x = Math.PI / 2;
    belt.position.y = -0.75;
    this.torso.add(belt);

    // dhoti (dark warrior cloth)
    const dhoti = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.62, 0.75, 14), DARK());
    dhoti.position.y = 0.55;
    dhoti.castShadow = true;
    this.body.add(dhoti);
    const dhotiTrim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 20), GOLD());
    dhotiTrim.rotation.x = Math.PI / 2;
    dhotiTrim.position.y = 0.22;
    this.body.add(dhotiTrim);

    // ---- head ----
    this.head = new THREE.Group();
    this.head.position.y = 0.55;
    this.torso.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 16), SKIN());
    skull.scale.set(1, 1.05, 1);
    skull.castShadow = true;
    this.head.add(skull);
    // brow ridge (fierce)
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.2), SKIN2());
    brow.position.set(0, 0.12, 0.28);
    brow.rotation.x = -0.3;
    this.head.add(brow);
    // glowing eyes
    [-0.15, 0.15].forEach((x) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 10),
        mat(0xffcc33, { emissive: 0xff8800, emissiveIntensity: 1.6, rough: 0.2 })
      );
      eye.position.set(x, 0.04, 0.3);
      eye.scale.set(1.1, 0.7, 0.7);
      this.head.add(eye);
    });
    this.eyes = this.head.children.slice(-2);
    // mouth + fangs
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.08), DARK());
    mouth.position.set(0, -0.16, 0.32);
    this.head.add(mouth);
    [-0.09, 0.09].forEach((x) => {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), mat(0xfff3e0, { rough: 0.3 }));
      fang.position.set(x, -0.22, 0.33);
      fang.rotation.x = Math.PI;
      this.head.add(fang);
    });
    // curved horns
    const hornMat = mat(0x2a1a12, { rough: 0.4 });
    [-1, 1].forEach((s) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.22, 0.28, 0),
        new THREE.Vector3(s * 0.36, 0.5, -0.05),
        new THREE.Vector3(s * 0.34, 0.72, 0.08),
        new THREE.Vector3(s * 0.22, 0.85, 0.24),
      ]);
      const horn = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.08, 8, false), hornMat);
      this.head.add(horn);
      // gold horn ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 12), GOLD());
      ring.position.set(s * 0.3, 0.45, 0);
      ring.rotation.y = s * 0.4;
      this.head.add(ring);
    });
    // flowing dark hair (back of head)
    this.hair = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const strand = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.6 + Math.random() * 0.3, 6),
        DARK()
      );
      const a = (i / 6 - 0.5) * 1.4;
      strand.position.set(Math.sin(a) * 0.28, 0.05, -0.28 - Math.abs(Math.sin(a)) * 0.05);
      strand.rotation.x = 2.6;
      strand.rotation.z = a * 0.5;
      this.hair.add(strand);
    }
    this.head.add(this.hair);

    // ---- arms ----
    this.arms = [];
    [-1, 1].forEach((s) => {
      const arm = new THREE.Group();
      arm.position.set(s * 0.52, 0.2, 0);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.5, 4, 8), SKIN());
      upper.position.y = -0.32;
      upper.castShadow = true;
      arm.add(upper);
      const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.4, 4, 8), SKIN2());
      fore.position.y = -0.72;
      arm.add(fore);
      const fist = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), SKIN());
      fist.position.y = -0.95;
      arm.add(fist);
      // armlet
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 12), GOLD());
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.1;
      arm.add(band);
      arm.userData.side = s;
      arm.userData.fist = fist;
      this.torso.add(arm);
      this.arms.push(arm);
    });

    // dark energy orb in right hand (for placing obstacles)
    this.orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0x9b30ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.arms[1].userData.fist.add(this.orb);

    // ---- legs ----
    this.legs = [];
    [-0.22, 0.22].forEach((x) => {
      const leg = new THREE.Group();
      leg.position.set(x, 0.9, 0);
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.4, 4, 8), SKIN());
      thigh.position.y = -0.28;
      thigh.castShadow = true;
      leg.add(thigh);
      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.4, 4, 8), SKIN2());
      shin.position.y = -0.68;
      leg.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.36), DARK());
      foot.position.set(0, -0.92, 0.08);
      leg.add(foot);
      const anklet = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 10), GOLD());
      anklet.rotation.x = Math.PI / 2;
      anklet.position.y = -0.85;
      leg.add(anklet);
      this.body.add(leg);
      this.legs.push(leg);
    });

    // tail
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.9, -0.3),
      new THREE.Vector3(0.1, 0.75, -0.55),
      new THREE.Vector3(-0.05, 0.6, -0.75),
      new THREE.Vector3(0.05, 0.5, -0.95),
    ]);
    this.tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 16, 0.06, 6), SKIN2());
    this.body.add(this.tail);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), DARK());
    tailTip.position.set(0.05, 0.42, -1.0);
    this.body.add(tailTip);
    this.tailTip = tailTip;

    // dark aura (dissolves during transform)
    this.aura = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 18, 14),
      new THREE.MeshBasicMaterial({
        color: 0x6a1030,
        transparent: true,
        opacity: 0.0,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.aura.position.y = 1.1;
    g.add(this.aura);

    this.group.scale.setScalar(1.0);
    this.baseScale = 1.0;
  }

  // state: { running, speedFactor, lookBack, place, caught, transform }
  update(dt, state) {
    const s = state || {};
    const running = s.running !== false;
    const rate = 9 + (s.speedFactor || 0) * 5;
    if (running) this.runPhase += dt * rate;

    // smooth param blends
    this.lookBack += ((s.lookBack || 0) - this.lookBack) * Math.min(1, dt * 8);
    this.place += ((s.place || 0) - this.place) * Math.min(1, dt * 10);
    this.caught += ((s.caught || 0) - this.caught) * Math.min(1, dt * 6);
    this.transform += ((s.transform || 0) - this.transform) * Math.min(1, dt * 3);

    const swing = running ? Math.sin(this.runPhase) : 0;
    // legs
    if (this.legs) {
      this.legs[0].rotation.x = swing * 0.8;
      this.legs[1].rotation.x = -swing * 0.8;
    }
    // arms (dampened during place/caught)
    const armFree = 1 - Math.max(this.place, this.caught);
    if (this.arms) {
      this.arms[0].rotation.x = -swing * 0.5 * armFree;
      // right arm: run swing, or raise/throw when placing
      const throwPose = -2.4 * this.place + Math.sin(this.runPhase * 3) * 0.1 * this.place;
      this.arms[1].rotation.x = (swing * 0.5) * armFree + throwPose;
      // caught: both arms up in surprise
      const up = this.caught * -2.6;
      this.arms[0].rotation.x += up;
      this.arms[1].rotation.x += up * armFree;
      this.arms[0].rotation.z = 0.15 + this.caught * 0.5;
      this.arms[1].rotation.z = -0.15 - this.caught * 0.5;
    }
    // orb glow when placing
    this.orb.material.opacity = this.place * 0.9;
    this.orb.scale.setScalar(0.6 + this.place * 0.9 + Math.sin(this.runPhase * 6) * 0.1 * this.place);

    // body bob + forward lean while running
    const bob = running ? Math.abs(Math.sin(this.runPhase)) * 0.1 : 0;
    this.body.position.y = bob - this.caught * 0.15;
    this.body.rotation.x = running ? 0.12 : 0;

    // torso twist toward Ganesha when looking back
    this.torso.rotation.y = this.lookBack * 1.1;
    // head look-back (turns toward camera / pursuer behind)
    this.head.rotation.y = this.lookBack * 0.7 + this.caught * 0.2;
    this.head.rotation.x = -this.lookBack * 0.15 + this.caught * 0.3;

    // hair + tail secondary motion
    this.hair.children.forEach((h, i) => {
      h.rotation.z = h.userData?.z0 ?? h.rotation.z;
      h.rotation.x = 2.6 + Math.sin(this.runPhase * 2 + i) * 0.15;
    });
    this.tail.rotation.z = Math.sin(this.runPhase * 1.5) * 0.15;
    this.tailTip.position.x = 0.05 + Math.sin(this.runPhase * 1.5) * 0.2;

    // eyes flare on look-back
    this.eyes.forEach((e) => (e.material.emissiveIntensity = 1.4 + this.lookBack * 1.2));

    // aura + transform softening
    this.aura.material.opacity = 0.18 + this.lookBack * 0.12 - this.transform * 0.3;
    if (this.transform > 0) {
      const sc = this.baseScale * (1 - this.transform * 0.55);
      this.group.scale.setScalar(sc);
      this.body.position.y += this.transform * (0.6 + Math.sin(this.runPhase * 2) * 0.1);
      // soften skin toward warm glow
      this.eyes.forEach((e) => (e.material.emissiveIntensity = 1.4 + this.transform * 3));
    } else {
      this.group.scale.setScalar(this.baseScale);
    }
  }
}

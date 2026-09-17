import * as THREE from "three";

// Lightweight GPU-friendly particle bursts using pooled THREE.Points.
// One shared additive material per color-family keeps draw calls low.

class Burst {
  constructor(count) {
    this.count = count;
    this.geom = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.geom.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.life = 0;
    this.maxLife = 1;
    this.active = false;
    this.gravity = -6;
    this.points = null;
  }

  emit(origin, opts) {
    const spread = opts.spread ?? 1.2;
    const speed = opts.speed ?? 3;
    const up = opts.up ?? 2;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.positions[i3] = origin.x + (Math.random() - 0.5) * 0.2;
      this.positions[i3 + 1] = origin.y + (Math.random() - 0.5) * 0.2;
      this.positions[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.2;
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      this.velocities[i3] = Math.cos(ang) * r * speed;
      this.velocities[i3 + 1] = up + Math.random() * speed;
      this.velocities[i3 + 2] = Math.sin(ang) * r * speed;
    }
    this.gravity = opts.gravity ?? -6;
    this.maxLife = opts.life ?? 0.8;
    this.life = this.maxLife;
    this.active = true;
    this.geom.attributes.position.needsUpdate = true;
    if (this.points) {
      this.points.visible = true;
      this.points.position.set(0, 0, 0);
    }
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      if (this.points) this.points.visible = false;
      return;
    }
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.velocities[i3 + 1] += this.gravity * dt;
      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;
    }
    this.geom.attributes.position.needsUpdate = true;
    const k = this.life / this.maxLife;
    if (this.points) this.points.material.opacity = k;
  }
}

export class Particles {
  constructor(scene, quality) {
    this.scene = scene;
    this.quality = quality;
    const per = quality === "low" ? 14 : quality === "medium" ? 24 : 40;
    this.perBurst = per;
    this.pool = {};
    this.materials = {};
    this._makeFamily("gold", 0xffcc33, per);
    this._makeFamily("orange", 0xff7722, per);
    this._makeFamily("white", 0xffffff, per);
    this._makeFamily("pink", 0xff5588, per);
    this._makeFamily("red", 0xff3344, per);
  }

  _makeFamily(name, color, per) {
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.28,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.materials[name] = mat;
    const n = this.quality === "low" ? 5 : 8;
    this.pool[name] = [];
    for (let i = 0; i < n; i++) {
      const b = new Burst(per);
      const pts = new THREE.Points(b.geom, mat);
      pts.frustumCulled = false;
      pts.visible = false;
      b.points = pts;
      this.scene.add(pts);
      this.pool[name].push(b);
    }
  }

  burst(family, origin, opts = {}) {
    const arr = this.pool[family] || this.pool.gold;
    const b = arr.find((x) => !x.active) || arr[0];
    b.emit(origin, opts);
  }

  update(dt) {
    for (const key in this.pool) {
      const arr = this.pool[key];
      for (let i = 0; i < arr.length; i++) arr[i].update(dt);
    }
  }
}

// Continuous falling-petals / confetti field for stages & flower shower.
export class PetalField {
  constructor(scene, count, colors) {
    this.scene = scene;
    this.count = count;
    this.geom = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3);
    this.speed = new Float32Array(count);
    const colorArr = new Float32Array(count * 3);
    const palette = (colors || [0xff8822, 0xffcc33, 0xff4466]).map(
      (c) => new THREE.Color(c)
    );
    for (let i = 0; i < count; i++) {
      this.pos[i * 3] = (Math.random() - 0.5) * 30;
      this.pos[i * 3 + 1] = Math.random() * 20;
      this.pos[i * 3 + 2] = -Math.random() * 90;
      this.speed[i] = 1.5 + Math.random() * 2.5;
      const c = palette[i % palette.length];
      colorArr[i * 3] = c.r;
      colorArr[i * 3 + 1] = c.g;
      colorArr[i * 3 + 2] = c.b;
    }
    this.geom.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geom.setAttribute("color", new THREE.BufferAttribute(colorArr, 3));
    this.mat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geom, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
    this.t = 0;
  }

  setVisible(v) {
    this.points.visible = v;
  }

  update(dt, worldSpeed) {
    if (!this.points.visible) return;
    this.t += dt;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      this.pos[i3 + 1] -= this.speed[i] * dt;
      this.pos[i3] += Math.sin(this.t + i) * dt * 0.6;
      this.pos[i3 + 2] += worldSpeed * dt;
      if (this.pos[i3 + 1] < 0 || this.pos[i3 + 2] > 12) {
        this.pos[i3 + 1] = 18 + Math.random() * 4;
        this.pos[i3] = (Math.random() - 0.5) * 30;
        this.pos[i3 + 2] = -60 - Math.random() * 30;
      }
    }
    this.geom.attributes.position.needsUpdate = true;
  }
}

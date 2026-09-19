import * as THREE from "three";

// Dramatic Himalayan mountain ranges + snow, sitting behind the festival road.
// A large ring of layered peaks surrounds the play area for epic scale; peaks
// poke through the fog for a moody horizon. Per-level tint is lerped in.
export class MountainBackdrop {
  constructor(scene, quality) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.tint = new THREE.Color(0x2a3550);
    this.snowColor = new THREE.Color(0xffffff);

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x2a3550,
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
    this.rockMat = rockMat;
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf3f6ff,
      roughness: 0.9,
      flatShading: true,
    });
    this.snowMat = snowMat;

    // three concentric rings of peaks for depth/parallax
    const rings = [
      { r: 70, n: 22, h: 26, w: 16, y: -2 },
      { r: 100, n: 26, h: 38, w: 22, y: -4 },
      { r: 135, n: 30, h: 52, w: 30, y: -6 },
    ];
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.n; i++) {
        const a = (i / ring.n) * Math.PI * 2 + (ri * 0.3);
        // bias peaks toward the front (into -z) so the road runs into mountains
        const h = ring.h * (0.6 + Math.random() * 0.6);
        const w = ring.w * (0.7 + Math.random() * 0.5);
        const peak = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5, 1), rockMat);
        peak.position.set(
          Math.sin(a) * ring.r + (Math.random() - 0.5) * 10,
          ring.y + h / 2,
          -Math.abs(Math.cos(a)) * ring.r - 20 + Math.sin(a) * 6
        );
        peak.rotation.y = Math.random() * Math.PI;
        this.group.add(peak);
        // snow cap
        const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.42, h * 0.32, 5, 1), snowMat);
        cap.position.set(peak.position.x, peak.position.y + h * 0.34, peak.position.z);
        cap.rotation.y = peak.rotation.y;
        this.group.add(cap);
      }
    });

    // snow particles (subtle) — denser at higher quality
    const count = quality === "low" ? 0 : quality === "medium" ? 140 : 260;
    this.snow = null;
    if (count > 0) {
      const geom = new THREE.BufferGeometry();
      this.snowPos = new Float32Array(count * 3);
      this.snowVel = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        this.snowPos[i * 3] = (Math.random() - 0.5) * 60;
        this.snowPos[i * 3 + 1] = Math.random() * 30;
        this.snowPos[i * 3 + 2] = -Math.random() * 90;
        this.snowVel[i] = 1 + Math.random() * 2;
      }
      geom.setAttribute("position", new THREE.BufferAttribute(this.snowPos, 3));
      const smat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.25,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      this.snow = new THREE.Points(geom, smat);
      this.snow.frustumCulled = false;
      this.snow.visible = false;
      scene.add(this.snow);
      this.snowGeom = geom;
      this.snowN = count;
    }
    this.t = 0;
  }

  setSnow(v) {
    if (this.snow) this.snow.visible = v;
  }

  setTint(hexRock, hexSnow) {
    this.tint.set(hexRock);
    if (hexSnow) this.snowColor.set(hexSnow);
  }

  update(dt, camX) {
    this.t += dt;
    // keep the ring centred on the player horizontally (horizon effect)
    this.group.position.x += (camX * 0.6 - this.group.position.x) * Math.min(1, dt * 2);
    this.rockMat.color.lerp(this.tint, Math.min(1, dt * 0.6));
    this.snowMat.color.lerp(this.snowColor, Math.min(1, dt * 0.6));
    if (this.snow && this.snow.visible) {
      for (let i = 0; i < this.snowN; i++) {
        const i3 = i * 3;
        this.snowPos[i3 + 1] -= this.snowVel[i] * dt;
        this.snowPos[i3] += Math.sin(this.t + i) * dt * 0.4;
        if (this.snowPos[i3 + 1] < 0) {
          this.snowPos[i3 + 1] = 28 + Math.random() * 4;
          this.snowPos[i3] = (Math.random() - 0.5) * 60;
          this.snowPos[i3 + 2] = -Math.random() * 90;
        }
      }
      this.snowGeom.attributes.position.needsUpdate = true;
    }
  }
}

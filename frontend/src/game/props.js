import * as THREE from "three";

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.6,
    metalness: opts.metal ?? 0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
}

// ---------- COLLECTIBLES ----------

// Beautiful stylized modak (dumpling with pleated top)
export function buildModak(golden = false) {
  const g = new THREE.Group();
  const color = golden ? 0xffd23a : 0xf6d68a;
  const base = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    mat(color, {
      rough: golden ? 0.2 : 0.45,
      metal: golden ? 0.8 : 0.1,
      emissive: golden ? 0xffa000 : 0x552200,
      emissiveIntensity: golden ? 0.5 : 0.15,
    })
  );
  base.position.y = -0.05;
  g.add(base);
  // pleated cone top
  const top = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.34, 10),
    mat(color, {
      rough: golden ? 0.2 : 0.45,
      metal: golden ? 0.8 : 0.1,
      emissive: golden ? 0xffa000 : 0x552200,
      emissiveIntensity: golden ? 0.5 : 0.15,
    })
  );
  top.position.y = 0.2;
  g.add(top);
  // tip
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    mat(golden ? 0xfff2b0 : 0xffcc66)
  );
  tip.position.y = 0.4;
  g.add(tip);

  if (golden) {
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffcc33,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    g.add(glow);
    g.userData.glow = glow;
  }
  g.userData.golden = golden;
  g.userData.type = golden ? "golden" : "modak";
  return g;
}

// Marigold-inspired flower collectible
export function buildFlower() {
  const g = new THREE.Group();
  const petalMat = mat(0xff8a1e, { rough: 0.5, emissive: 0x662200, emissiveIntensity: 0.2 });
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), mat(0xffcc33));
  g.add(center);
  const N = 8;
  for (let i = 0; i < N; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), petalMat);
    petal.scale.set(0.7, 0.4, 1.1);
    const a = (i / N) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16);
    g.add(petal);
  }
  // second ring
  for (let i = 0; i < N; i++) {
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      mat(0xffb43a, { rough: 0.5 })
    );
    petal.scale.set(0.6, 0.35, 0.9);
    const a = (i / N) * Math.PI * 2 + 0.3;
    petal.position.set(Math.cos(a) * 0.1, 0.08, Math.sin(a) * 0.1);
    g.add(petal);
  }
  g.userData.type = "flower";
  return g;
}

// ---------- OBSTACLES ----------
// type: "box"(jump/dodge), "low"(jump over), "high"(duck under), "wide"(dodge)
export function buildObstacle(type) {
  const g = new THREE.Group();
  if (type === "drum") {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.9, 18),
      mat(0xb5342a, { rough: 0.5 })
    );
    barrel.position.y = 0.45;
    barrel.castShadow = true;
    g.add(barrel);
    [0.15, 0.9].forEach((y) => {
      const head = new THREE.Mesh(
        new THREE.CylinderGeometry(0.44, 0.44, 0.06, 18),
        mat(0xf2e2c0)
      );
      head.position.y = y;
      g.add(head);
    });
    // zig-zag rope lacing
    const rope = new THREE.Mesh(
      new THREE.TorusGeometry(0.43, 0.03, 6, 20),
      mat(0xffcf5c, { metal: 0.6 })
    );
    rope.rotation.x = Math.PI / 2;
    rope.position.y = 0.45;
    g.add(rope);
    g.userData.h = "full";
  } else if (type === "box") {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.85, 0.85),
      mat(0xb07840, { rough: 0.7 })
    );
    box.position.y = 0.45;
    box.castShadow = true;
    g.add(box);
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.12, 0.9),
      mat(0x7a4b1e)
    );
    strap.position.y = 0.45;
    g.add(strap);
    g.userData.h = "full";
  } else if (type === "low") {
    // low barrier — must jump
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.45, 0.4),
      mat(0xd94f4f, { rough: 0.5 })
    );
    bar.position.y = 0.25;
    bar.castShadow = true;
    g.add(bar);
    [-0.7, 0.7].forEach((x) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.55, 8),
        mat(0xffcf5c, { metal: 0.6 })
      );
      post.position.set(x, 0.28, 0);
      g.add(post);
    });
    g.userData.h = "low";
  } else if (type === "high") {
    // overhead garland/banner — must duck
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.25, 0.3),
      mat(0xff8a1e, { rough: 0.5 })
    );
    beam.position.y = 1.55;
    beam.castShadow = true;
    g.add(beam);
    for (let i = 0; i < 7; i++) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        mat(0xffb43a)
      );
      drop.position.set(-0.9 + i * 0.3, 1.35, 0);
      g.add(drop);
    }
    [-1.0, 1.0].forEach((x) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 1.8, 8),
        mat(0x8a5a2a)
      );
      pole.position.set(x, 0.9, 0);
      g.add(pole);
    });
    g.userData.h = "high";
  } else {
    // cart (wide low)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.55, 0.8),
      mat(0x9c6b3a, { rough: 0.7 })
    );
    body.position.y = 0.5;
    body.castShadow = true;
    g.add(body);
    [-0.45, 0.45].forEach((x) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.1, 14),
        mat(0x333333)
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.24, 0.42);
      g.add(wheel);
      const wheel2 = wheel.clone();
      wheel2.position.z = -0.42;
      g.add(wheel2);
    });
    g.userData.h = "full";
  }
  g.userData.type = "obstacle";
  return g;
}

// ---------- DECORATIONS (roadside props) ----------
export function buildStreetLamp(evening) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 3.2, 10),
    mat(0x3a3a44, { metal: 0.6, rough: 0.4 })
  );
  pole.position.y = 1.6;
  g.add(pole);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 12),
    mat(0xfff0b0, {
      emissive: evening ? 0xffaa33 : 0xffddaa,
      emissiveIntensity: evening ? 1.4 : 0.5,
    })
  );
  lamp.position.y = 3.2;
  g.add(lamp);
  g.userData.lamp = lamp;
  return g;
}

export function buildHouse(palette) {
  const g = new THREE.Group();
  const c = palette[Math.floor(Math.random() * palette.length)];
  const h = 2.4 + Math.random() * 2.2;
  const w = 2.6 + Math.random() * 1.2;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3), mat(c, { rough: 0.85 }));
  wall.position.y = h / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);
  // roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.8, 0.9, 4),
    mat(0x8a3b2a, { rough: 0.8 })
  );
  roof.position.y = h + 0.4;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  // windows glowing
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < Math.floor(h / 1.2); j++) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.5, 0.05),
        mat(0xffd27a, { emissive: 0xffaa33, emissiveIntensity: 0.6 })
      );
      win.position.set(-0.6 + i * 1.2, 0.8 + j * 1.2, 1.5);
      g.add(win);
    }
  }
  // marigold garland across front
  const garland = new THREE.Mesh(
    new THREE.TorusGeometry(w * 0.42, 0.06, 6, 20, Math.PI),
    mat(0xff8a1e, { emissive: 0x662200, emissiveIntensity: 0.2 })
  );
  garland.position.set(0, h - 0.3, 1.5);
  garland.rotation.z = Math.PI;
  g.add(garland);
  return g;
}

export function buildPandal() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.3, 3),
    mat(0xd94f4f)
  );
  base.position.y = 0.15;
  g.add(base);
  [-1.4, 1.4].forEach((x) => {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 3, 12),
      mat(0xffcf5c, { metal: 0.5 })
    );
    col.position.set(x, 1.6, 1.3);
    g.add(col);
    const col2 = col.clone();
    col2.position.z = -1.3;
    g.add(col2);
  });
  // domed top
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.9, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mat(0xff6a3d, { rough: 0.5, emissive: 0x330800, emissiveIntensity: 0.2 })
  );
  dome.position.y = 3.1;
  g.add(dome);
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 1.0, 12),
    mat(0xffcf5c, { metal: 0.7 })
  );
  spire.position.y = 4.4;
  g.add(spire);
  return g;
}

export function buildArch() {
  const g = new THREE.Group();
  const matA = mat(0xff8a1e, { emissive: 0x331100, emissiveIntensity: 0.25 });
  [-2.6, 2.6].forEach((x) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 4.6, 12), matA);
    p.position.set(x, 2.3, 0);
    g.add(p);
  });
  const top = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.2, 8, 24, Math.PI),
    matA
  );
  top.position.y = 4.6;
  g.add(top);
  // hanging lights
  for (let i = 0; i < 9; i++) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      mat(0xffee88, { emissive: 0xffcc33, emissiveIntensity: 1.2 })
    );
    const a = (i / 8) * Math.PI;
    bulb.position.set(Math.cos(a) * 2.6, 4.6 + Math.sin(a) * 2.6 - 0.3, 0);
    g.add(bulb);
  }
  return g;
}

// crowd silhouette billboards for procession/festival
export function buildCrowd() {
  const g = new THREE.Group();
  const colors = [0x4455aa, 0xaa4466, 0x338866, 0xcc8833, 0x8844aa];
  for (let i = 0; i < 6; i++) {
    const c = colors[Math.floor(Math.random() * colors.length)];
    const person = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.5, 4, 8),
      mat(c, { rough: 0.9 })
    );
    body.position.y = 0.6;
    person.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 10),
      mat(0xdda877)
    );
    head.position.y = 1.05;
    person.add(head);
    person.position.set((Math.random() - 0.5) * 2.5, 0, (Math.random() - 0.5) * 1.5);
    person.userData.phase = Math.random() * 10;
    g.add(person);
  }
  return g;
}

// ---------- DEMON-THROWN OBSTACLES ----------

// Large rock/boulder — dodge by lane or jump. hRule "full".
export function buildStone() {
  const g = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x6b6a72,
    roughness: 1,
    metalness: 0.05,
    flatShading: true,
  });
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), rockMat);
  // jitter vertices for a natural boulder
  const pos = rock.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) * (0.85 + Math.random() * 0.4),
      pos.getY(i) * (0.85 + Math.random() * 0.4),
      pos.getZ(i) * (0.85 + Math.random() * 0.4)
    );
  }
  rock.geometry.computeVertexNormals();
  rock.position.y = 0.55;
  rock.scale.set(1.25, 1, 1.1);
  rock.castShadow = true;
  g.add(rock);
  const moss = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.66, 1),
    new THREE.MeshStandardMaterial({ color: 0x4a5a34, roughness: 1, flatShading: true, transparent: true, opacity: 0.5 })
  );
  moss.position.y = 0.62;
  moss.scale.set(1.2, 0.5, 1.05);
  g.add(moss);
  g.userData.type = "obstacle";
  g.userData.kind = "stone";
  return g;
}

// Crackling lightning pillar — dodge by switching lane only (tall). hRule "tall".
export function buildLightning() {
  const g = new THREE.Group();
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x8ad8ff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  // jagged bolt built from thin segments
  const bolt = new THREE.Group();
  let y = 0.1;
  let x = 0;
  for (let i = 0; i < 7; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), glowMat);
    const nx = (Math.random() - 0.5) * 0.4;
    seg.position.set((x + nx) / 2, y + 0.25, 0);
    seg.rotation.z = (nx) * 1.2;
    bolt.add(seg);
    x = nx;
    y += 0.45;
  }
  g.add(bolt);
  g.userData.bolt = bolt;
  // core glow column
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.4, 10), glowMat.clone());
  core.material.opacity = 0.35;
  core.position.y = 1.7;
  g.add(core);
  // ground burst ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.62, 24),
    new THREE.MeshBasicMaterial({ color: 0x8ad8ff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  g.add(ring);
  g.userData.ring = ring;
  // point light for real-time glow
  const light = new THREE.PointLight(0x66ccff, 2.2, 8);
  light.position.y = 1.6;
  g.add(light);
  g.userData.light = light;
  g.userData.type = "obstacle";
  g.userData.kind = "lightning";
  return g;
}

// Floating warrior sword held horizontally — slide/duck underneath. hRule "high".
export function buildSword() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xd7dbe4, roughness: 0.25, metalness: 0.95 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffcf5c, roughness: 0.3, metalness: 0.9 });
  // blade spans across the lanes horizontally
  const blade = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.1, 0.26), steel);
  blade.castShadow = true;
  g.add(blade);
  // blade edge taper (tip)
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 4), steel);
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 2.95;
  g.add(tip);
  // fuller groove
  const groove = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.03, 0.06), gold);
  groove.position.y = 0.02;
  g.add(groove);
  // guard + hilt on the left end
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.5), gold);
  guard.position.x = -2.75;
  g.add(guard);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 10), new THREE.MeshStandardMaterial({ color: 0x5a2a16, roughness: 0.7 }));
  grip.rotation.z = Math.PI / 2;
  grip.position.x = -3.1;
  g.add(grip);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), gold);
  pommel.position.x = -3.42;
  g.add(pommel);
  // menacing glow edge
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.04, 0.34),
    new THREE.MeshBasicMaterial({ color: 0xff6644, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  glow.position.y = -0.05;
  g.add(glow);
  g.userData.glow = glow;
  g.userData.type = "obstacle";
  g.userData.kind = "sword";
  return g;
}

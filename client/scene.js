import * as THREE from 'three';
import { generateMap, hazardTransform, crownHeight } from '../shared/maps.js';

const UP = new THREE.Vector3(0, 1, 0);
export class GameScene {
  constructor(canvas, renderer = null) {
    this.canvas = canvas;
    this.renderer = renderer || new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 420);
    this.camera.position.set(25, 18, 28);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x7370a1, 2.4));
    const sun = new THREE.DirectionalLight(0xfffaf3, 3.2); sun.position.set(-18, 35, 20); this.scene.add(sun);
    this.materials = new Map(); this.avatars = new Map();
    this.geometries = {
      box: new THREE.BoxGeometry(1, 1, 1), sphere: new THREE.IcosahedronGeometry(1, 1),
      capsule: new THREE.CapsuleGeometry(0.44, 0.7, 4, 8), limb: new THREE.CapsuleGeometry(0.13, 0.35, 2, 6),
      face: new THREE.SphereGeometry(1, 12, 8), cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
      shadow: new THREE.CircleGeometry(0.65, 16), cone: new THREE.ConeGeometry(1, 1, 5),
    };
    this.vertexMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.warningMaterial = new THREE.MeshLambertMaterial({ color: '#ff4c6f', flatShading: true });
    this.shadowMaterial = new THREE.MeshBasicMaterial({ color: '#263558', transparent: true, opacity: 0.16, depthWrite: false });
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.target = new THREE.Vector3(); this.desiredCamera = new THREE.Vector3(); this.lookTarget = new THREE.Vector3(); this.lookDesired = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, -1); this.cameraOffset = new THREE.Vector3(); this.cameraShakeOffset = new THREE.Vector3();
    this.projectVector = new THREE.Vector3(); this.menu = true; this.quality = 'balanced'; this.smoothInitialized = false;
    this.cameraFov = 58; this.cameraDistance = 11.5; this.cameraYaw = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.showNames = true; this.showShadows = true;
    window.addEventListener('resize', () => this.resize()); this.resize();
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); document.dispatchEvent(new CustomEvent('render-lost')); });
    canvas.addEventListener('webglcontextrestored', () => location.reload());
    this.loadMap(generateMap({ seed: 'candy-club', round: 0 }));
    this.makeShowcase();
  }
  material(color) {
    if (!this.materials.has(color)) this.materials.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
    return this.materials.get(color);
  }
  mesh(geometry, color, position, scale, parent = this.world) {
    const m = new THREE.Mesh(this.geometries[geometry], this.material(color));
    if (position) m.position.set(...position);
    if (scale) m.scale.set(...scale);
    parent.add(m); return m;
  }
  box(size, top, side, footprint = null) {
    const g = footprint?.radius ? new THREE.CylinderGeometry(footprint.radius, footprint.radius, size[1], footprint.sides || 12) : new THREE.BoxGeometry(...size);
    const n = g.getAttribute('normal'), colors = [], c = new THREE.Color();
    for (let i = 0; i < n.count; i++) { c.set(n.getY(i) > 0.5 ? top : side); colors.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const m = new THREE.Mesh(g, this.vertexMaterial); m.userData.ownedGeometry = true; return m;
  }
  clearMap() {
    this.world.traverse(o => { if (o.userData.ownedGeometry) o.geometry.dispose(); if (o.userData.ownedMaterial) { o.material.map?.dispose(); o.material.dispose(); } });
    this.world.clear();
    for (const avatar of this.avatars.values()) avatar.label.remove();
    this.avatars.clear(); this.showcase = null;
  }
  loadMap(map) {
    this.clearMap(); this.map = map; this.platformMeshes = new Map(); this.hazardMeshes = new Map(); this.crown = null;
    const theme = map.theme;
    this.scene.background = new THREE.Color(theme.sky);
    this.scene.fog = new THREE.Fog(theme.fog, 80, 220);
    for (const p of map.platforms) {
      const ice = p.surface === 'ice';
      const mesh = this.box(p.size, ice ? '#d7f5ff' : p.color, theme.edge, p);
      mesh.position.set(...p.position); mesh.rotation.set(...p.rotation); this.world.add(mesh);
      this.platformMeshes.set(p.id, mesh);
      if (p.turntable) {
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2;
          const stripe = this.mesh('box', '#ffffff', [Math.sin(a) * p.radius * 0.63, 0.615, Math.cos(a) * p.radius * 0.63], [0.2, 0.035, p.radius * 0.38], mesh);
          stripe.rotation.y = a + Math.sign(p.turntable) * 0.4;
        }
        this.mesh('cylinder', theme.accent, [0, 0.63, 0], [0.35, 0.1, 0.35], mesh);
      }
      if (p.fragile) {
        for (const side of [-1, 1]) {
          const crack = this.mesh('box', theme.edge, [side * 0.2, 0.615, side * 0.25], [0.055, 0.03, 0.8], mesh);
          crack.rotation.y = side * 0.6;
        }
      }
      if (p.seesaw) {
        this.mesh('cylinder', theme.accent, [p.position[0], p.position[1] - 1.1, p.position[2]], [0.8, 2, 0.8]);
        const stripe = this.mesh('box', '#ffffff', [0, 0.61, 0], [0.15, 0.025, p.size[2] * 0.95], mesh);
        stripe.material = this.material('#ffffff');
      }
      if (p.surface === 'conveyor') {
        for (let j = -3; j <= 3; j++) {
          const stripe = this.mesh('box', theme.edge, [0, 0.62, j * 2.7], [p.size[0] - 1.2, 0.035, 0.16], mesh);
          stripe.rotation.y = 0.15;
        }
      }
      if (p.id === 'start') {
        for (let j = -4; j <= 4; j++) this.mesh('box', '#ffffff', [j * 2, 0.025, -6], [0.9, 0.05, 0.75]);
        this.addArch(0, 0, -7, 18, 'START', theme);
      }
    }
    for (const h of map.hazards) {
      const group = new THREE.Group(); this.world.add(group);
      if (h.radius) {
        if (h.kind === 'log') {
          const log = this.mesh('cylinder', h.color, [0, 0, 0], [h.radius, h.radius * 5.5, h.radius], group); log.rotation.z = Math.PI / 2;
          for (const side of [-1, 1]) {
            const cap = this.mesh('cylinder', theme.secondary, [side * h.radius * 2.75, 0, 0], [h.radius, 0.04, h.radius], group);
            cap.rotation.z = Math.PI / 2;
          }
        } else this.mesh('sphere', h.color, [0, 0, 0], [h.radius, h.radius, h.radius], group);
        if (h.kind === 'bumper') this.mesh('cylinder', theme.secondary, [0, -0.5, 0], [h.radius * 0.8, 0.9, h.radius * 0.8], group);
        if (h.kind === 'roller') {
          const seam = this.mesh('cylinder', theme.secondary, [0, 0, 0], [h.radius * 1.008, 0.2, h.radius * 1.008], group);
          seam.rotation.z = Math.PI / 2;
        }
      } else {
        const box = this.box(h.size, h.color, h.kind === 'door' ? '#db4777' : theme.accent);
        group.add(box);
        if (h.kind === 'door') {
          for (const x of [-0.8, 0.8]) {
            const stripe = this.mesh('box', theme.secondary, [x, 0, h.size[2] / 2 + 0.015], [0.22, h.size[1] * 0.9, 0.025], group); stripe.rotation.z = x > 0 ? -0.3 : 0.3;
          }
        }
        if (h.kind === 'timed-gate') {
          for (const side of [-1, 1]) this.mesh('cylinder', '#ffffff', [h.position[0] + side * h.size[0] / 2, h.position[1] + 2, h.position[2]], [0.075, 7.4, 0.075]);
          this.mesh('box', theme.secondary, [h.position[0], h.position[1] + 5.7, h.position[2]], [h.size[0], 0.2, 0.25]);
          for (const side of [-1, 1]) {
            const stripe = this.mesh('box', '#ffffff', [side * 0.36, 0, 0.25], [0.16, 1, 0.035], group);
            stripe.rotation.z = side * 0.7;
          }
        }
        if (h.kind === 'jump-pad' || h.kind === 'flipper') {
          for (const side of [-1, 1]) {
            const arrow = this.mesh('box', '#ffffff', [side * 0.28, h.size[1] / 2 + 0.025, 0], [0.14, 0.03, 0.9], group);
            arrow.rotation.y = side * 0.6;
          }
        }
        if (['spinner', 'windmill'].includes(h.kind)) {
          for (const side of [-1, 1]) this.mesh('sphere', theme.secondary, [side * h.size[0] / 2, 0, 0], [0.48, 0.48, 0.48], group);
        }
      }
      this.hazardMeshes.set(h.id, group);
      if (h.kind === 'spinner') this.mesh('cylinder', theme.secondary, [h.position[0], h.position[1] + 0.1, h.position[2]], [0.55, 1.1, 0.55]);
      if (['pendulum', 'hammer'].includes(h.kind)) {
        const anchor = [h.position[0], h.position[1] + 7.5, h.position[2]];
        for (const side of [-1, 1]) this.mesh('cylinder', '#ffffff', [h.position[0] + side * 9, h.position[1] + 3, h.position[2]], [0.18, 9, 0.18]);
        this.mesh('box', '#ffffff', anchor, [18.3, 0.28, 0.28]);
        const rope = this.mesh('cylinder', '#ffffff', anchor, [0.055, 7, 0.055]);
        group.userData.rope = rope; group.userData.anchor = new THREE.Vector3(...anchor);
      }
      if (h.kind === 'piston') this.mesh('cylinder', '#ffffff', [h.position[0], h.position[1] + 4, h.position[2]], [0.2, 7.5, 0.2]);
    }
    if (map.finish) {
      const f = map.finish, y = f.y - (f.crown ? 2 : 1);
      if (f.crown) {
        this.crown = this.createCrown(); this.crown.position.set(f.x, f.y, f.z); this.world.add(this.crown);
        this.mesh('cylinder', theme.secondary, [f.x, y + 0.08, f.z], [2.2, 0.16, 2.2]);
      } else this.addArch(f.x, y, f.z, 16, 'FINISH', theme);
      for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) this.mesh('box', (i + j) % 2 ? '#ffffff' : theme.edge, [f.x - 7.5 + i, y + 0.035, f.z + 1.2 + j], [1, 0.06, 1]);
    }
    // Visible checkpoints make the safe route and the next respawn readable.
    this.checkpointMarkers = [];
    for (const c of map.checkpoints.slice(1)) {
      const marker = new THREE.Group(); marker.position.set(c.x, c.y - 1.1, c.z);
      for (const side of [-1, 1]) {
        this.mesh('cylinder', '#ffffff', [side * (c.width / 2 - 0.5), 1.3, 0], [0.09, 2.6, 0.09], marker);
        this.mesh('box', '#65eac5', [side * (c.width / 2 - 0.95), 2.3, 0], [0.9, 0.6, 0.08], marker);
      }
      this.world.add(marker); this.checkpointMarkers.push(marker);
    }
    const under = this.mesh('box', map.slime ? '#ff72bb' : '#77cdda', [0, -17, -map.length / 2], [700, 1, 650]);
    this.slimeMesh = map.slime ? under : null;
    // Cheap distant scenery: low-poly clouds and floating islands, no texture fetches.
    for (let i = 0; i < 15; i++) {
      const x = (i % 2 ? -1 : 1) * (24 + i % 4 * 9), z = -i * 18 + 15;
      const island = this.mesh('cone', theme.edge, [x, -5 - i % 3, z], [4 + i % 3, 6, 4 + i % 3]); island.rotation.z = Math.PI;
      this.mesh('cylinder', theme.floor, [x, -2 - i % 3, z], [4 + i % 3, 0.6, 4 + i % 3]);
      if (map.decor === 'crystals') {
        for (let j = 0; j < 3; j++) this.mesh('cone', j % 2 ? theme.secondary : theme.accent, [x + j * 1.8, 1 + j, z - 3], [1.1, 6 + j * 2, 1.1]);
      } else if (map.decor === 'towers') {
        this.mesh('box', theme.secondary, [x, 3, z], [4, 9 + i % 3 * 3, 4]);
        this.mesh('box', theme.accent, [x, 8 + i % 3 * 1.5, z], [5, 1, 5]);
      } else if (map.decor === 'balloons' && i % 2 === 0) {
        this.mesh('sphere', i % 4 ? theme.accent : theme.secondary, [x, 12, z], [3.2, 3.8, 3.2]);
        this.mesh('cylinder', '#ffffff', [x, 6, z], [0.045, 7, 0.045]);
      } else if (i % 2 === 0) for (let j = 0; j < 3; j++) this.mesh('sphere', '#eaf5ff', [x + j * 2, 8 + i % 3 * 3, z - 16], [3.2, 1.7, 2.1]);
    }
    this.smoothInitialized = false;
  }
  addArch(x, y, z, width, text, theme) {
    for (const side of [-1, 1]) {
      this.mesh('cylinder', '#ffffff', [x + side * width / 2, y + 3.3, z], [0.3, 6.6, 0.3]);
      this.mesh('sphere', theme.secondary, [x + side * width / 2, y + 6.7, z], [0.5, 0.5, 0.5]);
    }
    this.mesh('box', theme.accent, [x, y + 6.1, z], [width, 1.15, 0.5]);
    // Canvas-generated lettering stays local and adds only one tiny texture per arch.
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.font = '900 48px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 34);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.66, 0.82), material);
    label.position.set(x, y + 6.1, z + 0.26); label.userData.ownedGeometry = true; label.userData.ownedMaterial = true; this.world.add(label);
  }
  createCrown() {
    const group = new THREE.Group();
    this.mesh('cylinder', '#ffd154', [0, 0, 0], [0.7, 0.5, 0.7], group);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      this.mesh('cone', '#ffe38a', [Math.sin(a) * 0.55, 0.5, Math.cos(a) * 0.55], [0.28, 0.85, 0.28], group);
      this.mesh('sphere', '#ff718f', [Math.sin(a) * 0.55, 0.9, Math.cos(a) * 0.55], [0.12, 0.12, 0.12], group);
    }
    return group;
  }
  makeBean(color) {
    const root = new THREE.Group(), model = new THREE.Group(); root.add(model);
    this.mesh('capsule', color, null, null, model);
    this.mesh('face', '#fff4e9', [0, 0.12, -0.375], [0.32, 0.35, 0.12], model);
    for (const x of [-0.12, 0.12]) this.mesh('face', '#202445', [x, 0.17, -0.485], [0.047, 0.085, 0.025], model);
    const arms = [], feet = [];
    for (const side of [-1, 1]) {
      const arm = this.mesh('limb', color, [side * 0.49, -0.1, 0], null, model); arm.rotation.z = side * 0.45; arms.push(arm);
      feet.push(this.mesh('face', color, [side * 0.23, -0.72, -0.08], [0.2, 0.13, 0.27], model));
    }
    const shadow = new THREE.Mesh(this.geometries.shadow, this.shadowMaterial); shadow.rotation.x = -Math.PI / 2; root.add(shadow);
    root.userData = { model, arms, feet, shadow, color }; return root;
  }
  makeShowcase() {
    this.showcase = new THREE.Group();
    const pedestal = this.mesh('cylinder', '#ffd158', [10, 1.5, 5], [3.5, 1.2, 3.5], this.showcase);
    this.mesh('cylinder', '#f6a82f', [10, 0.8, 5], [3.3, 0.6, 3.3], this.showcase);
    this.menuBean = this.makeBean('#ff658c'); this.menuBean.position.set(10, 4.5, 5); this.menuBean.scale.setScalar(3); this.showcase.add(this.menuBean);
    const crown = this.createCrown(); crown.position.set(10, 8.7, 5); crown.scale.setScalar(0.8); this.showcase.add(crown); this.menuCrown = crown;
    this.world.add(this.showcase);
  }
  setMenuColor(color) {
    if (!this.menuBean) return;
    this.menuBean.traverse(m => { if (m.isMesh && m.material === this.material(this.menuBean.userData.color)) m.material = this.material(color); });
    this.menuBean.userData.color = color;
  }
  addAvatar(player, me) {
    if (this.avatars.has(player.id)) return this.avatars.get(player.id);
    const root = this.makeBean(player.color); this.world.add(root);
    const label = document.createElement('div'); label.className = `player-label${me ? ' me' : ''}`; label.textContent = me ? `${player.name} · YOU` : player.name; document.querySelector('#labels').append(label);
    const a = { root, label, player, data: null, stride: 0, squash: 0, lastGrounded: false, groundY: null, teleport: null };
    this.avatars.set(player.id, a); return a;
  }
  updateAvatar(id, state, time, delta) {
    const a = this.avatars.get(id); if (!a) return;
    a.data = state;
    if (!state?.p) { a.root.visible = false; a.label.hidden = true; return; }
    a.root.visible = true;
    a.root.position.set(...state.p);
    let diff = state.f - a.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); a.root.rotation.y += diff * (1 - Math.exp(-delta * 16));
    const { model, feet, arms, shadow } = a.root.userData;
    const speed = Math.hypot(state.v?.[0] || 0, state.v?.[2] || 0);
    const moving = Math.min(1, speed / 7), easing = 1 - Math.exp(-delta * 18);
    a.stride += delta * speed * 2.2;
    const stride = Math.sin(a.stride);
    if (a.teleport !== state.tp) { a.squash = 0; a.groundY = null; a.teleport = state.tp; }
    if (state.g) a.groundY = state.p[1] - 0.775;
    if (state.g && !a.lastGrounded) a.squash = 0.19;
    a.lastGrounded = state.g;
    a.squash *= Math.exp(-delta * 12);
    const stretch = !state.g && state.d <= 0 ? Math.min(0.1, Math.abs(state.v?.[1] || 0) * 0.008) : 0;
    model.scale.set(1 + a.squash * 0.5 - stretch * 0.35, 1 - a.squash + stretch, 1 + a.squash * 0.5);
    model.position.y = state.g ? Math.abs(stride) * 0.045 * moving - a.squash * 0.25 : 0;
    model.rotation.x += ((state.d > 0 ? -1.38 : state.s > 0 ? -0.5 : -0.07 * moving) - model.rotation.x) * easing;
    model.rotation.z += ((state.s > 0 ? Math.sin(time * 24) * 0.55 : -diff * moving * 0.13) - model.rotation.z) * easing;
    feet.forEach((f, i) => f.position.z = -0.08 + stride * (i ? 1 : -1) * 0.21 * moving);
    arms.forEach((arm, i) => {
      arm.rotation.x += ((state.d > 0 ? -1.4 : !state.g ? -0.7 : stride * (i ? 1 : -1) * 0.55 * moving) - arm.rotation.x) * easing;
      arm.rotation.z = (i ? 1 : -1) * (state.g ? 0.45 : 0.8);
    });
    const altitude = a.groundY == null ? 10 : state.p[1] - a.groundY;
    shadow.position.y = -altitude + 0.01;
    shadow.scale.setScalar(Math.max(0.45, 1 - altitude * 0.1));
    shadow.visible = this.showShadows && altitude > 0 && altitude < 3.5;
    this.projectVector.copy(a.root.position); this.projectVector.y += 1.5; this.projectVector.project(this.camera);
    const visible = this.showNames && this.projectVector.z < 1 && Math.abs(this.projectVector.x) < 1.1 && Math.abs(this.projectVector.y) < 1.1 && a.root.position.distanceTo(this.camera.position) < 45;
    a.label.hidden = !visible;
    if (visible) a.label.style.transform = `translate(${(this.projectVector.x * 0.5 + 0.5) * innerWidth}px,${(-this.projectVector.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-100%)`;
  }
  environment(time, env) {
    const states = new Map((env?.platforms || []).map(p => [p.id, p]));
    for (const p of this.map.platforms) {
      const mesh = this.platformMeshes.get(p.id), state = states.get(p.id);
      const dropAt = state?.dropAt ?? p.collapseAt;
      const dropping = dropAt !== null && dropAt !== undefined && time >= dropAt;
      mesh.visible = !dropping || time - dropAt < 0.65;
      mesh.position.y = p.position[1] - (dropping ? Math.pow((time - dropAt) * 9, 2) : 0);
      mesh.rotation.z = state?.a ?? p.rotation[2];
      mesh.rotation.y = p.turntable ? time * p.turntable : p.rotation[1];
      mesh.material = dropAt != null && dropAt - time > 0 && dropAt - time < 2 && Math.floor(time * 8) % 2 ? this.warningMaterial : this.vertexMaterial;
      if (dropAt != null && dropAt - time > 0 && dropAt - time < 2) mesh.position.y += Math.sin(time * 45) * 0.04;
    }
    const broken = new Set(env?.broken || []);
    for (const h of this.map.hazards) {
      const group = this.hazardMeshes.get(h.id); group.visible = !broken.has(h.id);
      const t = hazardTransform(h, time); group.position.set(...t.position); group.rotation.set(...t.rotation);
      if (group.userData.rope) {
        const a = group.userData.anchor, rope = group.userData.rope;
        this.target.copy(group.position).sub(a); const len = this.target.length();
        rope.position.copy(a).addScaledVector(this.target, 0.5); rope.scale.y = len;
        rope.quaternion.setFromUnitVectors(UP, this.target.normalize());
      }
    }
    if (this.crown) { this.crown.position.y = crownHeight(this.map, time); this.crown.rotation.y = time * 0.8; }
    if (this.slimeMesh) this.slimeMesh.position.y = this.map.slime.start + time * this.map.slime.speed - 0.5;
  }
  render(delta, time, follow, followState, menuTime, env) {
    this.environment(time, env);
    if (this.menu) {
      const mobile = innerWidth < 760;
      this.camera.position.set(mobile ? 17 : 27, mobile ? 14 : 19, mobile ? 24 : 28);
      this.camera.lookAt(mobile ? 8 : 1, mobile ? -0.5 : 2, mobile ? -7 : -14);
      if (this.menuBean) { this.menuBean.rotation.y = Math.PI - 0.3 + Math.sin(menuTime * 0.6) * 0.16; this.menuBean.position.y = 4.5 + Math.sin(menuTime * 2) * 0.1; this.menuCrown.rotation.y = menuTime * 0.6; }
    } else if (follow) {
      this.target.set(...follow); this.target.y = Math.max(this.target.y, this.map.mode === 'survival' ? (this.map.killY ?? -14) + 4 : -2);
      const speed = Math.hypot(followState?.v?.[0] || 0, followState?.v?.[2] || 0);
      this.forward.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
      this.cameraOffset.set(-this.forward.x * this.cameraDistance, this.cameraDistance * 0.57 + 0.9, -this.forward.z * this.cameraDistance);
      this.desiredCamera.copy(this.target).add(this.cameraOffset);
      this.lookDesired.copy(this.target).addScaledVector(this.forward, 2.8);
      this.lookDesired.y += 0.5;
      this.lookDesired.x += (followState?.v?.[0] || 0) * 0.065;
      this.lookDesired.z += (followState?.v?.[2] || 0) * 0.065;
      if (!this.smoothInitialized || this.camera.position.distanceTo(this.desiredCamera) > 35) {
        this.camera.position.copy(this.desiredCamera); this.lookTarget.copy(this.lookDesired); this.smoothInitialized = true;
      } else {
        this.camera.position.lerp(this.desiredCamera, 1 - Math.exp(-delta * 10));
        this.lookTarget.lerp(this.lookDesired, 1 - Math.exp(-delta * 14));
      }
      this.camera.lookAt(this.lookTarget);
      const fov = this.cameraFov + (this.reducedMotion ? 0 : Math.min(3, speed * 0.17));
      if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-delta * 5)); this.camera.updateProjectionMatrix(); }
    }
    this.renderer.render(this.scene, this.camera);
  }
  resize() { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight, false); }
  qualityMode(value) { this.quality = value; this.renderer.setPixelRatio(value === 'low' ? 1 : Math.min(devicePixelRatio, value === 'high' ? 2 : 1.35)); this.resize(); }
}

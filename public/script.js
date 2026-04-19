/**
 * Neural AI Visualizer — script.js
 * Three.js 3D neural graph with professional design
 */
'use strict';

/* ══════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════ */
const COLORS = {
  bg       : 0x030609,
  groups   : [0x00c8f0, 0x7c3aed, 0xf0366e, 0x00e09d, 0xf5a623],
  particle : 0x00c8f0,
  fog      : 0x030609,
};

const CONFIG = {
  particleCount : 700,
  nodeRadius    : 0.42,
  graphSpread   : 13,
  rotSpeed      : 0.0025,
  pulseSpeed    : 0.016,
  edgeOpBase    : 0.22,
  edgeOpMax     : 0.80,
  API_URL       : '',
};

/* ── Default demo graph shown on load ── */
const DEMO_NODES = [
  { id:0,  label:'neural',        weight:1.0, group:0 },
  { id:1,  label:'embedding',     weight:0.9, group:1 },
  { id:2,  label:'attention',     weight:0.95,group:0 },
  { id:3,  label:'transformer',   weight:0.85,group:2 },
  { id:4,  label:'gradient',      weight:0.8, group:1 },
  { id:5,  label:'activation',    weight:0.75,group:3 },
  { id:6,  label:'backprop',      weight:0.7, group:2 },
  { id:7,  label:'softmax',       weight:0.85,group:0 },
  { id:8,  label:'encoder',       weight:0.8, group:4 },
  { id:9,  label:'decoder',       weight:0.8, group:4 },
  { id:10, label:'tokenizer',     weight:0.7, group:3 },
  { id:11, label:'vector',        weight:0.75,group:1 },
  { id:12, label:'perceptron',    weight:0.65,group:2 },
  { id:13, label:'layer',         weight:0.7, group:0 },
  { id:14, label:'weight',        weight:0.65,group:3 },
];

const DEMO_EDGES = [
  {source:0,  target:2,  strength:0.9},
  {source:0,  target:13, strength:0.8},
  {source:1,  target:11, strength:0.9},
  {source:1,  target:7,  strength:0.7},
  {source:2,  target:3,  strength:0.95},
  {source:2,  target:7,  strength:0.85},
  {source:3,  target:8,  strength:0.9},
  {source:3,  target:9,  strength:0.9},
  {source:3,  target:10, strength:0.7},
  {source:4,  target:6,  strength:0.85},
  {source:4,  target:14, strength:0.75},
  {source:5,  target:7,  strength:0.8},
  {source:5,  target:13, strength:0.7},
  {source:6,  target:14, strength:0.8},
  {source:8,  target:1,  strength:0.75},
  {source:9,  target:1,  strength:0.75},
  {source:10, target:1,  strength:0.7},
  {source:11, target:2,  strength:0.65},
  {source:12, target:13, strength:0.75},
  {source:12, target:5,  strength:0.6},
  {source:13, target:4,  strength:0.7},
  {source:0,  target:12, strength:0.5},
  {source:3,  target:4,  strength:0.6},
  {source:7,  target:9,  strength:0.55},
];

/* ══════════════════════════════════════════════════════════════
   1. SCENE MANAGER
══════════════════════════════════════════════════════════════ */
class SceneManager {
  constructor(container) {
    this.container = container;
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();
    this._initMouse();
    this._initResize();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(COLORS.bg, 1);
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(COLORS.fog, 0.016);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(58, this.width / this.height, 0.1, 200);
    this.camera.position.set(0, 0, 30);

    this._orbit = { theta: 0, phi: 0, dTheta: 0, dPhi: 0, drag: false, lastX: 0, lastY: 0 };

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', e => {
      this._orbit.drag  = true;
      this._orbit.lastX = e.clientX;
      this._orbit.lastY = e.clientY;
    });
    window.addEventListener('mouseup', () => { this._orbit.drag = false; });
    window.addEventListener('mousemove', e => {
      if (!this._orbit.drag) return;
      this._orbit.dTheta += (e.clientX - this._orbit.lastX) * 0.004;
      this._orbit.dPhi   += (e.clientY - this._orbit.lastY) * 0.004;
      this._orbit.lastX   = e.clientX;
      this._orbit.lastY   = e.clientY;
    });

    canvas.addEventListener('wheel', e => {
      this.camera.position.z = THREE.MathUtils.clamp(
        this.camera.position.z + e.deltaY * 0.04, 8, 60
      );
    }, { passive: true });

    let lastTouchDist = 0;
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        this._orbit.drag  = true;
        this._orbit.lastX = e.touches[0].clientX;
        this._orbit.lastY = e.touches[0].clientY;
      }
      if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => { this._orbit.drag = false; }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && this._orbit.drag) {
        this._orbit.dTheta += (e.touches[0].clientX - this._orbit.lastX) * 0.004;
        this._orbit.dPhi   += (e.touches[0].clientY - this._orbit.lastY) * 0.004;
        this._orbit.lastX   = e.touches[0].clientX;
        this._orbit.lastY   = e.touches[0].clientY;
      }
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        this.camera.position.z = THREE.MathUtils.clamp(
          this.camera.position.z - (d - lastTouchDist) * 0.04, 8, 60
        );
        lastTouchDist = d;
      }
    }, { passive: true });
  }

  _initLights() {
    this.scene.add(new THREE.AmbientLight(0x08152a, 2.0));

    this._light1 = new THREE.PointLight(0x00c8f0, 3.0, 70);
    this._light1.position.set(0, 10, 10);
    this.scene.add(this._light1);

    const light2 = new THREE.PointLight(0x7c3aed, 2.0, 60);
    light2.position.set(-15, -8, -5);
    this.scene.add(light2);

    const light3 = new THREE.PointLight(0xf0366e, 1.0, 50);
    light3.position.set(15, 5, -10);
    this.scene.add(light3);
  }

  _initMouse() {
    this._mouse = new THREE.Vector2(0, 0);
    window.addEventListener('mousemove', e => {
      this._mouse.x = (e.clientX / this.width  - 0.5) * 2;
      this._mouse.y = (e.clientY / this.height - 0.5) * 2;
    });
  }

  _initResize() {
    window.addEventListener('resize', () => {
      this.width  = window.innerWidth;
      this.height = window.innerHeight;
      this.renderer.setSize(this.width, this.height);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    });
  }

  updateCamera(dt) {
    const o = this._orbit;
    o.theta += o.dTheta;
    o.phi    = THREE.MathUtils.clamp(o.phi + o.dPhi, -1.1, 1.1);
    o.dTheta *= 0.88;
    o.dPhi   *= 0.88;
    if (!o.drag) o.theta += CONFIG.rotSpeed;

    const r = this.camera.position.length();
    this.camera.position.x = r * Math.sin(o.theta) * Math.cos(o.phi);
    this.camera.position.y = r * Math.sin(o.phi);
    this.camera.position.z = r * Math.cos(o.theta) * Math.cos(o.phi);
    this.camera.lookAt(0, 0, 0);

    this._light1.position.set(this._mouse.x * 22, -this._mouse.y * 22, 10);
  }

  render() { this.renderer.render(this.scene, this.camera); }
}

/* ══════════════════════════════════════════════════════════════
   2. PARTICLE SYSTEM
══════════════════════════════════════════════════════════════ */
class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.count = CONFIG.particleCount;
    this._build();
  }

  _build() {
    const positions  = new Float32Array(this.count * 3);
    const velocities = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      positions[i3]   = (Math.random() - 0.5) * 90;
      positions[i3+1] = (Math.random() - 0.5) * 70;
      positions[i3+2] = (Math.random() - 0.5) * 70;
      velocities[i3]   = (Math.random() - 0.5) * 0.008;
      velocities[i3+1] = (Math.random() - 0.5) * 0.008;
      velocities[i3+2] = (Math.random() - 0.5) * 0.008;
    }

    this._velocities = velocities;
    this._positions  = positions;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this._points = new THREE.Points(geo, new THREE.PointsMaterial({
      color: COLORS.particle, size: 0.14, sizeAttenuation: true,
      transparent: true, opacity: 0.45, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.scene.add(this._points);
  }

  update(dt) {
    const pos = this._positions;
    const vel = this._velocities;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      pos[i3]   += vel[i3];
      pos[i3+1] += vel[i3+1];
      pos[i3+2] += vel[i3+2];
      for (let k = 0; k < 3; k++) {
        if (Math.abs(pos[i3+k]) > 45) vel[i3+k] *= -1;
      }
    }
    this._points.geometry.attributes.position.needsUpdate = true;
    this._points.rotation.y += 0.00015;
    this._points.rotation.x += 0.00008;
  }

  get particleCount() { return this.count; }
}

/* ══════════════════════════════════════════════════════════════
   3. LABEL RENDERER  — clean, pro-looking text sprites
══════════════════════════════════════════════════════════════ */
class LabelRenderer {
  constructor(scene) {
    this.scene   = scene;
    this._labels = [];
  }

  createLabel(text, colorHex) {
    const canvas  = document.createElement('canvas');
    const ctx     = canvas.getContext('2d');

    // Crisp font sizing
    const fontSize = 18;
    const padding  = { x: 14, y: 8 };

    ctx.font = `600 ${fontSize}px "Share Tech Mono", "Courier New", monospace`;
    const tw = ctx.measureText(text).width;

    canvas.width  = Math.ceil(tw + padding.x * 2);
    canvas.height = Math.ceil(fontSize + padding.y * 2);

    const w = canvas.width, h = canvas.height;

    // Glass background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(3, 8, 20, 0.72)';
    this._rr(ctx, 0, 0, w, h, 5);
    ctx.fill();

    // Colored border — single px, crisp
    const hex = '#' + colorHex.toString(16).padStart(6, '0');
    ctx.strokeStyle = hex;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.9;
    this._rr(ctx, 0.75, 0.75, w - 1.5, h - 1.5, 4.5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Text — white, sharp
    ctx.font        = `600 ${fontSize}px "Share Tech Mono", "Courier New", monospace`;
    ctx.fillStyle   = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = hex;
    ctx.shadowBlur   = 6;
    ctx.fillText(text, padding.x, h / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const sprite = new THREE.Sprite(mat);
    const aspect = w / h;
    sprite.scale.set(aspect * 0.95, 0.95, 1);
    return sprite;
  }

  _rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  clearAll() {
    this._labels.forEach(l => {
      this.scene.remove(l);
      if (l.material && l.material.map) l.material.map.dispose();
      if (l.material) l.material.dispose();
    });
    this._labels = [];
  }

  track(sprite) { this._labels.push(sprite); this.scene.add(sprite); }
}

/* ══════════════════════════════════════════════════════════════
   4. GRAPH RENDERER
══════════════════════════════════════════════════════════════ */
class GraphRenderer {
  constructor(scene, labelRenderer) {
    this.scene         = scene;
    this.labelRenderer = labelRenderer;
    this._nodeMeshes   = [];
    this._edgeLines    = [];
    this._nodeData     = [];
    this._edgeData     = [];
    this._t            = 0;
    this._selectedIdx  = -1;
    this._selectionRing  = null;
    this._selectionRing2 = null;

    this._sphereGeo = new THREE.SphereGeometry(1, 20, 20);
    this._glowGeo   = new THREE.SphereGeometry(1, 14, 14);
    this._ringGeo   = new THREE.TorusGeometry(1, 0.035, 10, 56);
  }

  buildGraph(graph) {
    this.clear();
    const { nodes, edges } = graph;

    // ── Spherical layout with repulsion seed ──
    const positions = nodes.map((n, i) => {
      // Golden angle distribution — avoids clustering
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const y  = 1 - (i / (nodes.length - 1 || 1)) * 2;
      const r  = Math.sqrt(1 - y * y);
      const th = goldenAngle * i;
      const spread = CONFIG.graphSpread * (0.55 + Math.random() * 0.45);
      return new THREE.Vector3(
        r * Math.cos(th) * spread,
        y * spread,
        r * Math.sin(th) * spread
      );
    });

    // ── Build nodes ──
    nodes.forEach((n, i) => {
      const color  = COLORS.groups[n.group % COLORS.groups.length];
      const radius = CONFIG.nodeRadius * (0.65 + n.weight * 0.75);

      // Core sphere — MeshStandardMaterial for better lighting
      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive          : color,
        emissiveIntensity : 0.5,
        transparent       : true,
        opacity           : 0.95,
        shininess         : 160,
        specular          : 0xffffff,
      });
      const mesh = new THREE.Mesh(this._sphereGeo, mat);
      mesh.scale.setScalar(radius);
      mesh.position.copy(positions[i]);
      mesh.userData.nodeIdx = i;
      mesh.userData.label   = n.label;
      this.scene.add(mesh);
      this._nodeMeshes.push(mesh);

      // Outer glow shell
      const glowMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.07,
        depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
      });
      const glowMesh = new THREE.Mesh(this._glowGeo, glowMat);
      glowMesh.scale.setScalar(radius * 2.8);
      glowMesh.position.copy(positions[i]);
      this.scene.add(glowMesh);
      this._edgeLines.push(glowMesh);

      // Inner bright core (small dot)
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.6,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const coreGeo  = new THREE.SphereGeometry(0.3, 8, 8);
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.copy(positions[i]);
      this.scene.add(coreMesh);
      this._edgeLines.push(coreMesh);

      // Label sprite
      const label = this.labelRenderer.createLabel(n.label.toLowerCase(), color);
      label.position.copy(positions[i]);
      label.position.y += radius + 0.7;
      this.labelRenderer.track(label);

      this._nodeData.push({
        mesh, glowMesh, coreMesh, mat, glowMat, coreMat,
        baseScale : radius,
        phase     : Math.random() * Math.PI * 2,
        color,
        position  : positions[i].clone(),
        label     : n.label,
      });
    });

    // ── Build edges ──
    edges.forEach(e => {
      const src = positions[e.source];
      const tgt = positions[e.target];
      if (!src || !tgt) return;

      const color = COLORS.groups[nodes[e.source].group % COLORS.groups.length];
      const baseOpacity = CONFIG.edgeOpBase + e.strength * (CONFIG.edgeOpMax - CONFIG.edgeOpBase);

      const geo = new THREE.BufferGeometry().setFromPoints([src, tgt]);
      const mat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity: baseOpacity,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geo, mat);
      line.userData = {
        isEdge: true, baseOpacity, phase: Math.random() * Math.PI * 2,
        srcIdx: e.source, tgtIdx: e.target,
      };
      this.scene.add(line);
      this._edgeLines.push(line);
      this._edgeData.push({ line, mat, srcIdx: e.source, tgtIdx: e.target, baseOpacity });
    });

    // ── Flow particles on strong edges ──
    this._buildFlowParticles(edges, positions, nodes);
  }

  _buildFlowParticles(edges, positions, nodes) {
    edges.filter(e => e.strength >= 0.7).forEach(e => {
      const src = positions[e.source];
      const tgt = positions[e.target];
      if (!src || !tgt) return;

      const color = COLORS.groups[nodes[e.source].group % COLORS.groups.length];
      const geo   = new THREE.SphereGeometry(0.055, 6, 6);
      const mat   = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(src);
      p.userData = {
        isFlowParticle: true,
        fpSrc: e.source, fpTgt: e.target,
        src: src.clone(), tgt: tgt.clone(),
        t: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
      };
      this.scene.add(p);
      this._edgeLines.push(p);
    });
  }

  update(dt) {
    this._t += dt;
    const t   = this._t;
    const sel = this._selectedIdx;

    // ── Nodes ──
    this._nodeData.forEach((d, i) => {
      const isSel  = sel === i;
      const isNeig = sel >= 0 && this._isNeighbour(sel, i);
      const isDim  = sel >= 0 && !isSel && !isNeig;

      const pulseAmp   = isSel ? 0.22 : 0.09;
      const baseScale  = d.baseScale * (isSel ? 1.4 : isDim ? 0.72 : 1.0);
      const scale      = baseScale * (1 + pulseAmp * Math.sin(t * CONFIG.pulseSpeed * 60 + d.phase));

      d.mesh.scale.setScalar(scale);
      d.glowMesh.scale.setScalar(scale * (isSel ? 4.2 : 2.8));

      d.mat.emissiveIntensity = isSel
        ? 1.6 + 0.7 * Math.abs(Math.sin(t * 2.5 + d.phase))
        : isDim ? 0.06 : 0.35 + 0.3 * Math.abs(Math.sin(t * 0.9 + d.phase));

      d.mat.opacity     = isDim ? 0.18 : 0.95;
      d.glowMat.opacity = isSel ? 0.18 : isDim ? 0.01 : 0.07;

      // Core brightness
      if (d.coreMat) {
        d.coreMat.opacity = isSel
          ? 0.9 + 0.1 * Math.abs(Math.sin(t * 4 + d.phase))
          : isDim ? 0.1 : 0.5 + 0.2 * Math.abs(Math.sin(t * 1.2 + d.phase));
      }
    });

    // ── Selection rings orbit ──
    if (this._selectionRing) {
      this._selectionRing.rotation.x  += 0.022;
      this._selectionRing.rotation.y  += 0.015;
      const rs = 1 + 0.08 * Math.sin(t * 3.5);
      this._selectionRing.scale.setScalar(rs);
    }
    if (this._selectionRing2) {
      this._selectionRing2.rotation.z += 0.018;
      this._selectionRing2.rotation.x += 0.010;
    }

    // ── Edges & flow ──
    this._edgeLines.forEach(obj => {
      if (obj.userData.isFlowParticle) {
        obj.userData.t = (obj.userData.t + obj.userData.speed) % 1;
        obj.position.lerpVectors(obj.userData.src, obj.userData.tgt, obj.userData.t);
        if (sel >= 0) {
          obj.visible = obj.userData.fpSrc === sel || obj.userData.fpTgt === sel;
        } else {
          obj.visible = true;
        }
        return;
      }
      if (obj.isLine && obj.material && obj.userData.isEdge) {
        const { srcIdx, tgtIdx, baseOpacity, phase } = obj.userData;
        const connected  = sel >= 0 && (srcIdx === sel || tgtIdx === sel);
        const dimmedEdge = sel >= 0 && !connected;
        obj.material.opacity = dimmedEdge
          ? 0.03
          : connected
            ? 0.88 + 0.12 * Math.abs(Math.sin(t * 2.8 + phase))
            : baseOpacity * (0.68 + 0.32 * Math.abs(Math.sin(t * 0.55 + phase)));
      }
    });
  }

  clear() {
    [...this._nodeMeshes, ...this._edgeLines].forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else if (obj.material) {
        obj.material.dispose();
      }
    });
    this.labelRenderer.clearAll();
    this._nodeMeshes  = [];
    this._edgeLines   = [];
    this._nodeData    = [];
    this._edgeData    = [];
    this._selectedIdx = -1;
    this._removeRings();
  }

  _isNeighbour(a, b) {
    return this._edgeData.some(e =>
      (e.srcIdx === a && e.tgtIdx === b) || (e.srcIdx === b && e.tgtIdx === a)
    );
  }

  selectNode(idx) {
    if (this._selectedIdx === idx) { this._selectedIdx = -1; this._removeRings(); return; }
    this._selectedIdx = idx;
    this._removeRings();

    const d = this._nodeData[idx];
    if (!d) return;

    const mk = (color, opacity, scaleMultiplier, rotX) => {
      const mat  = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const mesh = new THREE.Mesh(this._ringGeo, mat);
      mesh.scale.setScalar(d.baseScale * scaleMultiplier);
      mesh.position.copy(d.position);
      if (rotX !== undefined) mesh.rotation.x = rotX;
      this.scene.add(mesh);
      return mesh;
    };

    this._selectionRing  = mk(0xffffff, 0.85, 2.3);
    this._selectionRing2 = mk(d.color,  0.55, 3.0, Math.PI / 2);
  }

  _removeRings() {
    [this._selectionRing, this._selectionRing2].forEach(r => {
      if (r) { this.scene.remove(r); r.geometry.dispose(); r.material.dispose(); }
    });
    this._selectionRing  = null;
    this._selectionRing2 = null;
  }

  get nodeMeshes() { return this._nodeMeshes; }
  get nodeCount()  { return this._nodeMeshes.length; }
  get edgeCount()  { return this._edgeData.length; }
}

/* ══════════════════════════════════════════════════════════════
   5. UI CONTROLLER
══════════════════════════════════════════════════════════════ */
class UIController {
  constructor(graphRenderer) {
    this._graph = graphRenderer;
    this._busy  = false;

    this._btnGenerate   = document.getElementById('btn-generate');
    this._btnClear      = document.getElementById('btn-clear');
    this._promptInput   = document.getElementById('prompt-input');
    this._useOpenAI     = document.getElementById('use-openai');
    this._apiKeyInput   = document.getElementById('api-key-input');
    this._apiKeyRow     = document.getElementById('api-key-row');
    this._statusBox     = document.getElementById('status-box');
    this._statsBar      = document.getElementById('stats-bar');
    this._textPreview   = document.getElementById('text-preview');
    this._kwPanel       = document.getElementById('keywords-panel');
    this._modeBadge     = document.getElementById('mode-badge');
    this._loader        = document.getElementById('loader');
    this._statNodes     = document.getElementById('stat-nodes');
    this._statEdges     = document.getElementById('stat-edges');
    this._statParticles = document.getElementById('stat-particles');

    this._bind();
  }

  _bind() {
    this._btnGenerate.addEventListener('click', () => this._onGenerate());
    this._btnClear.addEventListener('click',    () => this._onClear());
    this._useOpenAI.addEventListener('change',  () => {
      this._apiKeyRow.style.display = this._useOpenAI.checked ? 'block' : 'none';
    });
    this._promptInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._onGenerate(); }
    });
  }

  setParticleCount(n) { this._statParticles.textContent = n; }

  async _onGenerate() {
    if (this._busy) return;
    const prompt = this._promptInput.value.trim();
    if (!prompt) { this._setStatus('⚠ Introduce un prompt primero.', 'error'); return; }

    this._busy = true;
    this._btnGenerate.disabled = true;
    this._loader.classList.add('visible');
    this._setStatus('◌ Procesando...', 'active');

    try {
      const res = await fetch(`${CONFIG.API_URL}/generate`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          prompt,
          useOpenAI : this._useOpenAI.checked,
          apiKey    : this._apiKeyInput.value.trim() || null,
        }),
      });

      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`); }

      const data = await res.json();

      this._modeBadge.textContent = data.mode === 'openai' ? '● GPT-4o-mini' : '● LOCAL';
      this._modeBadge.classList.toggle('live', data.mode === 'openai');

      this._graph.buildGraph({ nodes: data.nodes, edges: data.edges });

      if (typeof window.buildMatrixPanel === 'function') {
        window.buildMatrixPanel(data.keywords);
      }

      this._statNodes.textContent = data.nodes.length;
      this._statEdges.textContent = data.edges.length;
      this._statsBar.classList.add('visible');

      this._textPreview.textContent = data.text;
      this._textPreview.classList.add('visible');

      this._renderKeywords(data.keywords);
      this._setStatus(`✓ ${data.nodes.length} nodos · ${data.edges.length} conexiones`);

    } catch (err) {
      console.error(err);
      this._setStatus(`✕ ${err.message}`, 'error');
    } finally {
      this._busy = false;
      this._btnGenerate.disabled = false;
      this._loader.classList.remove('visible');
    }
  }

  _onClear() {
    this._graph.clear();
    // Reload demo graph
    this._graph.buildGraph({ nodes: DEMO_NODES, edges: DEMO_EDGES });
    if (typeof window.buildMatrixPanel === 'function') {
      window.buildMatrixPanel(DEMO_NODES.map(n => n.label));
    }

    this._promptInput.value = '';
    this._textPreview.classList.remove('visible');
    this._kwPanel.classList.remove('visible');
    this._kwPanel.innerHTML = '';
    this._statsBar.classList.remove('visible');
    this._modeBadge.textContent = '● DEMO';
    this._modeBadge.classList.remove('live');
    this._setStatus('LISTO · Introduce un prompt para comenzar');
    this._statNodes.textContent = DEMO_NODES.length;
    this._statEdges.textContent = DEMO_EDGES.length;
  }

  _renderKeywords(keywords) {
    this._kwPanel.innerHTML = '';
    const palette = [
      { bg:'rgba(0,200,240,0.08)',  border:'#00c8f0', text:'#00c8f0' },
      { bg:'rgba(124,58,237,0.08)', border:'#7c3aed', text:'#a78bfa' },
      { bg:'rgba(240,54,110,0.08)', border:'#f0366e', text:'#f0366e' },
      { bg:'rgba(0,224,157,0.08)',  border:'#00e09d', text:'#00e09d' },
      { bg:'rgba(245,166,35,0.08)', border:'#f5a623', text:'#f5a623' },
    ];
    keywords.forEach((kw, i) => {
      const c   = palette[i % palette.length];
      const tag = document.createElement('span');
      tag.className = 'kw-tag';
      tag.textContent = kw;
      tag.style.cssText = `background:${c.bg};border-color:${c.border};color:${c.text};animation-delay:${i*55}ms`;
      this._kwPanel.appendChild(tag);
    });
    this._kwPanel.classList.add('visible');
  }

  _setStatus(msg, type = '') {
    this._statusBox.textContent = msg;
    this._statusBox.className   = type ? `active ${type}` : '';
  }
}

/* ══════════════════════════════════════════════════════════════
   6. APP — main loop + raycasting
══════════════════════════════════════════════════════════════ */
class App {
  constructor() {
    const container = document.getElementById('canvas-container');

    this.scene     = new SceneManager(container);
    this.particles = new ParticleSystem(this.scene.scene);
    this.labels    = new LabelRenderer(this.scene.scene);
    this.graph     = new GraphRenderer(this.scene.scene, this.labels);
    this.ui        = new UIController(this.graph);

    this.ui.setParticleCount(this.particles.particleCount);

    // Load demo graph immediately
    this.graph.buildGraph({ nodes: DEMO_NODES, edges: DEMO_EDGES });
    if (typeof window.buildMatrixPanel === 'function') {
      window.buildMatrixPanel(DEMO_NODES.map(n => n.label));
    }

    // Update stats
    document.getElementById('stat-nodes').textContent = DEMO_NODES.length;
    document.getElementById('stat-edges').textContent = DEMO_EDGES.length;
    document.getElementById('stats-bar').classList.add('visible');
    document.getElementById('mode-badge').textContent = '● DEMO';

    // Raycaster
    this._raycaster  = new THREE.Raycaster();
    this._mouseNDC   = new THREE.Vector2();
    this._hoveredIdx = -1;

    this._initClickDetection();

    this._clock = new THREE.Clock();
    this._loop();
  }

  _initClickDetection() {
    const canvas = this.scene.renderer.domElement;

    canvas.addEventListener('mousemove', e => {
      this._mouseNDC.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      this._mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      const hit = this._raycast();
      if (hit !== this._hoveredIdx) {
        this._hoveredIdx = hit;
        canvas.style.cursor = hit >= 0 ? 'pointer' : 'default';
        this._updateTooltip(e, hit);
      } else if (hit >= 0) {
        this._moveTooltip(e);
      }
    });

    let downX = 0, downY = 0;
    canvas.addEventListener('mousedown', e => { downX = e.clientX; downY = e.clientY; });
    canvas.addEventListener('mouseup',   e => {
      if (Math.abs(e.clientX - downX) > 5 || Math.abs(e.clientY - downY) > 5) return;
      this._mouseNDC.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      this._mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      const hit = this._raycast();
      this.graph.selectNode(hit);
      if (hit >= 0) this._flashTooltip();
    });

    canvas.addEventListener('touchend', e => {
      if (!e.changedTouches.length) return;
      const t = e.changedTouches[0];
      this._mouseNDC.x =  (t.clientX / window.innerWidth)  * 2 - 1;
      this._mouseNDC.y = -(t.clientY / window.innerHeight) * 2 + 1;
      this.graph.selectNode(this._raycast());
    }, { passive: true });

    canvas.addEventListener('mouseleave', () => {
      this._hoveredIdx = -1;
      this._updateTooltip(null, -1);
      canvas.style.cursor = 'default';
    });
  }

  _raycast() {
    const meshes = this.graph.nodeMeshes;
    if (!meshes.length) return -1;
    this._raycaster.setFromCamera(this._mouseNDC, this.scene.camera);
    const hits = this._raycaster.intersectObjects(meshes, false);
    return hits.length ? (hits[0].object.userData.nodeIdx ?? -1) : -1;
  }

  _getTooltip() {
    if (!this._tooltip) {
      const el = document.createElement('div');
      el.id = 'node-tooltip';
      el.style.cssText = `
        position:fixed; z-index:50; pointer-events:none;
        padding:8px 16px 9px;
        background:rgba(3,8,20,0.9);
        border:1px solid rgba(0,200,240,0.45);
        border-radius:8px;
        font-family:'Share Tech Mono',monospace;
        font-size:11px; letter-spacing:1.5px;
        color:#00c8f0; text-transform:uppercase;
        opacity:0; transition:opacity .15s, box-shadow .15s;
        white-space:nowrap; backdrop-filter:blur(12px);
        line-height:1.6;
      `;
      document.body.appendChild(el);
      this._tooltip = el;
    }
    return this._tooltip;
  }

  _updateTooltip(e, idx) {
    const tip = this._getTooltip();
    if (idx < 0 || !e) { tip.style.opacity = '0'; return; }
    const n = this.graph._nodeData[idx];
    if (!n) return;
    const conns = this.graph._edgeData.filter(d => d.srcIdx === idx || d.tgtIdx === idx).length;
    tip.innerHTML =
      `<span style="opacity:.45;font-size:9px;letter-spacing:2px">NODE #${idx}</span><br>` +
      `<span style="font-size:14px;color:#fff;letter-spacing:1px">${n.label}</span><br>` +
      `<span style="opacity:.55;font-size:9px">${conns} connection${conns !== 1 ? 's' : ''}</span>`;
    this._moveTooltip(e);
    tip.style.opacity    = '1';
    tip.style.boxShadow  = '0 0 18px rgba(0,200,240,0.25)';
  }

  _moveTooltip(e) {
    const tip = this._getTooltip();
    tip.style.left = `${e.clientX + 16}px`;
    tip.style.top  = `${e.clientY - 8}px`;
  }

  _flashTooltip() {
    const tip = this._getTooltip();
    tip.style.borderColor = '#fff';
    tip.style.boxShadow   = '0 0 28px rgba(255,255,255,0.45)';
    setTimeout(() => {
      tip.style.borderColor = 'rgba(0,200,240,0.45)';
      tip.style.boxShadow   = '0 0 18px rgba(0,200,240,0.25)';
    }, 220);
  }

  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = this._clock.getDelta();
    this.scene.updateCamera(dt);
    this.particles.update(dt);
    this.graph.update(dt);
    this.scene.render();
  }
}

/* ── Boot ── */
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { window.NeuralApp = new App(); }, 150);
});
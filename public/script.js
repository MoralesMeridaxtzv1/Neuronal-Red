/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         NEURAL AI VISUALIZER — script.js (Three.js)         ║
 * ║  Visualización 3D de grafo neuronal con partículas y glow   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ARQUITECTURA:
 *   SceneManager   → Three.js scene, camera, renderer
 *   ParticleSystem → fondo de neuronas flotantes
 *   GraphRenderer  → nodos + edges del grafo IA
 *   LabelRenderer  → sprites de texto flotante
 *   UIController   → lógica del panel HTML + llamadas al backend
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   0. CONSTANTES Y PALETA DE COLORES
══════════════════════════════════════════════════════════════ */

const COLORS = {
  bg          : 0x020408,
  accent      : 0x00d2ff,
  accent2     : 0x7b2fff,
  accent3     : 0xff2d78,
  groups      : [0x00d2ff, 0x7b2fff, 0xff2d78, 0x00ff9d, 0xffb800],
  edgeBase    : 0x00d2ff,
  particle    : 0x00d2ff,
  fog         : 0x020408,
};

const CONFIG = {
  particleCount : 600,   // neuronas de fondo
  nodeRadius    : 0.45,  // radio base de nodos
  graphSpread   : 14,    // dispersión del grafo
  rotSpeed      : 0.003, // velocidad rotación automática
  pulseSpeed    : 0.018, // velocidad de pulsación de nodos
  edgeOpBase    : 0.25,  // opacidad mínima de edges
  edgeOpMax     : 0.85,  // opacidad máxima de edges
  API_URL: '',
};

/* ══════════════════════════════════════════════════════════════
   1. SCENE MANAGER — Three.js core
══════════════════════════════════════════════════════════════ */

class SceneManager {
  constructor(container) {
    this.container = container;
    this.width     = window.innerWidth;
    this.height    = window.innerHeight;

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();
    this._initMouse();
    this._initResize();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias       : true,
      alpha           : false,
      powerPreference : 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(COLORS.bg, 1);
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(COLORS.fog, 0.018);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60, this.width / this.height, 0.1, 200
    );
    this.camera.position.set(0, 0, 28);

    // Estado de órbita con mouse
    this._orbit = {
      theta  : 0,
      phi    : 0,
      dTheta : 0,
      dPhi   : 0,
      drag   : false,
      lastX  : 0,
      lastY  : 0,
    };

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

    // Zoom con rueda
    canvas.addEventListener('wheel', e => {
      this.camera.position.z = THREE.MathUtils.clamp(
        this.camera.position.z + e.deltaY * 0.04, 8, 60
      );
    }, { passive: true });

    // Touch (mobile)
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
    // Luz ambiental tenue
    this.scene.add(new THREE.AmbientLight(0x0a1a2e, 1.5));

    // Punto de luz principal (azul cian)
    const point1 = new THREE.PointLight(COLORS.accent, 2.5, 60);
    point1.position.set(0, 10, 10);
    this.scene.add(point1);
    this._light1 = point1;

    // Punto de luz secundaria (violeta)
    const point2 = new THREE.PointLight(COLORS.accent2, 1.5, 50);
    point2.position.set(-15, -8, -5);
    this.scene.add(point2);
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

  /**
   * Actualiza la cámara con suavizado (damping).
   * Se llama cada frame.
   */
  updateCamera(dt) {
    const o = this._orbit;

    // Amortiguación
    o.theta += o.dTheta;
    o.phi    = THREE.MathUtils.clamp(o.phi + o.dPhi, -1.2, 1.2);
    o.dTheta *= 0.88;
    o.dPhi   *= 0.88;

    // Auto-rotación lenta cuando no hay drag
    if (!o.drag) o.theta += CONFIG.rotSpeed;

    // Posición esférica de la cámara
    const r = this.camera.position.length();
    this.camera.position.x = r * Math.sin(o.theta) * Math.cos(o.phi);
    this.camera.position.y = r * Math.sin(o.phi);
    this.camera.position.z = r * Math.cos(o.theta) * Math.cos(o.phi);
    this.camera.lookAt(0, 0, 0);

    // Luz reactiva al mouse
    this._light1.position.set(
      this._mouse.x * 20,
      -this._mouse.y * 20,
      10
    );
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

/* ══════════════════════════════════════════════════════════════
   2. PARTICLE SYSTEM — fondo de neuronas flotantes
══════════════════════════════════════════════════════════════ */

class ParticleSystem {
  constructor(scene) {
    this.scene     = scene;
    this.count     = CONFIG.particleCount;
    this._t        = 0;
    this._build();
  }

  _build() {
    const positions  = new Float32Array(this.count * 3);
    const velocities = new Float32Array(this.count * 3); // drift lento
    const sizes      = new Float32Array(this.count);
    const alphas     = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * 80;
      positions[i3 + 1] = (Math.random() - 0.5) * 60;
      positions[i3 + 2] = (Math.random() - 0.5) * 60;

      velocities[i3]     = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;

      sizes[i]  = Math.random() * 2.5 + 0.5;
      alphas[i] = Math.random() * 0.5 + 0.1;
    }

    this._velocities = velocities;
    this._positions  = positions;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions,  3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes,      1));

    // Material con shader simple para partículas circulares suaves
    const mat = new THREE.PointsMaterial({
      color        : COLORS.particle,
      size         : 0.18,
      sizeAttenuation: true,
      transparent  : true,
      opacity      : 0.55,
      depthWrite   : false,
      blending     : THREE.AdditiveBlending,
    });

    this._points = new THREE.Points(geo, mat);
    this.scene.add(this._points);
  }

  update(dt) {
    this._t += dt;
    const pos = this._positions;
    const vel = this._velocities;
    const limit = 40;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      pos[i3]     += vel[i3];
      pos[i3 + 1] += vel[i3 + 1];
      pos[i3 + 2] += vel[i3 + 2];

      // Rebotar en los límites
      for (let k = 0; k < 3; k++) {
        if (Math.abs(pos[i3 + k]) > limit) vel[i3 + k] *= -1;
      }
    }

    this._points.geometry.attributes.position.needsUpdate = true;
    // Rotación suave del sistema completo
    this._points.rotation.y += 0.0002;
    this._points.rotation.x += 0.0001;
  }

  get particleCount() { return this.count; }
}

/* ══════════════════════════════════════════════════════════════
   3. LABEL RENDERER — Sprites de texto 3D
══════════════════════════════════════════════════════════════ */

class LabelRenderer {
  constructor(scene) {
    this.scene   = scene;
    this._labels = [];
  }

  /**
   * Crea un sprite de texto Canvas 2D montado como textura Three.js.
   *
   * @param {string} text    - Texto a mostrar
   * @param {number} color   - Color hex del texto
   * @returns {THREE.Sprite}
   */
  createLabel(text, color = 0x00d2ff) {
    const canvas  = document.createElement('canvas');
    const ctx     = canvas.getContext('2d');
    const fontSize = 22;
    const padding  = 12;

    ctx.font = `bold ${fontSize}px "Share Tech Mono", monospace`;
    const textW = ctx.measureText(text).width;

    canvas.width  = textW + padding * 2;
    canvas.height = fontSize + padding * 2;

    // Re-dibujar con canvas dimensionado
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo translúcido
    ctx.fillStyle = 'rgba(2, 10, 22, 0.6)';
    this._roundRect(ctx, 0, 0, canvas.width, canvas.height, 6);
    ctx.fill();

    // Borde brillante
    ctx.strokeStyle = `#${color.toString(16).padStart(6,'0')}`;
    ctx.lineWidth   = 1.5;
    this._roundRect(ctx, 0, 0, canvas.width, canvas.height, 6);
    ctx.stroke();

    // Texto
    ctx.font      = `bold ${fontSize}px "Share Tech Mono", monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, padding, canvas.height / 2);

    const texture  = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map         : texture,
      transparent : true,
      depthWrite  : false,
      blending    : THREE.AdditiveBlending,
    });

    const sprite = new THREE.Sprite(material);
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(aspect * 0.9, 0.9, 1);

    return sprite;
  }

  /** Helper: rectángulo redondeado en Canvas 2D */
  _roundRect(ctx, x, y, w, h, r) {
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
    this._labels.forEach(l => this.scene.remove(l));
    this._labels = [];
  }

  track(sprite) {
    this._labels.push(sprite);
    this.scene.add(sprite);
  }
}

/* ══════════════════════════════════════════════════════════════
   4. GRAPH RENDERER — Nodos + Edges + Labels
══════════════════════════════════════════════════════════════ */

class GraphRenderer {
  constructor(scene, labelRenderer) {
    this.scene         = scene;
    this.labelRenderer = labelRenderer;

    this._nodeMeshes  = [];
    this._edgeLines   = [];
    this._nodeData    = [];   // { position, weight, phase }
    this._edgeData    = [];   // { line, srcIdx, tgtIdx, baseOpacity }
    this._t           = 0;

    // Nodo actualmente seleccionado (-1 = ninguno)
    this._selectedIdx = -1;

    // Anillo de selección (ring) que rodea el nodo clickeado
    this._selectionRing = null;
    this._ringGeo = new THREE.TorusGeometry(1, 0.04, 8, 48);

    // Geometrías reutilizables
    this._sphereGeo = new THREE.SphereGeometry(1, 16, 16);
    this._glowGeo   = new THREE.SphereGeometry(1, 12, 12);
  }

  /**
   * Construye la red neuronal a partir del grafo JSON del backend.
   *
   * @param {{ nodes: object[], edges: object[] }} graph
   */
  buildGraph(graph) {
    this.clear();

    const { nodes, edges } = graph;
    const spread = CONFIG.graphSpread;

    // ── Posiciones en espacio 3D (distribución esférica aleatoria) ──
    const positions = nodes.map((n, i) => {
      // Distribución en cáscara esférica con algo de ruido
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = spread * (0.4 + Math.random() * 0.6);

      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    });

    // ── Nodos ──────────────────────────────────────────────────────
    nodes.forEach((n, i) => {
      const color  = COLORS.groups[n.group % COLORS.groups.length];
      const radius = CONFIG.nodeRadius * (0.7 + n.weight * 0.8);

      // Esfera principal
      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive     : color,
        emissiveIntensity: 0.45,
        transparent  : true,
        opacity      : 0.92,
        shininess    : 120,
      });
      const mesh = new THREE.Mesh(this._sphereGeo, mat);
      mesh.scale.setScalar(radius);
      mesh.position.copy(positions[i]);
      mesh.userData.nodeIdx = i; // ← índice para raycasting
      mesh.userData.label   = n.label; // ← texto para tooltip
      this.scene.add(mesh);
      this._nodeMeshes.push(mesh);

      // Halo de glow (esfera más grande translúcida)
      const glowMat = new THREE.MeshBasicMaterial({
        color,
        transparent : true,
        opacity     : 0.08,
        depthWrite  : false,
        blending    : THREE.AdditiveBlending,
        side        : THREE.BackSide,
      });
      const glowMesh = new THREE.Mesh(this._glowGeo, glowMat);
      glowMesh.scale.setScalar(radius * 2.6);
      glowMesh.position.copy(positions[i]);
      this.scene.add(glowMesh);
      this._edgeLines.push(glowMesh); // lo guardamos aquí para limpiar

      // Label del nodo (sprite de texto)
      const label = this.labelRenderer.createLabel(
        n.label.toUpperCase(), color
      );
      label.position.copy(positions[i]);
      label.position.y += radius + 0.6;
      this.labelRenderer.track(label);

      // Metadata para animación
      this._nodeData.push({
        mesh,
        glowMesh,
        baseScale : radius,
        phase     : Math.random() * Math.PI * 2,
        color,
        mat,
        glowMat,
        label,
        position  : positions[i].clone(),
      });
    });

    // ── Edges ──────────────────────────────────────────────────────
    edges.forEach(e => {
      const src = positions[e.source];
      const tgt = positions[e.target];
      if (!src || !tgt) return;

      // Color del edge interpolado entre los grupos de los nodos
      const colorSrc = COLORS.groups[nodes[e.source].group % COLORS.groups.length];

      // Línea con BufferGeometry
      const geo = new THREE.BufferGeometry().setFromPoints([src, tgt]);
      const baseOpacity = CONFIG.edgeOpBase + e.strength * (CONFIG.edgeOpMax - CONFIG.edgeOpBase);
      const mat = new THREE.LineBasicMaterial({
        color       : colorSrc,
        transparent : true,
        opacity     : baseOpacity,
        depthWrite  : false,
        blending    : THREE.AdditiveBlending,
      });

      const line = new THREE.Line(geo, mat);
      line.userData = {
        baseOpacity,
        phase   : Math.random() * Math.PI * 2,
        srcIdx  : e.source,
        tgtIdx  : e.target,
        isEdge  : true,
      };
      this.scene.add(line);
      this._edgeLines.push(line);

      // Guardar referencia en edgeData para highlight
      this._edgeData.push({ line, mat, srcIdx: e.source, tgtIdx: e.target, baseOpacity });
    });

    // También añadimos partículas de pulso en los edges (puntos viajando por la línea)
    this._addFlowParticles(edges, positions);
  }

  /**
   * Partículas que "viajan" por los edges (señales neuronales).
   */
  _addFlowParticles(edges, positions) {
    if (edges.length === 0) return;

    // Solo en edges fuertes
    const strongEdges = edges.filter(e => e.strength > 0.5);
    strongEdges.forEach(e => {
      const src = positions[e.source];
      const tgt = positions[e.target];
      if (!src || !tgt) return;

      // Un pequeño sprite que se mueve de src a tgt en loop
      const geo  = new THREE.SphereGeometry(0.06, 6, 6);
      const mat  = new THREE.MeshBasicMaterial({
        color    : COLORS.accent,
        blending : THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pulse = new THREE.Mesh(geo, mat);
      pulse.position.copy(src);
      pulse.userData = {
        isFlowParticle : true,
        fpSrc  : e.source,  // ← índices de nodo para filtrar por selección
        fpTgt  : e.target,
        src    : src.clone(),
        tgt    : tgt.clone(),
        t      : Math.random(),
        speed  : 0.004 + Math.random() * 0.006,
      };
      this.scene.add(pulse);
      this._edgeLines.push(pulse);
    });
  }

  /**
   * Animación frame a frame: pulsación de nodos + animación de edges.
   * @param {number} dt - delta time
   */
  update(dt) {
    this._t += dt;
    const t   = this._t;
    const sel = this._selectedIdx;

    // ── Pulsación de nodos ──────────────────────────────────────
    this._nodeData.forEach((d, i) => {
      const isSelected  = sel === i;
      const isNeighbour = sel >= 0 && this._isNeighbour(sel, i);
      const isDimmed    = sel >= 0 && !isSelected && !isNeighbour;

      // Escala: el seleccionado late más fuerte; el resto se encoge un poco
      const pulseAmp = isSelected ? 0.28 : 0.12;
      const scale = d.baseScale
        * (isSelected ? 1.35 : isDimmed ? 0.75 : 1.0)
        * (1 + pulseAmp * Math.sin(t * CONFIG.pulseSpeed * 60 + d.phase));

      d.mesh.scale.setScalar(scale);
      d.glowMesh.scale.setScalar(scale * (isSelected ? 4.0 : 2.6));

      // Emissive: seleccionado brilla al máximo; dimmed baja intensidad
      d.mat.emissiveIntensity = isSelected
        ? 1.5 + 0.8 * Math.abs(Math.sin(t * 2 + d.phase))
        : isDimmed
          ? 0.08
          : 0.3 + 0.4 * Math.abs(Math.sin(t * 0.8 + d.phase));

      // Opacidad del nodo
      d.mat.opacity     = isDimmed ? 0.22 : 0.92;
      d.glowMat.opacity = isSelected ? 0.22 : isDimmed ? 0.01 : 0.08;
    });

    // ── Anillo de selección — girar ─────────────────────────────
    if (this._selectionRing) {
      this._selectionRing.rotation.x += 0.025;
      this._selectionRing.rotation.y += 0.018;
      // Pulsar escala del anillo
      const ringScale = 1 + 0.1 * Math.sin(t * 4);
      this._selectionRing.scale.setScalar(ringScale);
    }

    // ── Edges y flow particles ──────────────────────────────────
    this._edgeLines.forEach(obj => {
      if (obj.userData.isFlowParticle) {
        obj.userData.t = (obj.userData.t + obj.userData.speed) % 1;
        obj.position.lerpVectors(obj.userData.src, obj.userData.tgt, obj.userData.t);

        // Ocultar flow particles de edges no conectados al seleccionado
        if (sel >= 0) {
          const { fpSrc, fpTgt } = obj.userData;
          const connected = fpSrc === sel || fpTgt === sel;
          obj.visible = connected;
        } else {
          obj.visible = true;
        }
        return;
      }

      if (obj.isLine && obj.material && obj.userData.isEdge) {
        const { srcIdx, tgtIdx, baseOpacity, phase } = obj.userData;
        const isConnected = sel >= 0 && (srcIdx === sel || tgtIdx === sel);
        const isDimmedEdge = sel >= 0 && !isConnected;

        // Parpadeo sutil en edges activos; fade en dimmed
        obj.material.opacity = isDimmedEdge
          ? 0.04
          : isConnected
            ? 0.9 + 0.1 * Math.abs(Math.sin(t * 3 + phase))
            : baseOpacity * (0.7 + 0.3 * Math.abs(Math.sin(t * 0.5 + phase)));
      }
    });
  }

  /** Elimina todos los objetos del grafo de la escena */
  clear() {
    [...this._nodeMeshes, ...this._edgeLines].forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.labelRenderer.clearAll();
    this._nodeMeshes  = [];
    this._edgeLines   = [];
    this._nodeData    = [];
    this._edgeData    = [];
    this._selectedIdx = -1;
    this._removeSelectionRing();
  }

  // ── Helpers de highlight ────────────────────────────────────

  /**
   * Devuelve true si los nodos A y B comparten al menos un edge.
   */
  _isNeighbour(a, b) {
    return this._edgeData.some(
      e => (e.srcIdx === a && e.tgtIdx === b) ||
           (e.srcIdx === b && e.tgtIdx === a)
    );
  }

  /**
   * Selecciona un nodo por índice (o deselecciona si es el mismo).
   * Crea el anillo visual de selección.
   */
  selectNode(idx) {
    // Toggle: click en el mismo nodo lo deselecciona
    if (this._selectedIdx === idx) {
      this._selectedIdx = -1;
      this._removeSelectionRing();
      return;
    }

    this._selectedIdx = idx;
    this._removeSelectionRing();

    const d = this._nodeData[idx];
    if (!d) return;

    // Crear anillo orbital alrededor del nodo
    const ringMat = new THREE.MeshBasicMaterial({
      color    : 0xffffff,
      blending : THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity  : 0.9,
    });

    const ring = new THREE.Mesh(this._ringGeo, ringMat);
    ring.scale.setScalar(d.baseScale * 2.2);
    ring.position.copy(d.position);
    this.scene.add(ring);
    this._selectionRing = ring;

    // Segundo anillo con color del nodo
    const ringMat2 = new THREE.MeshBasicMaterial({
      color    : d.color,
      blending : THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity  : 0.6,
    });
    const ring2 = new THREE.Mesh(this._ringGeo, ringMat2);
    ring2.scale.setScalar(d.baseScale * 2.8);
    ring2.position.copy(d.position);
    ring2.rotation.x = Math.PI / 2; // perpendicular al primero
    this.scene.add(ring2);
    this._selectionRing2 = ring2;
  }

  _removeSelectionRing() {
    [this._selectionRing, this._selectionRing2].forEach(r => {
      if (r) {
        this.scene.remove(r);
        r.geometry.dispose();
        r.material.dispose();
      }
    });
    this._selectionRing  = null;
    this._selectionRing2 = null;
  }

  /** Expone los nodeMeshes para raycasting externo */
  get nodeMeshes() { return this._nodeMeshes; }

  get nodeCount() { return this._nodeMeshes.length; }
  get edgeCount()  {
    return this._edgeLines.filter(o => o.isLine).length;
  }
}

/* ══════════════════════════════════════════════════════════════
   5. UI CONTROLLER — Panel HTML + fetch al backend
══════════════════════════════════════════════════════════════ */

class UIController {
  constructor(graphRenderer) {
    this._graph = graphRenderer;
    this._busy  = false;

    // Elementos DOM
    this._btnGenerate  = document.getElementById('btn-generate');
    this._btnClear     = document.getElementById('btn-clear');
    this._promptInput  = document.getElementById('prompt-input');
    this._useOpenAI    = document.getElementById('use-openai');
    this._apiKeyInput  = document.getElementById('api-key-input');
    this._apiKeyRow    = document.getElementById('api-key-row');
    this._statusBox    = document.getElementById('status-box');
    this._statsBar     = document.getElementById('stats-bar');
    this._textPreview  = document.getElementById('text-preview');
    this._kwPanel      = document.getElementById('keywords-panel');
    this._modeBadge    = document.getElementById('mode-badge');
    this._loader       = document.getElementById('loader');
    this._statNodes    = document.getElementById('stat-nodes');
    this._statEdges    = document.getElementById('stat-edges');
    this._statParticles= document.getElementById('stat-particles');

    this._bind();
  }

  _bind() {
    this._btnGenerate.addEventListener('click', () => this._onGenerate());
    this._btnClear.addEventListener('click',    () => this._onClear());

    this._useOpenAI.addEventListener('change', () => {
      this._apiKeyRow.style.display = this._useOpenAI.checked ? 'block' : 'none';
    });

    // Enter para enviar (Shift+Enter = nueva línea)
    this._promptInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._onGenerate();
      }
    });
  }

  setParticleCount(n) {
    this._statParticles.textContent = n;
  }

  async _onGenerate() {
    if (this._busy) return;
    const prompt = this._promptInput.value.trim();
    if (!prompt) {
      this._setStatus('⚠ Introduce un prompt primero.', 'error');
      return;
    }

    this._busy = true;
    this._btnGenerate.disabled = true;
    this._loader.classList.add('visible');
    this._setStatus('◌ Procesando con IA...', 'active');

    try {
      const body = {
        prompt,
        useOpenAI : this._useOpenAI.checked,
        apiKey    : this._apiKeyInput.value.trim() || null,
      };

      const res  = await fetch(`${CONFIG.API_URL}/generate`, {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      // Actualizar badge de modo
      this._modeBadge.textContent = data.mode === 'openai'
        ? '● GPT-4o-mini' : '● SIM MODE';
      this._modeBadge.classList.toggle('live', data.mode === 'openai');

      // Construir grafo 3D
      this._graph.buildGraph({ nodes: data.nodes, edges: data.edges });

      // Actualizar stats
      this._statNodes.textContent = data.nodes.length;
      this._statEdges.textContent = data.edges.length;
      this._statsBar.classList.add('visible');

      // Texto generado
      this._textPreview.textContent = data.text;
      this._textPreview.classList.add('visible');

      // Keywords como tags
      this._renderKeywords(data.keywords);

      this._setStatus(`✓ Grafo generado · ${data.nodes.length} nodos · ${data.edges.length} conexiones`);

    } catch (err) {
      console.error(err);
      this._setStatus(`✕ Error: ${err.message}`, 'error');
    } finally {
      this._busy = false;
      this._btnGenerate.disabled = false;
      this._loader.classList.remove('visible');
    }
  }

  _onClear() {
    this._graph.clear();
    this._promptInput.value = '';
    this._textPreview.classList.remove('visible');
    this._kwPanel.classList.remove('visible');
    this._kwPanel.innerHTML = '';
    this._statsBar.classList.remove('visible');
    this._modeBadge.textContent = '● SIM MODE';
    this._modeBadge.classList.remove('live');
    this._setStatus('LISTO · Introduce un prompt para comenzar');
    this._statNodes.textContent  = '0';
    this._statEdges.textContent  = '0';
  }

  _renderKeywords(keywords) {
    this._kwPanel.innerHTML = '';
    const groupColors = [
      { bg: 'rgba(0,210,255,0.08)',   border: '#00d2ff',   text: '#00d2ff'  },
      { bg: 'rgba(123,47,255,0.08)',  border: '#7b2fff',   text: '#b07aff'  },
      { bg: 'rgba(255,45,120,0.08)',  border: '#ff2d78',   text: '#ff2d78'  },
      { bg: 'rgba(0,255,157,0.08)',   border: '#00ff9d',   text: '#00ff9d'  },
      { bg: 'rgba(255,184,0,0.08)',   border: '#ffb800',   text: '#ffb800'  },
    ];

    keywords.forEach((kw, i) => {
      const c   = groupColors[i % groupColors.length];
      const tag = document.createElement('span');
      tag.className = 'kw-tag';
      tag.textContent = kw;
      tag.style.cssText = `
        background: ${c.bg};
        border-color: ${c.border};
        color: ${c.text};
        animation-delay: ${i * 60}ms;
      `;
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
   6. APP — Loop principal
══════════════════════════════════════════════════════════════ */

class App {
  constructor() {
    const container = document.getElementById('canvas-container');

    this.scene     = new SceneManager(container);
    this.particles = new ParticleSystem(this.scene.scene);
    this.labels    = new LabelRenderer(this.scene.scene);
    this.graph     = new GraphRenderer(this.scene.scene, this.labels);
    this.ui        = new UIController(this.graph);

    // Pasar conteo de partículas a UI
    this.ui.setParticleCount(this.particles.particleCount);

    // Raycaster para detección de click en nodos
    this._raycaster  = new THREE.Raycaster();
    this._mouseNDC   = new THREE.Vector2(); // coordenadas normalizadas (-1..1)
    this._hoveredIdx = -1;

    this._initClickDetection();

    // Reloj
    this._clock = new THREE.Clock();

    this._loop();
  }

  /** Configura listeners de click y hover sobre el canvas */
  _initClickDetection() {
    const canvas = this.scene.renderer.domElement;

    // ── Hover: cambiar cursor cuando hay un nodo bajo el puntero ──
    canvas.addEventListener('mousemove', e => {
      this._mouseNDC.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      this._mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

      const hit = this._raycastNodes();
      if (hit !== this._hoveredIdx) {
        this._hoveredIdx = hit;
        canvas.style.cursor = hit >= 0 ? 'pointer' : 'default';
        this._updateTooltip(e, hit);
      } else if (hit >= 0) {
        // Mover tooltip con el mouse
        this._moveTooltip(e);
      }
    });

    // ── Click: seleccionar nodo ────────────────────────────────
    // Usamos mousedown + mouseup para distinguir drag de click
    let mouseDownX = 0, mouseDownY = 0;

    canvas.addEventListener('mousedown', e => {
      mouseDownX = e.clientX;
      mouseDownY = e.clientY;
    });

    canvas.addEventListener('mouseup', e => {
      // Si el mouse se movió mucho → era un drag, no un click
      const dx = Math.abs(e.clientX - mouseDownX);
      const dy = Math.abs(e.clientY - mouseDownY);
      if (dx > 5 || dy > 5) return;

      this._mouseNDC.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      this._mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

      const hit = this._raycastNodes();
      this.graph.selectNode(hit);  // -1 deselecciona todo

      // Flash de confirmación en el tooltip
      if (hit >= 0) this._flashTooltip();
    });

    // Touch
    canvas.addEventListener('touchend', e => {
      if (e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      this._mouseNDC.x =  (touch.clientX / window.innerWidth)  * 2 - 1;
      this._mouseNDC.y = -(touch.clientY / window.innerHeight) * 2 + 1;

      const hit = this._raycastNodes();
      this.graph.selectNode(hit);
    }, { passive: true });

    // Ocultar tooltip cuando el mouse sale del canvas
    canvas.addEventListener('mouseleave', () => {
      this._hoveredIdx = -1;
      this._updateTooltip(null, -1);
      canvas.style.cursor = 'default';
    });
  }

  /**
   * Lanza un rayo desde la cámara y retorna el índice del nodo impactado
   * o -1 si no hay intersección.
   */
  _raycastNodes() {
    const meshes = this.graph.nodeMeshes;
    if (meshes.length === 0) return -1;

    this._raycaster.setFromCamera(this._mouseNDC, this.scene.camera);
    const hits = this._raycaster.intersectObjects(meshes, false);

    if (hits.length === 0) return -1;
    return hits[0].object.userData.nodeIdx ?? -1;
  }

  // ── Tooltip HTML ─────────────────────────────────────────────

  _getTooltip() {
    if (!this._tooltip) {
      const el = document.createElement('div');
      el.id = 'node-tooltip';
      el.style.cssText = `
        position: fixed;
        z-index: 50;
        pointer-events: none;
        padding: 8px 16px;
        background: rgba(2,10,22,0.88);
        border: 1px solid rgba(0,210,255,0.5);
        border-radius: 8px;
        font-family: 'Share Tech Mono', monospace;
        font-size: 11px;
        letter-spacing: 2px;
        color: #00d2ff;
        text-transform: uppercase;
        opacity: 0;
        transition: opacity .15s, box-shadow .15s;
        box-shadow: 0 0 0 rgba(0,210,255,0);
        white-space: nowrap;
        backdrop-filter: blur(8px);
      `;
      document.body.appendChild(el);
      this._tooltip = el;
    }
    return this._tooltip;
  }

  _updateTooltip(e, idx) {
    const tip = this._getTooltip();
    if (idx < 0 || !e) {
      tip.style.opacity = '0';
      return;
    }
    const d = this.graph._nodeData[idx];
    if (!d) return;

    // Contar vecinos
    const neighbours = this.graph._edgeData.filter(
      ed => ed.srcIdx === idx || ed.tgtIdx === idx
    ).length;

    tip.innerHTML = `
      <span style="opacity:.5;font-size:9px">NODO #${idx}</span><br/>
      <span style="font-size:13px;color:#fff">${this.graph.nodeMeshes[idx]?.userData?.label || '·'}</span><br/>
      <span style="opacity:.6;font-size:9px">${neighbours} conexion${neighbours !== 1 ? 'es' : ''}</span>
    `;

    this._moveTooltip(e);
    tip.style.opacity = '1';
    tip.style.boxShadow = `0 0 20px rgba(0,210,255,0.3)`;
  }

  _moveTooltip(e) {
    const tip = this._getTooltip();
    const x = e.clientX + 18;
    const y = e.clientY - 10;
    tip.style.left = `${x}px`;
    tip.style.top  = `${y}px`;
  }

  _flashTooltip() {
    const tip = this._getTooltip();
    tip.style.borderColor = '#ffffff';
    tip.style.boxShadow   = '0 0 30px rgba(255,255,255,0.5)';
    setTimeout(() => {
      tip.style.borderColor = 'rgba(0,210,255,0.5)';
      tip.style.boxShadow   = '0 0 20px rgba(0,210,255,0.3)';
    }, 250);
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

/* ── Arrancar cuando el DOM esté listo ── */
window.addEventListener('DOMContentLoaded', () => {
  // Pequeño delay para que las fuentes de Google carguen
  setTimeout(() => { window.NeuralApp = new App(); }, 200);
});
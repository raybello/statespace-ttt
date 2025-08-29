// === Optimized Three.js graph rendering with instancing (keeps your API) ===
// This version preserves ALL existing variable and function names so your UI and
// external calls remain unchanged. Internally it swaps thousands of Mesh/Line
// objects for:
//  - ONE InstancedMesh for nodes (spheres)
//  - ONE LineSegments BufferGeometry for edges
//  - Typed arrays for physics (positions, velocities, forces)
// It also keeps: this.nodes (Map), this.edges (Array), this.adjacent (Map),
// and every public method name exactly as before (addNode, addEdge, etc.).

class TTTGraph3D {
  constructor() {
    // Scene, camera, renderer
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });

    // Original public fields preserved
    this.controls = null;
    this.nodes = new Map(); // name -> { index, originalColor, state, active }
    this.adjacent = new Map(); // name -> [connected names]
    this.edges = []; // [{ a:index, b:index, move, player }]

    // Keep existing geometry field name for back-compat (used by addNodeLabel previously)
    this.nodeGeometry = new THREE.SphereGeometry(1, 16, 16);

    // Selection API compatibility
    this.selectedNode = null; // we will store the selected instance index here

    // Label visibility flag (preserved)
    this.labelsVisible = false;

    // Physics params (preserved names)
    this.forceStrength = 25;
    this.repulsionForce = 100;
    this.attractionForce = 0.1;
    this.damping = 0.9;
    this.centerForce = 0.05;

    // Extra perf knobs (new but camelCase like existing ones)
    this.repulsionCutoff = 140; // skip repulsion beyond this distance

    // Perf stats (preserved names)
    this.frameCount = 0;
    this.lastTime = performance.now();

    // Internal instancing data
    this._nodeCapacity = 10_000;
    this._edgeCapacity = 20_000; // segments
    this._initInstancedNodes(this._nodeCapacity);
    this._initBatchedEdges(this._edgeCapacity);

    // Subtle background, lights, UI wiring
    this.init();
    this.animate();
  }

  // === Original lifecycle ===
  init() {
    // Renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x000000, 1);
    // Shadows off for thousands of instances
    this.renderer.shadowMap.enabled = false;
    document.getElementById("container").appendChild(this.renderer.domElement);

    // Camera
    this.camera.position.set(0, 0, 140);
    this.setupControls();

    // Lights (simple & cheap)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(100, 150, 100);
    this.scene.add(dir);

    // Background
    this.addBackgroundElements();

    // Events
    window.addEventListener("resize", () => this.onWindowResize());
    this.renderer.domElement.addEventListener("click", (e) =>
      this.onMouseClick(e)
    );

    // UI hooks (same IDs / behavior)
    document.getElementById("forceStrength").addEventListener("input", (e) => {
      this.forceStrength = parseFloat(e.target.value);
    });
    document.getElementById("nodeSize").addEventListener("input", (e) => {
      this.updateNodeSizes(parseInt(e.target.value));
    });
    document
      .getElementById("fromNode")
      .addEventListener("change", this.updateConnectionButton.bind(this));
    document
      .getElementById("toNode")
      .addEventListener("change", this.updateConnectionButton.bind(this));
  }

  setupControls() {
    // Same UX as before (simple orbit)
    let isMouseDown = false;
    let mouseX = 0,
      mouseY = 0;
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.rotationX = 0;
    this.rotationY = 0;

    this.renderer.domElement.addEventListener("mousedown", (e) => {
      isMouseDown = true;
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    this.renderer.domElement.addEventListener("mousemove", (e) => {
      if (!isMouseDown) return;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;
      this.targetRotationY += dx * 0.005;
      this.targetRotationX = THREE.MathUtils.clamp(
        this.targetRotationX + dy * 0.005,
        -Math.PI / 2,
        Math.PI / 2
      );
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    this.renderer.domElement.addEventListener("mouseup", () => {
      isMouseDown = false;
    });
    this.renderer.domElement.addEventListener("wheel", (e) => {
      const zoom = e.deltaY * 0.1;
      this.camera.position.multiplyScalar(1 + zoom * 0.01);
      this.camera.position.clampLength(10, 1200);
    });
  }

  addBackgroundElements() {
    // grid
    const gridGeometry = new THREE.PlaneGeometry(800, 800, 20, 20);
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -80;
    this.scene.add(grid);

    // particles
    const particleCount = 300;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = (Math.random() - 0.5) * 1000;
      pos[i + 1] = (Math.random() - 0.5) * 1000;
      pos[i + 2] = (Math.random() - 0.5) * 1000;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      size: 1,
      transparent: true,
      opacity: 0.25,
    });
    this.scene.add(new THREE.Points(g, m));
  }

  // === Instancing/batching internals (new, but hidden) ===
  _initInstancedNodes(capacity) {
    this._nodeCount = 0;
    this._nodeCapacity = capacity;
    this._nodeMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
    });
    this._nodeMesh = new THREE.InstancedMesh(
      this.nodeGeometry,
      this._nodeMaterial,
      this._nodeCapacity
    );
    this._nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // colors
    const color = new THREE.Color();
    for (let i = 0; i < this._nodeCapacity; i++) {
      color.setHex(0x00f5ff);
      this._nodeMesh.setColorAt(i, color);
    }
    this._nodeMesh.instanceColor.needsUpdate = true;
    this.scene.add(this._nodeMesh);

    // physics arrays
    const n3 = this._nodeCapacity * 3;
    this._positions = new Float32Array(n3);
    this._velocities = new Float32Array(n3);
    this._forces = new Float32Array(n3);

    // per-instance scale base (synced with updateNodeSizes)
    this._baseScale = 1.0;

    // map index -> name (for details/selection)
    this._indexToName = [];
  }

  _growInstancedNodes() {
    const oldMesh = this._nodeMesh;
    const oldCap = this._nodeCapacity;
    const newCap = Math.ceil(oldCap * 1.8);
    const newMesh = new THREE.InstancedMesh(
      this.nodeGeometry,
      this._nodeMaterial,
      newCap
    );
    newMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // copy matrices & colors
    const tmp = new THREE.Matrix4();
    for (let i = 0; i < oldCap; i++) {
      oldMesh.getMatrixAt(i, tmp);
      newMesh.setMatrixAt(i, tmp);
    }
    if (oldMesh.instanceColor) {
      for (let i = 0; i < oldCap; i++)
        newMesh.setColorAt(
          i,
          oldMesh.instanceColor.getX
            ? oldMesh.instanceColor.getX(i)
            : new THREE.Color()
        );
    }
    for (let i = oldCap; i < newCap; i++)
      newMesh.setColorAt(i, new THREE.Color(0x00f5ff));
    newMesh.instanceColor.needsUpdate = true;

    this.scene.remove(oldMesh);
    this.scene.add(newMesh);
    this._nodeMesh = newMesh;

    const grow3 = (arr) => {
      const out = new Float32Array(newCap * 3);
      out.set(arr);
      return out;
    };
    this._positions = grow3(this._positions);
    this._velocities = grow3(this._velocities);
    this._forces = grow3(this._forces);

    this._nodeCapacity = newCap;
  }

  _initBatchedEdges(capacitySegments) {
    this._edgeCapacity = capacitySegments;
    this._edgeGeometry = new THREE.BufferGeometry();
    this._edgePositions = new Float32Array(this._edgeCapacity * 2 * 3);
    this._edgeGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this._edgePositions, 3).setUsage(
        THREE.DynamicDrawUsage
      )
    );
    this._edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
    });
    this._edgeLines = new THREE.LineSegments(
      this._edgeGeometry,
      this._edgeMaterial
    );
    this._edgeCount = 0;
    this.scene.add(this._edgeLines);
  }

  _growEdges() {
    const old = this._edgePositions;
    const oldCap = this._edgeCapacity;
    const newCap = Math.ceil(oldCap * 1.8);
    this._edgePositions = new Float32Array(newCap * 2 * 3);
    this._edgePositions.set(old);
    this._edgeGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this._edgePositions, 3).setUsage(
        THREE.DynamicDrawUsage
      )
    );
    this._edgeCapacity = newCap;
  }

  _writeEdgePosition(iEdge, ax, ay, az, bx, by, bz) {
    const base = iEdge * 6; // 2 vertices * 3
    this._edgePositions[base + 0] = ax;
    this._edgePositions[base + 1] = ay;
    this._edgePositions[base + 2] = az;
    this._edgePositions[base + 3] = bx;
    this._edgePositions[base + 4] = by;
    this._edgePositions[base + 5] = bz;
  }

  // === Public API (names preserved) ===
  addNode(
    name = `Node ${this.nodes.size}`,
    color = 0x00f5ff,
    state = { board: null, next_player: null, status: null }
  ) {
    if (this.nodes.has(name)) {
      alert(`Node "${name}" already exists!`);
      return null;
    }
    if (this._nodeCount >= this._nodeCapacity) this._growInstancedNodes();

    const index = this._nodeCount++;
    const record = { index, originalColor: color, state, active: true, name };
    this.nodes.set(name, record);
    this.adjacent.set(name, []);
    this._indexToName[index] = name;

    // initial ring position
    const radius = Math.sqrt(this.nodes.size) * 30 + 20;
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 40;
    const px = Math.cos(angle) * radius;
    const py = height;
    const pz = Math.sin(angle) * radius;

    const i3 = index * 3;
    this._positions[i3] = px;
    this._positions[i3 + 1] = py;
    this._positions[i3 + 2] = pz;
    this._velocities[i3] = 0;
    this._velocities[i3 + 1] = 0;
    this._velocities[i3 + 2] = 0;

    // instance matrix & color
    const m = new THREE.Matrix4();
    m.compose(
      new THREE.Vector3(px, py, pz),
      new THREE.Quaternion(),
      new THREE.Vector3(this._baseScale, this._baseScale, this._baseScale)
    );
    this._nodeMesh.setMatrixAt(index, m);
    this._nodeMesh.setColorAt(index, new THREE.Color(color));
    this._nodeMesh.count = this._nodeCount;
    this._nodeMesh.instanceMatrix.needsUpdate = true;
    this._nodeMesh.instanceColor.needsUpdate = true;

    // label method retained (now a no-op for performance; labels shown only on selection)
    this.addNodeLabel(record, name);

    this.updateStats();
    this.updateDropdowns();
    return record; // still truthy; callers only check existence
  }

  addNodeLabel(_node, _text) {
    // Intentionally left minimal for performance. We only render a sprite label for the
    // SELECTED node to avoid thousands of label meshes. Method kept for API parity.
  }

  addEdge(node1Name, node2Name, move = null, player = null) {
    const aRec = this.nodes.get(node1Name);
    const bRec = this.nodes.get(node2Name);
    if (!aRec || !bRec) return false;
    const a = aRec.index,
      b = bRec.index;
    if (a === b) return false;

    // prevent dupes (normalize order)
    const A = Math.min(a, b),
      B = Math.max(a, b);
    const exists = this.edges.some((e) => e.a === A && e.b === B);
    if (exists) {
      alert(
        `Connection between "${node1Name}" and "${node2Name}" already exists!`
      );
      return false;
    }

    // append logical edge
    this.edges.push({ a: A, b: B, move, player });
    this.adjacent.get(node1Name).push(node2Name);

    // grow GPU buffer if needed
    const newCount = this.edges.length;
    if (newCount > this._edgeCapacity) this._growEdges();

    // initialize the segment from current positions
    const a3 = A * 3,
      b3 = B * 3;
    this._writeEdgePosition(
      newCount - 1,
      this._positions[a3],
      this._positions[a3 + 1],
      this._positions[a3 + 2],
      this._positions[b3],
      this._positions[b3 + 1],
      this._positions[b3 + 2]
    );
    this._edgeCount = newCount;
    this._edgeGeometry.setDrawRange(0, this._edgeCount * 2);
    this._edgeGeometry.attributes.position.needsUpdate = true;

    this.updateStats();
    return true;
  }

  buildStateSpace() {
    const start = newBoard();
    const startKey = boardToKey(start);
    this.addNode(startKey, 0x00ff00, {
      board: startKey,
      next_player: "X",
      status: "ongoing",
    });

    const q = [startKey];
    const seen = new Set([startKey]);

    while (q.length) {
      const key = q.shift();
      const state = keyToBoard(key);
      const st = statusOf(state);
      const np = nextPlayer(state);

      const meta = this.nodes.get(key).state;
      meta.status = st;
      meta.next_player = np;

      if (st !== "ongoing" || !np) continue;
      for (const [r, c] of legalMoves(state)) {
        const child = applyMove(state, r, c, np);
        if (!isReachable(child)) continue;
        const ck = boardToKey(child);
        if (!this.nodes.has(ck)) {
          this.addNode(ck, nextPlayer(child) === "X" ? 0xff0000 : 0x0000ff, {
            board: ck,
            next_player: nextPlayer(child),
            status: statusOf(child),
          });
        }
        this.addEdge(key, ck, [r, c], np);
        if (!seen.has(ck)) {
          seen.add(ck);
          q.push(ck);
        }
      }
    }
  }

  updateDropdowns() {
    const fromSelect = document.getElementById("fromNode");
    const toSelect = document.getElementById("toNode");
    const currentFrom = fromSelect.value;
    const currentTo = toSelect.value;
    fromSelect.innerHTML = '<option value="">From Node</option>';
    toSelect.innerHTML = '<option value="">To Node</option>';
    this.nodes.forEach((_rec, name) => {
      const o1 = document.createElement("option");
      o1.value = name;
      o1.textContent = name;
      fromSelect.appendChild(o1);
      const o2 = document.createElement("option");
      o2.value = name;
      o2.textContent = name;
      toSelect.appendChild(o2);
    });
    if (this.nodes.has(currentFrom)) fromSelect.value = currentFrom;
    if (this.nodes.has(currentTo)) toSelect.value = currentTo;
    this.updateConnectionButton();
  }

  updateConnectionButton() {
    const fromNode = document.getElementById("fromNode").value;
    const toNode = document.getElementById("toNode").value;
    const addBtn = document.getElementById("addConnectionBtn");
    addBtn.disabled = !fromNode || !toNode || fromNode === toNode;
  }

  updatePhysics() {
    const n = this._nodeCount;
    const pos = this._positions,
      vel = this._velocities,
      frc = this._forces;

    // clear forces
    frc.fill(0, 0, n * 3);

    // repulsion (cutoff)
    const cutoff2 = this.repulsionCutoff * this.repulsionCutoff;
    for (let i = 0; i < n; i++) {
      if (!this._isActive(i)) continue;
      const i3 = i * 3;
      const ix = pos[i3],
        iy = pos[i3 + 1],
        iz = pos[i3 + 2];
      for (let j = i + 1; j < n; j++) {
        if (!this._isActive(j)) continue;
        const j3 = j * 3;
        let dx = ix - pos[j3];
        let dy = iy - pos[j3 + 1];
        let dz = iz - pos[j3 + 2];
        let d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 1e-4) d2 = 1e-4;
        if (d2 > cutoff2) continue;
        const invD = 1 / Math.sqrt(d2);
        const rep = this.repulsionForce / d2;
        const s = rep * invD;
        dx *= s;
        dy *= s;
        dz *= s;
        frc[i3] += dx;
        frc[i3 + 1] += dy;
        frc[i3 + 2] += dz;
        frc[j3] -= dx;
        frc[j3 + 1] -= dy;
        frc[j3 + 2] -= dz;
      }
    }

    // attraction along edges
    const pairs = this.edges;
    for (let k = 0; k < pairs.length; k++) {
      const a = pairs[k].a,
        b = pairs[k].b;
      if (!this._isActive(a) || !this._isActive(b)) continue;
      const a3 = a * 3,
        b3 = b * 3;
      let dx = pos[b3] - pos[a3];
      let dy = pos[b3 + 1] - pos[a3 + 1];
      let dz = pos[b3 + 2] - pos[a3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6;
      const att = dist * this.attractionForce;
      const s = att / dist;
      dx *= s;
      dy *= s;
      dz *= s;
      frc[a3] += dx;
      frc[a3 + 1] += dy;
      frc[a3 + 2] += dz;
      frc[b3] -= dx;
      frc[b3 + 1] -= dy;
      frc[b3 + 2] -= dz;
    }

    // center force
    for (let i = 0; i < n; i++) {
      if (!this._isActive(i)) continue;
      const i3 = i * 3;
      frc[i3] += -pos[i3] * this.centerForce;
      frc[i3 + 1] += -pos[i3 + 1] * this.centerForce;
      frc[i3 + 2] += -pos[i3 + 2] * this.centerForce;
    }

    // integrate & write instance matrices
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const svec = new THREE.Vector3(
      this._baseScale,
      this._baseScale,
      this._baseScale
    );
    const dt = 0.1 * this.forceStrength * 0.01;
    for (let i = 0; i < n; i++) {
      if (!this._isActive(i)) continue;
      const i3 = i * 3;
      vel[i3] = (vel[i3] + frc[i3] * dt) * this.damping;
      vel[i3 + 1] = (vel[i3 + 1] + frc[i3 + 1] * dt) * this.damping;
      vel[i3 + 2] = (vel[i3 + 2] + frc[i3 + 2] * dt) * this.damping;
      pos[i3] += vel[i3] * 0.1;
      pos[i3 + 1] += vel[i3 + 1] * 0.1;
      pos[i3 + 2] += vel[i3 + 2] * 0.1;
      m.compose(new THREE.Vector3(pos[i3], pos[i3 + 1], pos[i3 + 2]), q, svec);
      this._nodeMesh.setMatrixAt(i, m);
    }
    // keep selected larger
    if (this.selectedNode !== null && this.selectedNode >= 0)
      this._applySelectedScale();
    this._nodeMesh.instanceMatrix.needsUpdate = true;

    // update batched edges
    for (let e = 0; e < this.edges.length; e++) {
      const a = this.edges[e].a,
        b = this.edges[e].b;
      const a3 = a * 3,
        b3 = b * 3;
      this._writeEdgePosition(
        e,
        pos[a3],
        pos[a3 + 1],
        pos[a3 + 2],
        pos[b3],
        pos[b3 + 1],
        pos[b3 + 2]
      );
    }
    this._edgeCount = this.edges.length;
    this._edgeGeometry.setDrawRange(0, this._edgeCount * 2);
    this._edgeGeometry.attributes.position.needsUpdate = true;

    // camera rotation
    this.updateCameraRotation();
  }

  _isActive(index) {
    const name = this._indexToName[index];
    if (name === undefined) return false;
    const rec = this.nodes.get(name);
    return !!(rec && rec.active);
  }

  _applySelectedScale() {
    const i = this.selectedNode;
    if (i == null || i < 0) return;
    const i3 = i * 3;
    const m = new THREE.Matrix4();
    m.compose(
      new THREE.Vector3(
        this._positions[i3],
        this._positions[i3 + 1],
        this._positions[i3 + 2]
      ),
      new THREE.Quaternion(),
      new THREE.Vector3(
        this._baseScale * 1.3,
        this._baseScale * 1.3,
        this._baseScale * 1.3
      )
    );
    this._nodeMesh.setMatrixAt(i, m);
  }

  updateCameraRotation() {
    this.rotationX += (this.targetRotationX - this.rotationX) * 0.05;
    this.rotationY += (this.targetRotationY - this.rotationY) * 0.05;
    const dist = this.camera.position.length();
    this.camera.position.x =
      dist * Math.sin(this.rotationY) * Math.cos(this.rotationX);
    this.camera.position.y = dist * Math.sin(this.rotationX);
    this.camera.position.z =
      dist * Math.cos(this.rotationY) * Math.cos(this.rotationX);
    this.camera.lookAt(0, 0, 0);
  }

  onMouseClick(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObject(this._nodeMesh);

    if (intersects.length === 0) {
      // clear selection
      if (this.selectedNode != null && this.selectedNode >= 0) {
        const prevName = this._indexToName[this.selectedNode];
        if (prevName) {
          const rec = this.nodes.get(prevName);
          this._nodeMesh.setColorAt(
            this.selectedNode,
            new THREE.Color(rec.originalColor)
          );
          this._nodeMesh.instanceColor.needsUpdate = true;
        }
      }
      this.selectedNode = null;
      this.hideNodeDetails();
      this._removeLabelSprite();
      return;
    }

    const idx = intersects[0].instanceId;

    if (this.selectedNode === idx) {
      // toggle off
      const prevName = this._indexToName[idx];
      if (prevName) {
        const rec = this.nodes.get(prevName);
        this._nodeMesh.setColorAt(idx, new THREE.Color(rec.originalColor));
        this._nodeMesh.instanceColor.needsUpdate = true;
      }
      this.selectedNode = null;
      this.hideNodeDetails();
      this._removeLabelSprite();
      return;
    }

    // restore previous
    if (this.selectedNode != null && this.selectedNode >= 0) {
      const prevName = this._indexToName[this.selectedNode];
      if (prevName) {
        const rec = this.nodes.get(prevName);
        this._nodeMesh.setColorAt(
          this.selectedNode,
          new THREE.Color(rec.originalColor)
        );
      }
    }

    this.selectedNode = idx;
    const name = this._indexToName[idx];
    const rec = this.nodes.get(name);
    this._nodeMesh.setColorAt(idx, new THREE.Color(0xff6600));
    this._nodeMesh.instanceColor.needsUpdate = true;

    // label sprite (only on selection)
    this._updateLabelSprite(name);

    // details
    this.showNodeDetails();
  }

  updateNodeSizes(size) {
    this._baseScale = size / 20;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(
      this._baseScale,
      this._baseScale,
      this._baseScale
    );
    for (let i = 0; i < this._nodeCount; i++) {
      if (!this._isActive(i)) continue;
      const i3 = i * 3;
      m.compose(
        new THREE.Vector3(
          this._positions[i3],
          this._positions[i3 + 1],
          this._positions[i3 + 2]
        ),
        q,
        s
      );
      this._nodeMesh.setMatrixAt(i, m);
    }
    if (this.selectedNode != null && this.selectedNode >= 0)
      this._applySelectedScale();
    this._nodeMesh.instanceMatrix.needsUpdate = true;
  }

  updateStats() {
    document.getElementById("nodeCount").textContent = this.nodes.size;
    document.getElementById("edgeCount").textContent = this.edges.length;
  }

  clearGraph() {
    // mark all inactive and reset counts/buffers
    this.nodes.forEach((rec) => {
      rec.active = false;
    });
    this.nodes.clear();
    this.adjacent.clear();
    this.edges = [];
    this._indexToName = [];
    this._nodeCount = 0;
    this._edgeCount = 0;

    this._edgeGeometry.setDrawRange(0, 0);
    this._removeLabelSprite();
    this.selectedNode = null;
    this.updateStats();
    this.updateDropdowns();
    this.hideNodeDetails();
  }

  toggleLabels() {
    // labels shown only on selection; just refresh sprite visibility
    if (!this.labelsVisible) this._removeLabelSprite();
    else if (this.selectedNode != null && this.selectedNode >= 0)
      this._updateLabelSprite(this._indexToName[this.selectedNode]);
  }

  showNodeDetails() {
    if (this.selectedNode == null || this.selectedNode < 0) return;
    const idx = this.selectedNode;
    const name = this._indexToName[idx];
    const rec = this.nodes.get(name);

    // connected names
    const connected = this.edges
      .filter((e) => e.a === rec.index || e.b === rec.index)
      .map((e) => this._indexToName[e.a === rec.index ? e.b : e.a]);

    document.getElementById("nodeDetails").style.display = "block";
    document.getElementById("selectedNodeName").textContent = name;
    document.getElementById("selectedNodeColor").textContent =
      "#" + rec.originalColor.toString(16).padStart(6, "0");
    const i3 = idx * 3;
    document.getElementById(
      "selectedNodePosition"
    ).textContent = `(${this._positions[i3].toFixed(1)}, ${this._positions[
      i3 + 1
    ].toFixed(1)}, ${this._positions[i3 + 2].toFixed(1)})`;
    document.getElementById("selectedNodeConnections").textContent =
      connected.length;
    document.getElementById("connectedNodesList").textContent = connected.length
      ? connected.join(", ")
      : "None";
    document.getElementById("nextPlayerID").textContent = rec.state.next_player;
    document.getElementById("gameStatusID").textContent = rec.state.status;
  }

  hideNodeDetails() {
    document.getElementById("nodeDetails").style.display = "none";
  }

  deleteSelectedNode() {
    if (this.selectedNode == null || this.selectedNode < 0) return;
    const idx = this.selectedNode;
    const name = this._indexToName[idx];
    if (!name) return;

    // remove edges referencing this node
    this.edges = this.edges.filter((e) => e.a !== idx && e.b !== idx);

    // mark inactive
    const rec = this.nodes.get(name);
    if (rec) rec.active = false;
    this.nodes.delete(name);
    this.adjacent.delete(name);

    // optional: keep hole in instance array; compacting would be slower
    this.selectedNode = null;
    this._removeLabelSprite();
    this.updateStats();
    this.updateDropdowns();
    this.hideNodeDetails();
  }

  connectRandomNodes() {
    const names = Array.from(this.nodes.keys());
    if (names.length < 2) return;
    const a = names[Math.floor(Math.random() * names.length)];
    let b = names[Math.floor(Math.random() * names.length)];
    while (a === b) b = names[Math.floor(Math.random() * names.length)];
    this.addEdge(a, b);
  }

  resetCamera() {
    this.camera.position.set(0, 0, 140);
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.rotationX = 0;
    this.rotationY = 0;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.updatePhysics();

    // keep label pinned to selected
    if (
      this._labelSprite &&
      this.selectedNode != null &&
      this.selectedNode >= 0
    ) {
      const i3 = this.selectedNode * 3;
      this._labelSprite.position.set(
        this._positions[i3],
        this._positions[i3 + 1] + 15,
        this._positions[i3 + 2]
      );
      this._labelSprite.lookAt(this.camera.position);
    }

    this.renderer.render(this.scene, this.camera);

    // FPS (preserved)
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      document.getElementById("fps").textContent = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }
  }

  // === Minimal sprite label system (selected-only) ===
  _updateLabelSprite(text) {
    if (!this.labelsVisible) return;
    this._removeLabelSprite();
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#fff";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, 128, 40);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(20, 5, 1);
    this.scene.add(spr);
    this._labelSprite = spr;
  }

  _removeLabelSprite() {
    if (this._labelSprite) {
      this.scene.remove(this._labelSprite);
      this._labelSprite.material.map.dispose();
      this._labelSprite.material.dispose();
      this._labelSprite = null;
    }
  }
}

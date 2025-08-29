// Global variables
let graph;

const canvas = document.getElementById("miniCanvas");
const ctx = canvas.getContext("2d");
const gameStatus = document.getElementById("gameStatus");

// Set canvas dimensions
canvas.width = 280;
canvas.height = 280;

let EMPTY = "-";
let PLAYERS = ("X", "O");

// Game state
let board = [
  [EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY],
  [EMPTY, EMPTY, EMPTY],
];
let currentPlayer = "X";

let gameOver = false;
let winner = null;

let controlsHidden = false;
let previewHidden = false;
let infoHidden = false;

// Check for winner
function checkWinner() {
  // Check rows
  for (let row = 0; row < 3; row++) {
    if (
      board[row][0] !== EMPTY &&
      board[row][0] === board[row][1] &&
      board[row][1] === board[row][2]
    ) {
      return board[row][0];
    }
  }

  // Check columns
  for (let col = 0; col < 3; col++) {
    if (
      board[0][col] !== EMPTY &&
      board[0][col] === board[1][col] &&
      board[1][col] === board[2][col]
    ) {
      return board[0][col];
    }
  }

  // Check diagonals
  if (
    board[0][0] !== EMPTY &&
    board[0][0] === board[1][1] &&
    board[1][1] === board[2][2]
  ) {
    return board[0][0];
  }
  if (
    board[0][2] !== EMPTY &&
    board[0][2] === board[1][1] &&
    board[1][1] === board[2][0]
  ) {
    return board[0][2];
  }

  return null;
}

// Check if board is full
function isBoardFull() {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (board[row][col] === EMPTY) {
        return false;
      }
    }
  }
  return true;
}

function newBoard() {
  return [
    [EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY],
  ];
}

function boardToKey(state) {
  // Flatten row-major into a 9-char string
  let s = "";
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      s += state[r][c];
    }
  }
  return s;
}

function keyToBoard(key) {
  const b = newBoard();

  for (let i = 0; i < 9; i++) {
    const r = Math.floor(i / 3);
    const c = i % 3;
    b[r][c] = key[i];
  }
  return b;
}

function lineWinner(a, b, c) {
  return a !== EMPTY && a === b && b === c ? a : null;
}

function getWinner(state) {
  // rows
  for (let r = 0; r < 3; r++) {
    const w = lineWinner(state[r][0], state[r][1], state[r][2]);
    if (w) return w;
  }
  // cols
  for (let c = 0; c < 3; c++) {
    const w = lineWinner(state[0][c], state[1][c], state[2][c]);
    if (w) return w;
  }
  // diagonals
  let w = lineWinner(state[0][0], state[1][1], state[2][2]);
  if (w) return w;
  w = lineWinner(state[0][2], state[1][1], state[2][0]);
  if (w) return w;
  return null;
}

function isFull(state) {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (state[r][c] === EMPTY) return false;
    }
  }
  return true;
}

function statusOf(state) {
  const w = getWinner(state);
  if (w) return w;
  if (isFull(state)) return "draw";
  return "ongoing";
}

function countMarks(state) {
  let x = 0,
    o = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const v = state[r][c];
      if (v === "X") x++;
      else if (v === "O") o++;
    }
  }
  return [x, o];
}

function nextPlayer(state) {
  const [x, o] = countMarks(state);
  if (x < o || x > o + 1) return null;
  return x === o ? "X" : "O";
}

function legalMoves(state) {
  if (statusOf(state) !== "ongoing") return [];
  const p = nextPlayer(state);
  if (!p) return [];
  const moves = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (state[r][c] == EMPTY) moves.push([r, c]);
    }
  }
  return moves;
}

function applyMove(state, row, col, move) {
  const nb = state.map((row) => row.slice());
  nb[row][col] = move;
  return nb;
}

function isReachable(state) {
  // Filters out logically impossible states
  const [x, o] = countMarks(state);
  if (!(x === o || x === o + 1)) return false;

  const w = getWinner(state);
  if (w) {
    // enforce last-move consistency
    if (w === "X" && x !== o + 1) return false;
    if (w === "O" && x !== o) return false;
  }
  return true;
}

// Update game status
function updateGameStatus() {
  if (winner) {
    gameStatus.textContent = `Player ${winner} Wins!`;
    gameStatus.style.color = winner === "X" ? "#ff6600" : "#00f5ff";
  } else if (isBoardFull()) {
    gameStatus.textContent = "It's a Draw!";
    gameStatus.style.color = "#ffff00";
  } else {
    gameStatus.textContent = `Player ${currentPlayer}'s Turn`;
    gameStatus.style.color = currentPlayer === "X" ? "#ff6600" : "#00f5ff";
  }
}

// Draw the tic-tac-toe grid
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Set grid style
  ctx.strokeStyle = "#65ff86";
  ctx.lineWidth = 3;

  // Draw vertical lines
  for (let i = 1; i < 3; i++) {
    const x = (canvas.width / 3) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let i = 1; i < 3; i++) {
    const y = (canvas.height / 3) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// Draw X or O in a cell
function drawSymbol(row, col, symbol) {
  const cellWidth = canvas.width / 3;
  const cellHeight = canvas.height / 3;
  const centerX = col * cellWidth + cellWidth / 2;
  const centerY = row * cellHeight + cellHeight / 2;
  const size = cellWidth * 0.3;

  ctx.lineWidth = 4;

  if (symbol === "X") {
    ctx.strokeStyle = "#ff6600";
    ctx.beginPath();
    ctx.moveTo(centerX - size, centerY - size);
    ctx.lineTo(centerX + size, centerY + size);
    ctx.moveTo(centerX + size, centerY - size);
    ctx.lineTo(centerX - size, centerY + size);
    ctx.stroke();
  } else if (symbol === "O") {
    ctx.strokeStyle = "#00f5ff";
    ctx.beginPath();
    ctx.arc(centerX, centerY, size, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

// Reset game
function resetGame() {
  board = [
    [EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY],
  ];
  currentPlayer = "X";
  gameOver = false;
  winner = null;
  drawGrid();
  updateGameStatus();
}

// Handle canvas click
function handleCanvasClick(event) {
  if (gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const col = Math.floor(x / (canvas.width / 3));
  const row = Math.floor(y / (canvas.height / 3));

  // Check if cell is empty
  if (board[row][col] === EMPTY) {
    board[row][col] = currentPlayer;
    drawSymbol(row, col, currentPlayer);

    // Check for winner
    winner = checkWinner();
    if (winner || isBoardFull()) {
      gameOver = true;
    } else {
      currentPlayer = currentPlayer === "X" ? "O" : "X";
    }

    updateGameStatus();
  }
}

// Initialize game
function initGame() {
  drawGrid();
  updateGameStatus();
  canvas.addEventListener("click", handleCanvasClick);
}

// Global functions for controls - defined first so HTML can access them
function addNode() {
  const name =
    document.getElementById("nodeName").value.trim() ||
    `Node ${graph.nodes.size}`;
  const color = document.getElementById("nodeColor").value;
  const node = graph.addNode(name, parseInt(color.replace("#", "0x")));
  if (node) {
    document.getElementById("nodeName").value = "";
  }
}

function addConnection() {
  const fromNode = document.getElementById("fromNode").value;
  const toNode = document.getElementById("toNode").value;

  if (fromNode && toNode && fromNode !== toNode) {
    const success = graph.addEdge(fromNode, toNode);
    if (success) {
      // Reset the dropdowns after successful connection
      document.getElementById("fromNode").value = "";
      document.getElementById("toNode").value = "";
      graph.updateConnectionButton();
    }
  }
}

function connectRandomNodes() {
  graph.connectRandomNodes();
}

function clearGraph() {
  graph.clearGraph();
}

function resetCamera() {
  graph.resetCamera();
}

function toggleNodeLabels() {
  const checkbox = document.getElementById("showLabels");
  graph.labelsVisible = checkbox.checked;
  graph.toggleLabels();
}

function deleteSelectedNode() {
  if (
    confirm(
      "Are you sure you want to delete this node and all its connections?"
    )
  ) {
    graph.deleteSelectedNode();
  }
}

class TTTGraph3D {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.controls = null;

    this.nodes = new Map();
    this.adjacent = new Map();
    this.edges = [];

    //

    this.nodeGeometry = new THREE.SphereGeometry(1, 16, 16);
    this.selectedNode = null;

    // Label visibility
    this.labelsVisible = false;

    // Physics simulation parameters
    this.forceStrength = 25;
    this.repulsionForce = 100;
    this.attractionForce = 0.1;
    this.damping = 0.9;
    this.centerForce = 0.05;

    // Performance tracking
    this.frameCount = 0;
    this.lastTime = performance.now();

    // Internal instancing data
    this._nodeCapacity = 10_000;
    this._edgeCapacity = 20_000; // segments
    this._initInstancedNodes(this._nodeCapacity);
    this._initBatchedEdges(this._edgeCapacity);

    this.init();
    this.animate();
  }

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

  _initBatchedEdges(capacity) {
    this._edgeCapacity = capacity;
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

  _growBatchedEdges() {
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

  init() {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById("container").appendChild(this.renderer.domElement);

    // Setup camera
    this.camera.position.set(0, 0, 100);
    this.setupControls();

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = false;
    // directionalLight.shadow.mapSize.width = 2048;
    // directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Add subtle background elements
    this.addBackgroundElements();

    // Event listeners
    window.addEventListener("resize", () => this.onWindowResize());
    this.renderer.domElement.addEventListener("click", (e) =>
      this.onMouseClick(e)
    );

    // Control event listeners
    document.getElementById("forceStrength").addEventListener("input", (e) => {
      this.forceStrength = parseFloat(e.target.value);
    });

    document.getElementById("nodeSize").addEventListener("input", (e) => {
      this.updateNodeSizes(parseInt(e.target.value));
    });

    // Connection dropdown event listeners
    document
      .getElementById("fromNode")
      .addEventListener("change", this.updateConnectionButton.bind(this));
    document
      .getElementById("toNode")
      .addEventListener("change", this.updateConnectionButton.bind(this));
  }

  setupControls() {
    // Basic orbit controls implementation
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
      if (isMouseDown) {
        const deltaX = e.clientX - mouseX;
        const deltaY = e.clientY - mouseY;

        this.targetRotationY += deltaX * 0.005;
        this.targetRotationX += deltaY * 0.005;
        this.targetRotationX = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, this.targetRotationX)
        );

        mouseX = e.clientX;
        mouseY = e.clientY;
      }
    });

    this.renderer.domElement.addEventListener("mouseup", () => {
      isMouseDown = false;
    });

    this.renderer.domElement.addEventListener("wheel", (e) => {
      const zoom = e.deltaY * 0.1;
      this.camera.position.multiplyScalar(1 + zoom * 0.01);
      this.camera.position.clampLength(10, 500);
    });
  }

  addBackgroundElements() {
    // Add a subtle grid
    const gridGeometry = new THREE.PlaneGeometry(500, 500, 20, 20);
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -50;
    this.scene.add(grid);

    // Add floating particles
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 400;
      positions[i + 1] = (Math.random() - 0.5) * 400;
      positions[i + 2] = (Math.random() - 0.5) * 400;
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00f5ff,
      size: 1,
      transparent: true,
      opacity: 0.3,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    // this.scene.add(particles);
  }

  addNode(
    name = `Node ${this.nodes.size}`,
    color = 0x00f5ff,
    state = {
      board: null,
      next_player: null,
      status: null,
    }
  ) {
    // Check if node already exists
    if (this.nodes.has(name)) {
      alert(`Node "${name}" already exists!`);
      return null;
    }

    // Check if exceeding capacity
    if (this._nodeCount >= this._nodeCapacity) this._growInstancedNodes();

    const index = this._nodeCount++;
    const record = {index, originalColor: color, state, active: true, name}


    const material = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 100,
      transparent: true,
      opacity: 0.9,
    });

    // const index

    const mesh = new THREE.Mesh(this.nodeGeometry, material);

    // Random initial position
    const radius = Math.sqrt(this.nodes.size) * 30 + 20;
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 40;

    mesh.position.set(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { name, originalColor: color, state };

    // Physics properties
    mesh.velocity = new THREE.Vector3();
    mesh.force = new THREE.Vector3();

    this.scene.add(mesh);
    this.nodes.set(name, mesh);
    this.adjacent.set(name, []);

    // Add label
    this.addNodeLabel(mesh, name);

    this.updateStats();
    this.updateDropdowns();
    return mesh;
  }

  addNodeLabel(node, text) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = "rgba(0, 0, 0, 0.8)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#ffffff";
    context.font = "20px Arial";
    context.textAlign = "center";
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 7);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
    });

    const geometry = new THREE.PlaneGeometry(20, 5);
    const label = new THREE.Mesh(geometry, material);
    label.position.y = 15;
    label.visible = this.labelsVisible; // Set initial visibility
    node.add(label);
  }

  addEdge(node1Name, node2Name, move = null, player = null) {
    const node1 = this.nodes.get(node1Name);
    const node2 = this.nodes.get(node2Name);

    if (!node1 || !node2) return false;

    // Check if connection already exists
    const connectionExists = this.edges.some(
      (edge) =>
        (edge.node1.userData.name === node1Name &&
          edge.node2.userData.name === node2Name) ||
        (edge.node1.userData.name === node2Name &&
          edge.node2.userData.name === node1Name)
    );

    if (connectionExists) {
      alert(
        `Connection between "${node1Name}" and "${node2Name}" already exists!`
      );
      return false;
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      linewidth: 3,
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    this.edges.push({
      line: line,
      node1: node1,
      node2: node2,
      move: move,
      player: player,
    });
    this.adjacent.get(node1Name).push(node2Name);

    this.updateStats();
    return true;
  }

  buildStateSpace() {
    const start = newBoard();
    const startKey = boardToKey(start);

    console.log("Start:", start);
    console.log("Start key:", startKey);

    this.addNode(startKey, 0x00ff00, {
      board: startKey,
      next_player: "X",
      status: "ongoing",
    });

    const q = [startKey];
    const seen = new Set([startKey]);

    // while (q.length) {
    for (let i = 0; i < 10; i++) {
      const key = q.shift();
      const state = keyToBoard(key);

      const st = statusOf(state);
      const np = nextPlayer(state);

      const meta = this.nodes.get(key).userData.state;
      meta.status = st;
      meta.next_player = np;

      if (st !== "ongoing" || !np) continue;
      for (const [r, c] of legalMoves(state)) {
        const child = applyMove(state, r, c, np);
        if (!isReachable(child)) continue;

        const childKey = boardToKey(child);
        if (!this.nodes.has(childKey)) {
          this.addNode(
            childKey,
            nextPlayer(child) === "X" ? 0xff0000 : 0x0000ff,
            {
              board: childKey,
              next_player: nextPlayer(child),
              status: statusOf(child),
            }
          );
          console.log([r, c]);
          console.log(nextPlayer(child));
        }

        this.addEdge(key, childKey, [r, c], np);

        if (!seen.has(childKey)) {
          seen.add(childKey);
          q.push(childKey);
        }
      }
    }
  }

  updateDropdowns() {
    const fromSelect = document.getElementById("fromNode");
    const toSelect = document.getElementById("toNode");

    // Store current selections
    const currentFrom = fromSelect.value;
    const currentTo = toSelect.value;

    // Clear existing options except the first one
    fromSelect.innerHTML = '<option value="">From Node</option>';
    toSelect.innerHTML = '<option value="">To Node</option>';

    // Add all node names as options
    this.nodes.forEach((node, name) => {
      const option1 = document.createElement("option");
      option1.value = name;
      option1.textContent = name;
      fromSelect.appendChild(option1);

      const option2 = document.createElement("option");
      option2.value = name;
      option2.textContent = name;
      toSelect.appendChild(option2);
    });

    // Restore selections if they still exist
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
    const nodes = Array.from(this.nodes.values());

    // Clear forces
    nodes.forEach((node) => {
      node.force.set(0, 0, 0);
    });

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];

        const distance = node1.position.distanceTo(node2.position);
        if (distance < 0.1) continue;

        const repulsion = this.repulsionForce / (distance * distance);
        const direction = new THREE.Vector3()
          .subVectors(node1.position, node2.position)
          .normalize()
          .multiplyScalar(repulsion);

        node1.force.add(direction);
        node2.force.sub(direction);
      }
    }

    // Attraction along edges
    this.edges.forEach((edge) => {
      const distance = edge.node1.position.distanceTo(edge.node2.position);
      const attraction = distance * this.attractionForce;

      const direction = new THREE.Vector3()
        .subVectors(edge.node2.position, edge.node1.position)
        .normalize()
        .multiplyScalar(attraction);

      edge.node1.force.add(direction);
      edge.node2.force.sub(direction);
    });

    // Center force to prevent drift
    nodes.forEach((node) => {
      const centerForce = new THREE.Vector3()
        .copy(node.position)
        .multiplyScalar(-this.centerForce);
      node.force.add(centerForce);
    });

    // Update positions
    nodes.forEach((node) => {
      node.velocity.add(node.force.multiplyScalar(this.forceStrength * 0.01));
      node.velocity.multiplyScalar(this.damping);
      node.position.add(node.velocity.clone().multiplyScalar(0.1));

      // Update label orientation safely
      if (node.children[0]) {
        const label = node.children[0];
        label.lookAt(this.camera.position);
      }
    });

    // Update edge positions
    this.edges.forEach((edge) => {
      const positions = edge.line.geometry.attributes.position.array;
      positions[0] = edge.node1.position.x;
      positions[1] = edge.node1.position.y;
      positions[2] = edge.node1.position.z;
      positions[3] = edge.node2.position.x;
      positions[4] = edge.node2.position.y;
      positions[5] = edge.node2.position.z;
      edge.line.geometry.attributes.position.needsUpdate = true;
    });

    // Update camera rotation
    this.updateCameraRotation();
  }

  updateCameraRotation() {
    this.rotationX += (this.targetRotationX - this.rotationX) * 0.05;
    this.rotationY += (this.targetRotationY - this.rotationY) * 0.05;

    const distance = this.camera.position.length();
    this.camera.position.x =
      distance * Math.sin(this.rotationY) * Math.cos(this.rotationX);
    this.camera.position.y = distance * Math.sin(this.rotationX);
    this.camera.position.z =
      distance * Math.cos(this.rotationY) * Math.cos(this.rotationX);
    this.camera.lookAt(0, 0, 0);
  }

  onMouseClick(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const nodes = Array.from(this.nodes.values());
    const intersects = raycaster.intersectObjects(nodes);

    if (intersects.length > 0) {
      const clickedNode = intersects[0].object;

      if (this.selectedNode) {
        this.selectedNode.material.color.setHex(
          this.selectedNode.userData.originalColor
        );
        this.selectedNode.scale.set(1, 1, 1);
      }

      if (this.selectedNode === clickedNode) {
        this.selectedNode = null;
        this.hideNodeDetails();
      } else {
        this.selectedNode = clickedNode;
        this.selectedNode.material.color.setHex(0xffff00);
        this.selectedNode.scale.set(1.3, 1.3, 1.3);
        this.showNodeDetails();
      }
    }

    if (this.selectedNode) {
      drawGrid();
      board = keyToBoard(this.selectedNode.userData.name);
      currentPlayer = nextPlayer(board);

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          drawSymbol(r, c, board[r][c]);
        }
      }
      // // Check for winner
      // winner = checkWinner();
      // if (winner || isBoardFull()) {
      //   gameOver = true;
      // }
      updateGameStatus();
    } else {
      drawGrid();
      updateGameStatus();
    }
  }

  updateNodeSizes(size) {
    const scale = size / 20;
    this.nodes.forEach((node) => {
      if (node !== this.selectedNode) {
        node.scale.set(scale, scale, scale);
      }
    });
  }

  updateStats() {
    document.getElementById("nodeCount").textContent = this.nodes.size;
    document.getElementById("edgeCount").textContent = this.edges.length;
  }

  clearGraph() {
    this.nodes.forEach((node) => {
      this.scene.remove(node);
    });
    this.edges.forEach((edge) => {
      this.scene.remove(edge.line);
    });

    this.nodes.clear();
    this.edges = [];
    this.selectedNode = null;
    this.updateStats();
    this.updateDropdowns();
    this.hideNodeDetails();
  }

  toggleLabels() {
    this.nodes.forEach((node) => {
      if (node.children[0]) {
        // Check if label exists
        node.children[0].visible = this.labelsVisible;
      }
    });
  }

  showNodeDetails() {
    if (!this.selectedNode) return;

    const node = this.selectedNode;
    const nodeName = node.userData.name;
    const nodeNextPlayer = node.userData.state.next_player;
    const nodeGameStatus = node.userData.state.status;

    // Get connected nodes
    const connections = this.edges.filter(
      (edge) =>
        edge.node1.userData.name === nodeName ||
        edge.node2.userData.name === nodeName
    );

    const connectedNodes = connections.map((edge) => {
      return edge.node1.userData.name === nodeName
        ? edge.node2.userData.name
        : edge.node1.userData.name;
    });

    // Update UI
    document.getElementById("nodeDetails").style.display = "block";
    document.getElementById("selectedNodeName").textContent = nodeName;
    document.getElementById("selectedNodeColor").textContent =
      "#" + node.userData.originalColor.toString(16).padStart(6, "0");
    document.getElementById(
      "selectedNodePosition"
    ).textContent = `(${node.position.x.toFixed(1)}, ${node.position.y.toFixed(
      1
    )}, ${node.position.z.toFixed(1)})`;
    document.getElementById("selectedNodeConnections").textContent =
      connections.length;
    document.getElementById("connectedNodesList").textContent =
      connectedNodes.length > 0 ? connectedNodes.join(", ") : "None";
    document.getElementById("nextPlayerID").textContent = nodeNextPlayer;
    document.getElementById("gameStatusID").textContent = nodeGameStatus;
  }

  hideNodeDetails() {
    document.getElementById("nodeDetails").style.display = "none";
  }

  deleteSelectedNode() {
    if (!this.selectedNode) return;

    const nodeName = this.selectedNode.userData.name;

    // Remove all edges connected to this node
    this.edges = this.edges.filter((edge) => {
      const isConnected =
        edge.node1.userData.name === nodeName ||
        edge.node2.userData.name === nodeName;
      if (isConnected) {
        this.scene.remove(edge.line);
      }
      return !isConnected;
    });

    // Remove the node itself
    this.scene.remove(this.selectedNode);
    this.nodes.delete(nodeName);
    this.selectedNode = null;

    // Update UI
    this.updateStats();
    this.updateDropdowns();
    this.hideNodeDetails();
  }

  connectRandomNodes() {
    const nodeNames = Array.from(this.nodes.keys());
    if (nodeNames.length < 2) return;

    const node1 = nodeNames[Math.floor(Math.random() * nodeNames.length)];
    let node2 = nodeNames[Math.floor(Math.random() * nodeNames.length)];

    while (node2 === node1) {
      node2 = nodeNames[Math.floor(Math.random() * nodeNames.length)];
    }

    this.addEdge(node1, node2);
  }

  resetCamera() {
    this.camera.position.set(0, 0, 100);
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
    this.renderer.render(this.scene, this.camera);

    // Update FPS
    this.frameCount++;
    const currentTime = performance.now();
    if (currentTime - this.lastTime >= 1000) {
      document.getElementById("fps").textContent = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }
}

// Initialize the graph
graph = new TTTGraph3D();

// Global functions for controls
function addNode() {
  const name =
    document.getElementById("nodeName").value.trim() ||
    `Node ${graph.nodes.size}`;
  const color = document.getElementById("nodeColor").value;
  const node = graph.addNode(name, parseInt(color.replace("#", "0x")));
  if (node) {
    document.getElementById("nodeName").value = "";
  }
}

function addConnection() {
  const fromNode = document.getElementById("fromNode").value;
  const toNode = document.getElementById("toNode").value;

  if (fromNode && toNode && fromNode !== toNode) {
    const success = graph.addEdge(fromNode, toNode);
    if (success) {
      // Reset the dropdowns after successful connection
      document.getElementById("fromNode").value = "";
      document.getElementById("toNode").value = "";
      graph.updateConnectionButton();
    }
  }
}

function connectRandomNodes() {
  graph.connectRandomNodes();
}

function clearGraph() {
  graph.clearGraph();
}

function resetCamera() {
  graph.resetCamera();
}

// Add some initial nodes
setTimeout(() => {
  // // Add Nodes
  // ["Central Hub", "Data Node", "Processing Unit", "Storage"].forEach(
  //   (name, i) => {
  //     graph.addNode(name, [0x00f5ff, 0xff6600, 0x66ff00, 0xff0066][i]);
  //   }
  // );

  // // Add some connections
  // graph.addEdge("Central Hub", "Data Node");
  // graph.addEdge("Central Hub", "Processing Unit");
  // graph.addEdge("Data Node", "Storage");

  // Build state space for empty TTT grid
  graph.buildStateSpace();

  console.log("============ More Details =============");
  console.log("Nodes:", graph.nodes);
  console.log("Adjacent: ", graph.adjacent);
  console.log("Edges:", graph.edges);
}, 100);

// Allow Enter key to add nodes
document.getElementById("nodeName").addEventListener("keypress", (e) => {
  if (e.key === "Enter") addNode();
});

window.addEventListener("keypress", (e) => {
  if (e.key === "i") {
    controlsHidden = !controlsHidden;
    document.getElementById("controls").style.display = controlsHidden
      ? "none"
      : "";
  } else if (e.key === "o") {
    previewHidden = !previewHidden;
    document.getElementById("canvasView").style.display = previewHidden
      ? "none"
      : "";
  } else if (e.key === "p") {
    infoHidden = !infoHidden;
    document.getElementById("info").style.display = infoHidden ? "none" : "";
  } else if (e.key === "l") {
    graph.labelsVisible = !graph.labelsVisible;
    graph.toggleLabels();
  }
});

// Start the game when page loads
window.onload = function () {
  initGame();
};

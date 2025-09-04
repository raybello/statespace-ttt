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

    this.nodeGeometry = new THREE.SphereGeometry(1, 16, 16);
    this.instanceGeometry = new THREE.IcosahedronGeometry();
    this.selectedNode = null;
    this.selectedNodeIndex = -1;
    this.dummy = new THREE.Object3D();
    this.dummy2 = new THREE.Object3D();
    this.dummy_direction = new THREE.Vector3();
    this._baseScale = 1.0;
    this._baseDisabledScale = 0.0;

    // Label visibility
    this.labelsVisible = false;

    // Physics simulation parameters
    this.forceStrength = 25;
    this.repulsionForce = 100;
    this.attractionForce = 0.1;
    this.damping = 0.9;
    this.centerForce = 0.05;

    // Spatial grid optimization parameters
    this.gridSize = 50; // Size of each grid cell
    this.maxRepulsionDistance = 150; // Skip repulsion beyond this distance
    this.spatialGrid = new Map(); // Grid for spatial partitioning

    // Pre-allocated vectors for performance
    this.tempVector1 = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();
    this.tempVector3 = new THREE.Vector3();

    // Performance tracking
    this.frameCount = 0;
    this.lastTime = performance.now();

    // Internal instancing data
    this._nodeCapacity = 10000;
    this._edgeCapacity = 20000;

    this._edgeCount = 0;
    this._edgeIndexToConnection = [];

    this._positions = Array.from(
      { length: this._nodeCapacity },
      () => new THREE.Vector3()
    );
    this._velocities = Array.from(
      { length: this._nodeCapacity },
      () => new THREE.Vector3()
    );
    this._forces = Array.from(
      { length: this._nodeCapacity },
      () => new THREE.Vector3()
    );
    this._originalColors = new Array(this._nodeCapacity).fill(0x00f5ff);

    this._initInstancedNodes(this._nodeCapacity);
    this._initInstancedEdges(this._edgeCapacity);

    this.init();
    this.animate();
  }

  // Helper function to get grid key from position
  _getGridKey(x, y, z) {
    const gx = Math.floor(x / this.gridSize);
    const gy = Math.floor(y / this.gridSize);
    const gz = Math.floor(z / this.gridSize);
    return `${gx},${gy},${gz}`;
  }

  // Helper function to get neighboring grid cells
  _getNeighboringCells(gridKey) {
    const [gx, gy, gz] = gridKey.split(",").map(Number);
    const neighbors = [];

    // Check 3x3x3 neighborhood (27 cells including center)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          neighbors.push(`${gx + dx},${gy + dy},${gz + dz}`);
        }
      }
    }
    return neighbors;
  }

  _initInstancedNodes(capacity) {
    this._nodeCount = 0;
    this._nodeCapacity = capacity;
    this._nodeMaterial = new THREE.MeshPhongMaterial({ color: 0xff00ff });
    this._nodeMesh = new THREE.InstancedMesh(
      this.instanceGeometry,
      this._nodeMaterial,
      this._nodeCapacity
    );

    // Initialize all instances as disabled (scale 0)
    for (let i = 0; i < capacity; i++) {
      this.dummy.position.set(0, 0, 0);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(
        this._baseDisabledScale,
        this._baseDisabledScale,
        this._baseDisabledScale
      );
      this.dummy.updateMatrix();
      this._nodeMesh.setMatrixAt(i, this.dummy.matrix);
    }

    // Initialize colors
    const color = new THREE.Color();
    for (let i = 0; i < this._nodeCapacity; i++) {
      color.setHex(0x00f5ff);
      this._nodeMesh.setColorAt(i, color);
    }

    // Map index -> name (for details/selection)
    this._indexToName = [];

    this.scene.add(this._nodeMesh);
  }

  _initInstancedEdges(capacity) {
    this._edgeCapacity = capacity;
    this._edgeCount = 0;

    // Create a cylinder geometry for edges (will be stretched and positioned)
    const edgeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });

    this._edgeMesh = new THREE.InstancedMesh(
      edgeGeometry,
      edgeMaterial,
      this._edgeCapacity
    );

    // Initialize all edge instances as disabled (scale 0)
    for (let i = 0; i < capacity; i++) {
      this.dummy2.position.set(0, 0, 0);
      this.dummy2.rotation.set(0, 0, 0);
      this.dummy2.scale.set(0, 0, 0);
      this.dummy2.updateMatrix();
      this._edgeMesh.setMatrixAt(i, this.dummy2.matrix);
    }

    this._edgeMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this._edgeMesh);
  }

  _growInstancedNodes() {
    const oldMesh = this._nodeMesh;
    const oldCap = this._nodeCapacity;
    const newCap = Math.ceil(oldCap * 1.8);
    const newMesh = new THREE.InstancedMesh(
      this.instanceGeometry,
      this._nodeMaterial,
      newCap
    );

    // Copy matrices & colors
    const tmp = new THREE.Matrix4();
    const tmpColor = new THREE.Color();
    for (let i = 0; i < oldCap; i++) {
      oldMesh.getMatrixAt(i, tmp);
      newMesh.setMatrixAt(i, tmp);

      if (oldMesh.instanceColor) {
        oldMesh.getColorAt(i, tmpColor);
        newMesh.setColorAt(i, tmpColor);
      }
    }

    // Initialize new instances
    for (let i = oldCap; i < newCap; i++) {
      this.dummy.position.set(0, 0, 0);
      this.dummy.scale.set(
        this._baseDisabledScale,
        this._baseDisabledScale,
        this._baseDisabledScale
      );
      this.dummy.updateMatrix();
      newMesh.setMatrixAt(i, this.dummy.matrix);
      newMesh.setColorAt(i, new THREE.Color(0x00f5ff));
    }

    newMesh.instanceMatrix.needsUpdate = true;
    newMesh.instanceColor.needsUpdate = true;

    this.scene.remove(oldMesh);
    this.scene.add(newMesh);
    this._nodeMesh = newMesh;

    // Grow arrays
    const growArray = (arr, newSize) => {
      const newArr = Array.from({ length: newSize }, () => new THREE.Vector3());
      for (let i = 0; i < arr.length; i++) {
        newArr[i].copy(arr[i]);
      }
      return newArr;
    };

    this._positions = growArray(this._positions, newCap);
    this._velocities = growArray(this._velocities, newCap);
    this._forces = growArray(this._forces, newCap);
    this._originalColors = [
      ...this._originalColors,
      ...new Array(newCap - oldCap).fill(0x00f5ff),
    ];

    this._nodeCapacity = newCap;
  }

  _growInstancedEdges() {
    const oldMesh = this._edgeMesh;
    const oldCap = this._edgeCapacity;
    const newCap = Math.ceil(oldCap * 1.8);

    const edgeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });

    const newMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, newCap);

    // Copy existing matrices
    const tmp = new THREE.Matrix4();
    for (let i = 0; i < oldCap; i++) {
      oldMesh.getMatrixAt(i, tmp);
      newMesh.setMatrixAt(i, tmp);
    }

    // Initialize new instances as disabled
    for (let i = oldCap; i < newCap; i++) {
      this.dummy2.position.set(0, 0, 0);
      this.dummy2.scale.set(0, 0, 0);
      this.dummy2.updateMatrix();
      newMesh.setMatrixAt(i, this.dummy2.matrix);
    }

    newMesh.instanceMatrix.needsUpdate = true;

    this.scene.remove(oldMesh);
    this.scene.add(newMesh);
    this._edgeMesh = newMesh;

    // Grow edge index mapping
    const newIndexMapping = new Array(newCap);
    for (let i = 0; i < this._edgeIndexToConnection.length; i++) {
      newIndexMapping[i] = this._edgeIndexToConnection[i];
    }
    this._edgeIndexToConnection = newIndexMapping;

    this._edgeCapacity = newCap;
  }

  _updateEdgeGeometry(edgeIndex, pos1, pos2) {
    // Calculate position, rotation, and scale for the cylinder to represent the edge
    const midpoint = new THREE.Vector3()
      .addVectors(pos1, pos2)
      .multiplyScalar(0.5);
    const direction = new THREE.Vector3().subVectors(pos2, pos1);
    const length = direction.length();

    if (length < 0.001) return; // Avoid division by zero

    direction.normalize();

    // Position at midpoint
    this.dummy2.position.copy(midpoint);

    // Scale: x and z for thickness, y for length
    this.dummy2.scale.set(1, length, 1);

    // Rotation to align with edge direction
    // Default cylinder is aligned with Y axis, we need to align with our direction
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    this.dummy2.setRotationFromQuaternion(quaternion);

    this.dummy2.updateMatrix();
    this._edgeMesh.setMatrixAt(edgeIndex, this.dummy2.matrix);
  }

  _isActive(index) {
    const name = this._indexToName[index];
    if (name === undefined) return false;
    const rec = this.nodes.get(name);
    return !!(rec && rec.active);
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
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = false;
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

        this.targetRotationY -= deltaX * 0.005;
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
    if (this._nodeCount >= this._nodeCapacity) {
      this._growInstancedNodes();
    }

    const index = this._nodeCount++;
    this._indexToName[index] = name;
    this._originalColors[index] = color;

    // Random initial position
    const radius = Math.sqrt(this.nodes.size) * 30 + 20;
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 40;

    const px = Math.cos(angle) * radius;
    const py = height;
    const pz = Math.sin(angle) * radius;

    // Set initial position and velocity
    this._positions[index].set(px, py, pz);
    this._velocities[index].set(0, 0, 0);
    this._forces[index].set(0, 0, 0);

    // Update instanced mesh
    this.dummy.position.set(px, py, pz);
    this.dummy.scale.set(this._baseScale, this._baseScale, this._baseScale);
    this.dummy.rotation.set(
      Math.random() * 2 * Math.PI,
      Math.random() * 2 * Math.PI,
      Math.random() * 2 * Math.PI
    );
    this.dummy.updateMatrix();
    this._nodeMesh.setMatrixAt(index, this.dummy.matrix);
    this._nodeMesh.setColorAt(index, new THREE.Color(color));
    this._nodeMesh.count = this._nodeCount;

    // Store node data
    const nodeRecord = {
      index,
      originalColor: color,
      state,
      active: true,
      name,
      position: this._positions[index],
      velocity: this._velocities[index],
      force: this._forces[index],
    };

    this.nodes.set(name, nodeRecord);
    this.adjacent.set(name, []);

    this.updateStats();
    this.updateDropdowns();

    return nodeRecord;
  }

  addEdge(node1Name, node2Name, move = null, player = null) {
    const node1 = this.nodes.get(node1Name);
    const node2 = this.nodes.get(node2Name);

    if (!node1 || !node2) return false;

    // Check if connection already exists
    const connectionExists = this.edges.some(
      (edge) =>
        (edge.node1.name === node1Name && edge.node2.name === node2Name) ||
        (edge.node1.name === node2Name && edge.node2.name === node1Name)
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

    // Check if we need to grow edge capacity
    if (this._edgeCount >= this._edgeCapacity) {
      this._growInstancedEdges();
    }
    const edgeIndex = this._edgeCount++;

    const edgeData = {
      line: line,
      edgeIndex: edgeIndex,
      node1: node1,
      node2: node2,
      move: move,
      player: player,
    };

    this.edges.push(edgeData);
    this._edgeIndexToConnection[edgeIndex] = edgeData;
    this.adjacent.get(node1Name).push(node2Name);

    // Update the instanced edge geometry
    this._updateEdgeGeometry(edgeIndex, node1.position, node2.position);
    this._edgeMesh.count = this._edgeCount;
    this._edgeMesh.instanceMatrix.needsUpdate = true;

    // this.scene.add(line);

    this.updateStats();
    return true;
  }

    buildStateSpace(useBFS = false, maxNodes = 800) {
        const start = newBoard();
        const startKey = boardToKey(start);

        console.log("Start:", start);
        console.log("Start key:", startKey);
        console.log("Using", useBFS ? "BFS" : "DFS", "traversal");

        this.addNode(startKey, 0xff00ff, {
            board: startKey,
            next_player: "X",
            status: "ongoing",
        });

        const stack = [startKey]; // Will be used as queue for BFS or stack for DFS
        const seen = new Set([startKey]);
        let processedNodes = 0;

        while (stack.length > 0 && processedNodes < maxNodes) {
            // BFS: shift() removes from front (queue behavior)
            // DFS: pop() removes from back (stack behavior)
            const key = useBFS ? stack.shift() : stack.pop();
            const state = keyToBoard(key);
            processedNodes++;

            const st = statusOf(state);
            const np = nextPlayer(state);

            const meta = this.nodes.get(key).state;
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
                }

                this.addEdge(key, childKey, [r, c], np);

                if (!seen.has(childKey)) {
                    seen.add(childKey);
                    stack.push(childKey);
                }
            }
        }

        console.log(`Processed ${processedNodes} nodes using ${useBFS ? 'BFS' : 'DFS'}`);
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
    const activeNodes = Array.from(this.nodes.values()).filter(
      (node) => node.active
    );

    // Clear forces
    for (let i = 0; i < this._nodeCount; i++) {
      this._forces[i].set(0, 0, 0);
    }

    // Build spatial grid
    this.spatialGrid.clear();
    for (const node of activeNodes) {
      const pos = this._positions[node.index];
      const gridKey = this._getGridKey(pos.x, pos.y, pos.z);

      if (!this.spatialGrid.has(gridKey)) {
        this.spatialGrid.set(gridKey, []);
      }
      this.spatialGrid.get(gridKey).push(node);
    }

    // Optimized repulsion using spatial partitioning
    for (const node1 of activeNodes) {
      const node1_idx = node1.index;
      const node1_pos = this._positions[node1_idx];
      const node1_force = this._forces[node1_idx];

      const gridKey = this._getGridKey(node1_pos.x, node1_pos.y, node1_pos.z);
      const neighboringCells = this._getNeighboringCells(gridKey);

      // Only check nodes in neighboring grid cells
      for (const cellKey of neighboringCells) {
        const cellNodes = this.spatialGrid.get(cellKey);
        if (!cellNodes) continue;

        for (const node2 of cellNodes) {
          if (node1.index >= node2.index) continue; // Avoid duplicate calculations

          const node2_idx = node2.index;
          const node2_pos = this._positions[node2_idx];
          const node2_force = this._forces[node2_idx];

          // Use pre-allocated vector for distance calculation
          this.tempVector1.subVectors(node1_pos, node2_pos);
          const distSq = this.tempVector1.lengthSq();

          // Skip if beyond max repulsion distance
          if (distSq > this.maxRepulsionDistance * this.maxRepulsionDistance)
            continue;

          const dist = Math.sqrt(distSq);
          if (dist < 0.1) continue;

          // Calculate repulsion force
          const repulse = this.repulsionForce / distSq;

          // Normalize direction and apply force
          this.tempVector1.divideScalar(dist); // Normalize
          this.tempVector2.copy(this.tempVector1).multiplyScalar(repulse);

          node1_force.add(this.tempVector2);
          node2_force.sub(this.tempVector2);
        }
      }
    }

    // Attraction along edges (unchanged but using pre-allocated vectors)
    this.edges.forEach((edge) => {
      const pos1 = this._positions[edge.node1.index];
      const pos2 = this._positions[edge.node2.index];
      const force1 = this._forces[edge.node1.index];
      const force2 = this._forces[edge.node2.index];

      const distance = pos1.distanceTo(pos2);
      const attraction = distance * this.attractionForce;

      // Use pre-allocated vector for direction calculation
      this.tempVector3
        .subVectors(pos2, pos1)
        .normalize()
        .multiplyScalar(attraction);

      force1.add(this.tempVector3);
      force2.sub(this.tempVector3);

      // Update edge geometry
      this._updateEdgeGeometry(edge.edgeIndex, pos1, pos2);
    });

    // Center force and update positions
    for (let i = 0; i < this._nodeCount; i++) {
      if (!this._isActive(i)) continue;

      const pos = this._positions[i];
      const vel = this._velocities[i];
      const force = this._forces[i];

      // Center force (using pre-allocated vector)
      this.tempVector1.copy(pos).multiplyScalar(-this.centerForce);
      force.add(this.tempVector1);

      // Update velocity and position
      vel.add(force.multiplyScalar(this.forceStrength * 0.01));
      vel.multiplyScalar(this.damping);

      // Use pre-allocated vector for position update
      this.tempVector2.copy(vel).multiplyScalar(0.1);
      pos.add(this.tempVector2);

      // Update instanced mesh matrix
      this.dummy.position.copy(pos);

      // Handle selection highlighting
      if (this.selectedNodeIndex === i) {
        this.dummy.scale.set(1.3, 1.3, 1.3);
      } else {
        this.dummy.scale.set(this._baseScale, this._baseScale, this._baseScale);
      }

      this.dummy.updateMatrix();
      this._nodeMesh.setMatrixAt(i, this.dummy.matrix);
    }

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

    // Raycast against instanced mesh
    const intersects = raycaster.intersectObject(this._nodeMesh);

    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      const nodeName = this._indexToName[instanceId];

      if (!nodeName || !this._isActive(instanceId)) return;

      // Reset previous selection
      if (this.selectedNodeIndex >= 0) {
        this._nodeMesh.setColorAt(
          this.selectedNodeIndex,
          new THREE.Color(this._originalColors[this.selectedNodeIndex])
        );
      }

      // Handle selection
      if (this.selectedNodeIndex === instanceId) {
        this.selectedNodeIndex = -1;
        this.selectedNode = null;
        this.hideNodeDetails();
      } else {
        this.selectedNodeIndex = instanceId;
        this.selectedNode = this.nodes.get(nodeName);
        this._nodeMesh.setColorAt(instanceId, new THREE.Color(0xff00ff));
        this.showNodeDetails();
      }

      this._nodeMesh.instanceColor.needsUpdate = true;
    } else {
      // Deselect if clicking empty space
      if (this.selectedNodeIndex >= 0) {
        this._nodeMesh.setColorAt(
          this.selectedNodeIndex,
          new THREE.Color(this._originalColors[this.selectedNodeIndex])
        );
        this._nodeMesh.instanceColor.needsUpdate = true;
      }
      this.selectedNodeIndex = -1;
      this.selectedNode = null;
      this.hideNodeDetails();
    }

    // Update game display
    if (this.selectedNode) {
      drawGrid();
      board = keyToBoard(this.selectedNode.name);
      currentPlayer = nextPlayer(board);

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          drawSymbol(r, c, board[r][c]);
        }
      }
      updateGameStatus();
    } else {
      drawGrid();
      updateGameStatus();
    }
  }

  updateNodeSizes(size) {
    const scale = size / 20;
    this._baseScale = scale;

    // Update all active nodes
    for (let i = 0; i < this._nodeCount; i++) {
      if (!this._isActive(i)) continue;

      this.dummy.position.copy(this._positions[i]);
      if (this.selectedNodeIndex === i) {
        this.dummy.scale.set(scale * 1.3, scale * 1.3, scale * 1.3);
      } else {
        this.dummy.scale.set(scale, scale, scale);
      }
      this.dummy.updateMatrix();
      this._nodeMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this._nodeMesh.instanceMatrix.needsUpdate = true;
  }

  updateStats() {
    document.getElementById("nodeCount").textContent = this.nodes.size;
    document.getElementById("edgeCount").textContent = this.edges.length;
  }

  clearGraph() {
    // Clear edges
    this.edges.forEach((edge) => {
      this.scene.remove(edge.line);
    });

    // Reset instanced mesh
    for (let i = 0; i < this._nodeCount; i++) {
      this.dummy.position.set(0, 0, 0);
      this.dummy.scale.set(
        this._baseDisabledScale,
        this._baseDisabledScale,
        this._baseDisabledScale
      );
      this.dummy.updateMatrix();
      this._nodeMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this._nodeMesh.instanceMatrix.needsUpdate = true;
    this._nodeMesh.count = 0;

    // Clear data structures
    this.nodes.clear();
    this.edges = [];
    this.selectedNode = null;
    this.selectedNodeIndex = -1;
    this._nodeCount = 0;
    this._indexToName = [];

    this.updateStats();
    this.updateDropdowns();
    this.hideNodeDetails();
  }

  toggleLabels() {
    this.labelsVisible = !this.labelsVisible;
    // Note: Labels are not implemented for instanced meshes in this version
    // You would need a separate system for labels with instanced rendering
  }

  showNodeDetails() {
    if (!this.selectedNode) return;

    const nodeName = this.selectedNode.name;
    const nodeNextPlayer = this.selectedNode.state.next_player;
    const nodeGameStatus = this.selectedNode.state.status;

    // Get connected nodes
    const connections = this.edges.filter(
      (edge) => edge.node1.name === nodeName || edge.node2.name === nodeName
    );

    const connectedNodes = connections.map((edge) => {
      return edge.node1.name === nodeName ? edge.node2.name : edge.node1.name;
    });

    const pos = this._positions[this.selectedNode.index];

    // Update UI
    document.getElementById("nodeDetails").style.display = "block";
    document.getElementById("selectedNodeName").textContent = nodeName;
    document.getElementById("selectedNodeColor").textContent =
      "#" + this.selectedNode.originalColor.toString(16).padStart(6, "0");
    document.getElementById(
      "selectedNodePosition"
    ).textContent = `(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(
      1
    )})`;
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
    if (this.selectedNodeIndex < 0 || !this.selectedNode) return;

    const nodeName = this.selectedNode.name;

    // Remove all edges connected to this node
    this.edges = this.edges.filter((edge) => {
      const isConnected =
        edge.node1.name === nodeName || edge.node2.name === nodeName;
      if (isConnected) {
        this.scene.remove(edge.line);
      }
      return !isConnected;
    });

    // Disable the node in instanced mesh
    this.dummy.position.set(0, 0, 0);
    this.dummy.scale.set(
      this._baseDisabledScale,
      this._baseDisabledScale,
      this._baseDisabledScale
    );
    this.dummy.updateMatrix();
    this._nodeMesh.setMatrixAt(this.selectedNodeIndex, this.dummy.matrix);
    this._nodeMesh.instanceMatrix.needsUpdate = true;

    // Remove from data structures
    this.nodes.get(nodeName).active = false;
    this.nodes.delete(nodeName);
    this._indexToName[this.selectedNodeIndex] = undefined;

    this.selectedNode = null;
    this.selectedNodeIndex = -1;

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

    // Update FPS
    this.frameCount++;
    const currentTime = performance.now();
    if (currentTime - this.lastTime >= 1000) {
      document.getElementById("fps").textContent = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    // Update instanced mesh
    this._nodeMesh.instanceMatrix.needsUpdate = true;
    this._nodeMesh.instanceColor.needsUpdate = true;
    this._edgeMesh.instanceMatrix.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
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

  // console.log(graph._forces[0])

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

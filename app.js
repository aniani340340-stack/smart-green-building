/**
 * SMART NET-ZERO GREEN BUILDING - 3D INTERACTIVE SIMULATION ENGINE
 * Powered by Three.js & Modern Web Audio API
 * Built for Unit 1-5 Environmental Engineering Syllabus Demonstration
 */

// ============================================================================
// 1. GLOBAL STATE & TELEMETRY MODEL
// ============================================================================
const state = {
  // Environmental Microclimate
  timeOfDay: 12.5,        // 6.0 (6 AM) to 22.0 (10 PM)
  ambientTemp: 33.5,      // Degrees Celsius (Linked to Solar Gain)
  manualTempOverride: false, // Whether user explicitly forced temperature
  isRaining: false,
  isLdrCovered: false,    // Hand over sensor simulation
  isRoomOccupied: true,   // PIR presence detection
  
  // Dynamic Sensor Outputs
  ldrLux: 1250,           // Ambient illuminance in Lux
  solarIrradiance: 820,   // W/m²
  relativeHumidity: 52,   // % RH
  
  // Actuator States
  roomLightOn: false,     // Ground floor LED fixture
  fanRunning: false,      // DC Ceiling Fan
  fanSpeed: 0,            // RPM multiplier
  exhaustRunning: false,  // High-Power Opposite Wall Exhaust Fan
  exhaustSpeed: 0,        // Air CFM multiplier
  exhaustLoadWatts: 35,   // Wattage when active
  windowOpenAngle: 0,     // 0 (closed) to 45 deg (open)
  targetWindowAngle: 0,
  
  // Energy Flow & Storage
  solarGenerationWatts: 340,
  baseLoadWatts: 35,
  lightLoadWatts: 40,
  fanLoadWatts: 55,
  currentLoadWatts: 55,
  netEnergyWatts: 285,
  batterySoc: 94,         // % State of Charge
  
  // Rainwater Storage
  rainwaterLevelLitres: 42, // Max 100 L
  
  // Visualization Modes
  cutawayMode: true,
  thermalMode: false,
  energyFlowMode: true,
  strataExploded: false,
  sensorHudMode: true,
  
  // Camera & Guided Tour
  currentScene: 1,        // 1 to 6 or 'sandbox'
  isTourPlaying: false,
  tourTimer: null,
  
  // Audio
  audioEnabled: false,
  soundInitialized: false
};

// ============================================================================
// 2. THREE.JS SCENE, CAMERA, RENDERER & CONTROLS SETUP
// ============================================================================
let scene, camera, renderer, controls;
let buildingGroup, roofGroup, strataGroup, groundMesh, sunLight, ambientLight, skyDome;
let roomPointLight, deskSpotLight;
let ceilingFanBlades, servoWindowSash, personAvatar, pirSensorMesh, dht11Mesh, ldrMesh;
let solarParticles, windParticles, rainParticles, conduitPulsePoints = [];
let waterLevelMesh, waterHeight = 0.42;

// Volumetric Sunbeams & Direct Photon Beams
let sunbeamGroup, sunbeamMeshes = [], sunTargetPoints = [];
let photonParticles, photonData = [];
let sunCoronaGroup, rainCloudGroup;

// 3D In-Scene Sensor Working Visualizations & Holographic Badges
let pirBeamCone, pirRadarRings = [], pirBadgeObj, pirLedLight;
let dht11BadgeObj, dht11AuraMesh, dht11HeatWaves;
let ldrBadgeObj, ldrHandMesh, ldrSpotBeam;
let servoBadgeObj, ledBadgeObj;
let exhaustFanMesh, exhaustFanBlades, exhaustParticles, exhaustBadgeObj;
let sensorHudGroup;
let logicPulseMesh, logicPulsePoints = [];

const container = document.getElementById('canvas-container');

function init3D() {
  // Scene: Clean Daytime Sky Blue Background
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x38bdf8);
  scene.fog = new THREE.FogExp2(0x7dd3fc, 0.012);

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(22, 16, 26);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  // OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below ground
  controls.minDistance = 6;
  controls.maxDistance = 55;
  controls.target.set(0, 4, 0);

  // Lighting
  setupLighting();

  // Build Environment, Building Architecture & Systems
  buildTerrainAndGarden();
  buildSmartBuilding();
  buildSolarPhotovoltaicSystem();
  buildGreenRoofSystem();
  buildRainwaterSystem();
  buildIndoorSmartSensorsAndHVAC();
  buildRainCloudSystem();
  buildParticleSystems();

  // Window Resize Listener
  window.addEventListener('resize', onWindowResize);

  // Hide loader
  setTimeout(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) loader.classList.add('fade-out');
    updateSensorLogicAndTelemetry();
  }, 600);
}

// ============================================================================
// 3. PROCEDURAL TEXTURES GENERATOR (Canvas based, Zero External Asset Lag)
// ============================================================================
function createWoodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#b47743';
  ctx.fillRect(0, 0, 512, 512);

  // Plank lines
  ctx.fillStyle = '#8f5728';
  for (let i = 0; i < 512; i += 32) {
    ctx.fillRect(0, i, 512, 2);
  }
  // Wood grain noise
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let j = 0; j < 3000; j++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const w = Math.random() * 40 + 10;
    ctx.fillRect(x, y, w, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function createSolarCellTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Deep anti-reflective photovoltaic blue
  ctx.fillStyle = '#0b2545';
  ctx.fillRect(0, 0, 256, 256);

  // Silicon wafer cells
  ctx.strokeStyle = '#134074';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 248);

  // Silver busbars and grid fingers
  ctx.strokeStyle = '#64dfdf';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(85, 0); ctx.lineTo(85, 256);
  ctx.moveTo(170, 0); ctx.lineTo(170, 256);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.5;
  for (let y = 8; y < 256; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 3);
  return texture;
}

function createGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2d6a4f';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? '#40916c' : '#1b4332';
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

// ============================================================================
// 3B. 3D HOLOGRAPHIC SENSOR BADGE SPRITES GENERATOR
// ============================================================================
function createSensorBadgeSprite(title, value, statusColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');

  function render(t, v, c) {
    ctx.clearRect(0, 0, 512, 140);

    // Dark glass pill background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 124, 24);
    ctx.fill();

    // Vibrant border
    ctx.strokeStyle = c;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 124, 24);
    ctx.stroke();

    // Glowing status dot
    ctx.fillStyle = c;
    ctx.shadowColor = c;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(46, 70, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Title / Sensor type
    ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(t, 78, 52);

    // Live value / State
    ctx.font = 'bold 34px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(v, 78, 100);
  }

  render(title, value, statusColor);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.65, 0.45, 1);
  sprite.renderOrder = 999;

  return {
    sprite: sprite,
    canvas: canvas,
    ctx: ctx,
    texture: texture,
    update: function(t, v, c) {
      render(t, v, c);
      texture.needsUpdate = true;
    }
  };
}

// ============================================================================
// 4. LIGHTING & ATMOSPHERE
// ============================================================================
function setupLighting() {
  // Ambient Hemispheric Light (Sky-blue daylight + gentle ground bounce)
  ambientLight = new THREE.HemisphereLight(0xbae6fd, 0x1e3a1e, 0.75);
  scene.add(ambientLight);

  // Directional Sun Light with Soft Shadows
  sunLight = new THREE.DirectionalLight(0xfffdf0, 1.15);
  sunLight.position.set(20, 25, 18);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 70;
  sunLight.shadow.camera.left = -22;
  sunLight.shadow.camera.right = 22;
  sunLight.shadow.camera.top = 22;
  sunLight.shadow.camera.bottom = -22;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  // Sun Sphere Marker (Soft, compact natural Sun disc)
  sunCoronaGroup = new THREE.Group();

  // Natural Sun sphere (radius 1.25)
  const sunGeom = new THREE.SphereGeometry(1.25, 24, 24);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffdf0 });
  const sunMarker = new THREE.Mesh(sunGeom, sunMat);
  sunCoronaGroup.add(sunMarker);

  // Soft subtle warm halo (radius 1.85, low opacity 0.2)
  const haloGeo = new THREE.SphereGeometry(1.85, 16, 16);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.20,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  sunCoronaGroup.add(haloMesh);

  sunLight.add(sunCoronaGroup);
}

// ============================================================================
// 5. TERRAIN, GARDEN & ECO-LANDSCAPE
// ============================================================================
function buildTerrainAndGarden() {
  // Base Terrain
  const grassTex = createGrassTexture();
  const groundGeo = new THREE.PlaneGeometry(60, 60);
  const groundMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.85,
    metalness: 0.1
  });
  groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Concrete Foundation Slab
  const slabGeo = new THREE.BoxGeometry(16, 0.5, 14);
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.set(0, 0.25, 0);
  slab.receiveShadow = true;
  scene.add(slab);

  // Stone Walking Path
  const pathGeo = new THREE.BoxGeometry(2.6, 0.08, 12);
  const pathMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.6 });
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.position.set(-2, 0.28, 9);
  path.receiveShadow = true;
  scene.add(path);

  // Trees and Hedges
  const treePositions = [
    [-14, 0, -10], [-15, 0, 4], [14, 0, -8], [15, 0, 7], [-10, 0, 16]
  ];
  treePositions.forEach(pos => {
    const tree = createStylizedTree();
    tree.position.set(pos[0], pos[1], pos[2]);
    scene.add(tree);
  });

  // Garden perimeter flower/shrub bed
  for (let x = -8; x <= 8; x += 2.2) {
    if (Math.abs(x + 2) < 1.6) continue; // leave path open
    const shrub = createShrub();
    shrub.position.set(x, 0.5, 7.2);
    scene.add(shrub);
  }
}

function createStylizedTree() {
  const group = new THREE.Group();
  
  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 3.5, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.75;
  trunk.castShadow = true;
  group.add(trunk);

  // Foliage Cone Layers
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const coneGeo = new THREE.ConeGeometry(2.2 - i * 0.4, 2.4, 7);
    const cone = new THREE.Mesh(coneGeo, foliageMat);
    cone.position.y = 3.2 + i * 1.4;
    cone.castShadow = true;
    group.add(cone);
  }
  return group;
}

function createShrub() {
  const shrubGeo = new THREE.DodecahedronGeometry(0.65, 1);
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x38a169, roughness: 0.7, flatShading: true });
  const shrub = new THREE.Mesh(shrubGeo, shrubMat);
  shrub.castShadow = true;
  return shrub;
}

// ============================================================================
// 6. 2-FLOOR SMART BUILDING ARCHITECTURE (Modern Cutaway Model)
// ============================================================================
function buildSmartBuilding() {
  buildingGroup = new THREE.Group();

  const woodTex = createWoodTexture();
  const timberMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    transmission: 0.8,
    ior: 1.5,
    reflectivity: 0.6
  });
  const darkFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });

  // -------------------------------------------------------------
  // FLOOR 1 (Ground Floor - 10m x 8m x 3.2m)
  // -------------------------------------------------------------
  // Floorboard
  const floor1Geo = new THREE.BoxGeometry(10, 0.2, 8);
  const floor1 = new THREE.Mesh(floor1Geo, timberMat);
  floor1.position.set(0, 0.5, 0);
  floor1.receiveShadow = true;
  buildingGroup.add(floor1);

  // Rear Wall (Solid)
  const rearWallGeo = new THREE.BoxGeometry(10, 3.2, 0.3);
  const rearWall = new THREE.Mesh(rearWallGeo, wallMat);
  rearWall.position.set(0, 2.1, -3.85);
  rearWall.castShadow = true;
  rearWall.receiveShadow = true;
  buildingGroup.add(rearWall);

  // Left Wall (Cutaway Architecture: Half open for interior view)
  const leftWallGeo = new THREE.BoxGeometry(0.3, 3.2, 3.5);
  const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
  leftWall.position.set(-4.85, 2.1, -2.1);
  leftWall.castShadow = true;
  buildingGroup.add(leftWall);

  // Right Wall (Features Window Cutout for the Servo Cross-Ventilation)
  const rightWallBack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 3.2), wallMat);
  rightWallBack.position.set(4.85, 2.1, -2.25);
  buildingGroup.add(rightWallBack);

  const rightWallFront = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 2.2), wallMat);
  rightWallFront.position.set(4.85, 2.1, 2.75);
  buildingGroup.add(rightWallFront);

  // Window frame & lintel
  const windowLintel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 2.6), wallMat);
  windowLintel.position.set(4.85, 3.3, 0.4);
  buildingGroup.add(windowLintel);

  const windowSill = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 2.8), darkFrameMat);
  windowSill.position.set(4.85, 1.1, 0.4);
  buildingGroup.add(windowSill);

  // Front Facade (Structural Pillars + Glass Facade for Open BIM Cutaway)
  const pillarGeo = new THREE.BoxGeometry(0.4, 3.2, 0.4);
  const pillarLeft = new THREE.Mesh(pillarGeo, darkFrameMat);
  pillarLeft.position.set(-4.8, 2.1, 3.8);
  buildingGroup.add(pillarLeft);

  const pillarRight = new THREE.Mesh(pillarGeo, darkFrameMat);
  pillarRight.position.set(4.8, 2.1, 3.8);
  buildingGroup.add(pillarRight);

  // Front Entry Door Frame
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.5, 0.1), glassMat);
  doorFrame.position.set(-2, 1.85, 3.9);
  buildingGroup.add(doorFrame);

  // -------------------------------------------------------------
  // FLOOR 2 (Upper Floor & Cantilever Balcony)
  // -------------------------------------------------------------
  // Intermediate Slab / Ceiling of Ground Floor
  const interSlabGeo = new THREE.BoxGeometry(11.2, 0.35, 9.2);
  const interSlab = new THREE.Mesh(interSlabGeo, wallMat);
  interSlab.position.set(0.4, 3.8, 0.4);
  interSlab.castShadow = true;
  interSlab.receiveShadow = true;
  buildingGroup.add(interSlab);

  // Floor 2 Timber Floor
  const floor2Geo = new THREE.BoxGeometry(8, 0.1, 7);
  const floor2 = new THREE.Mesh(floor2Geo, timberMat);
  floor2.position.set(-0.8, 4.0, -0.4);
  buildingGroup.add(floor2);

  // Floor 2 Rear & Side Walls
  const f2Rear = new THREE.Mesh(new THREE.BoxGeometry(8.2, 2.8, 0.3), wallMat);
  f2Rear.position.set(-0.8, 5.4, -3.75);
  f2Rear.castShadow = true;
  buildingGroup.add(f2Rear);

  const f2Left = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.8, 7.2), wallMat);
  f2Left.position.set(-4.75, 5.4, -0.3);
  f2Left.castShadow = true;
  buildingGroup.add(f2Left);

  // Floor 2 Balcony with Glass Railing
  const balconyRailing = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 0.08), glassMat);
  balconyRailing.position.set(3.5, 4.55, 4.8);
  buildingGroup.add(balconyRailing);

  const balconyRailingSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 4.6), glassMat);
  balconyRailingSide.position.set(5.8, 4.55, 2.5);
  buildingGroup.add(balconyRailingSide);

  // Solar Battery Storage Unit (Tesla Powerwall / ESS Unit on Exterior Wall)
  const essGeo = new THREE.BoxGeometry(0.3, 1.6, 1.0);
  const essMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
  const essCabinet = new THREE.Mesh(essGeo, essMat);
  essCabinet.position.set(-4.95, 2.2, 1.5);
  buildingGroup.add(essCabinet);

  // Glowing Battery LED Strip
  const ledStripGeo = new THREE.BoxGeometry(0.05, 1.2, 0.08);
  const ledStripMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  const ledStrip = new THREE.Mesh(ledStripGeo, ledStripMat);
  ledStrip.position.set(-5.12, 2.2, 1.5);
  buildingGroup.add(ledStrip);

  scene.add(buildingGroup);
}

// ============================================================================
// 7. ROOFTOP SOLAR PHOTOVOLTAIC (PV) SYSTEM
// ============================================================================
function buildSolarPhotovoltaicSystem() {
  roofGroup = new THREE.Group();

  // Roof Base Slab
  const roofSlabGeo = new THREE.BoxGeometry(11.4, 0.35, 9.4);
  const roofSlabMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const roofSlab = new THREE.Mesh(roofSlabGeo, roofSlabMat);
  roofSlab.position.set(0.2, 6.9, 0.2);
  roofSlab.castShadow = true;
  roofGroup.add(roofSlab);

  // Solar PV Arrays (6 High-Efficiency Angled Solar Panels on Southern Tilt)
  const solarTex = createSolarCellTexture();
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    roughness: 0.25,
    metalness: 0.75
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });

  const panelWidth = 1.6;
  const panelLength = 2.4;
  const tiltAngle = THREE.MathUtils.degToRad(28); // 28-degree optimal solar harvest angle

  // 2 rows of 3 panels
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const panelGroup = new THREE.Group();

      // Photovoltaic Surface
      const pvMesh = new THREE.Mesh(new THREE.BoxGeometry(panelWidth, 0.06, panelLength), solarMat);
      pvMesh.castShadow = true;
      pvMesh.receiveShadow = true;
      panelGroup.add(pvMesh);

      // Aluminum Strut Framing
      const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(panelWidth + 0.1, 0.05, panelLength + 0.1), frameMat);
      frameMesh.position.y = -0.03;
      panelGroup.add(frameMesh);

      // Mounting Legs
      const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6), frameMat);
      leg1.position.set(0.6, -0.3, -0.9);
      panelGroup.add(leg1);

      const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6), frameMat);
      leg2.position.set(-0.6, -0.3, -0.9);
      panelGroup.add(leg2);

      // Tilt South towards sun
      panelGroup.rotation.x = tiltAngle;
      panelGroup.position.set(
        -3.2 + col * 2.1,
        7.5,
        -2.2 + row * 2.8
      );
      roofGroup.add(panelGroup);
    }
  }

  // Electrical Wire Conduit from Solar Panels down to Battery Unit
  const conduitMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6 });
  const conduit1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.8), conduitMat);
  conduit1.position.set(-4.9, 4.6, 1.5);
  roofGroup.add(conduit1);

  // Store pulse points for animated electrical energy particles
  conduitPulsePoints = [
    new THREE.Vector3(-1.0, 7.6, -1.0),
    new THREE.Vector3(-4.9, 7.2, 1.5),
    new THREE.Vector3(-4.9, 2.2, 1.5),
    new THREE.Vector3(0, 2.0, 0)
  ];

  scene.add(roofGroup);
}

// ============================================================================
// 8. GREEN ROOF & LAYERED PASSIVE COOLING STRATA
// ============================================================================
function buildGreenRoofSystem() {
  strataGroup = new THREE.Group();

  // Green Roof Grass & Sedum Layer
  const grassTex = createGrassTexture();
  const turfMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.9,
    metalness: 0.05
  });

  // Layer 1: Vegetation & Turf (Upper Layer)
  const turfMesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 6.8), turfMat);
  turfMesh.position.set(3.4, 7.25, 0.6);
  turfMesh.castShadow = true;
  strataGroup.add(turfMesh);

  // Layer 2: Engineered Substrate / Growing Soil Medium
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 1.0 });
  const soilMesh = new THREE.Mesh(new THREE.BoxGeometry(4.18, 0.1, 6.78), soilMat);
  soilMesh.position.set(3.4, 7.15, 0.6);
  strataGroup.add(soilMesh);

  // Layer 3: Filter Fleece & Drainage Mat
  const drainMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
  const drainMesh = new THREE.Mesh(new THREE.BoxGeometry(4.16, 0.08, 6.76), drainMat);
  drainMesh.position.set(3.4, 7.07, 0.6);
  strataGroup.add(drainMesh);

  // Planter Edge Border (Natural Cedar Trim)
  const borderMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  const borderFront = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 0.15), borderMat);
  borderFront.position.set(3.4, 7.3, 4.05);
  strataGroup.add(borderFront);

  const borderBack = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 0.15), borderMat);
  borderBack.position.set(3.4, 7.3, -2.85);
  strataGroup.add(borderBack);

  // Sedum & Flower Succulents scattered on green roof
  for (let i = 0; i < 14; i++) {
    const rx = 1.8 + Math.random() * 3.2;
    const rz = -2.2 + Math.random() * 5.6;
    const sedum = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.25, 0),
      new THREE.MeshStandardMaterial({ color: Math.random() > 0.4 ? 0x22c55e : 0x84cc16, roughness: 0.8 })
    );
    sedum.position.set(rx, 7.4, rz);
    strataGroup.add(sedum);
  }

  roofGroup.add(strataGroup);
}

// ============================================================================
// 9. RAINWATER HARVESTING & FILTRATION RESERVOIR SYSTEM
// ============================================================================
function buildRainwaterSystem() {
  const gutterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.3 });
  const pipeMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.5,
    roughness: 0.1,
    transmission: 0.8
  });

  // Roof Catchment Perimeter Gutter
  const gutterGeo = new THREE.BoxGeometry(0.2, 0.18, 9.4);
  const gutter = new THREE.Mesh(gutterGeo, gutterMat);
  gutter.position.set(5.75, 6.9, 0.2);
  roofGroup.add(gutter);

  // Vertical Downspout Pipe running down rear wall
  const downpipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 6.4, 16);
  const downpipe = new THREE.Mesh(downpipeGeo, pipeMat);
  downpipe.position.set(5.7, 3.8, -3.8);
  buildingGroup.add(downpipe);

  // First-Flush Sediment Filter Chamber
  const filterGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 16);
  const filterBox = new THREE.Mesh(filterGeo, gutterMat);
  filterBox.position.set(5.7, 3.6, -3.8);
  buildingGroup.add(filterBox);

  // Ground Level Rainwater Storage Tank (Transparent with Water Level Indicator)
  const tankGroup = new THREE.Group();
  tankGroup.position.set(6.4, 0.5, -3.8);

  // Clear Acrylic Tank Shell
  const tankOuterGeo = new THREE.CylinderGeometry(0.85, 0.85, 2.2, 24);
  const tankOuterMat = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    transmission: 0.85,
    ior: 1.45
  });
  const tankOuter = new THREE.Mesh(tankOuterGeo, tankOuterMat);
  tankOuter.position.y = 1.1;
  tankGroup.add(tankOuter);

  // Tank Metal Bands & Base
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.8 });
  for (let y = 0.3; y <= 2.0; y += 0.8) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.03, 8, 24), bandMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    tankGroup.add(band);
  }

  // Dynamic Water Level inside Tank
  const waterGeo = new THREE.CylinderGeometry(0.82, 0.82, 1.0, 24);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.8
  });
  waterLevelMesh = new THREE.Mesh(waterGeo, waterMat);
  waterLevelMesh.position.y = 0.5; // Scaled dynamically in animate()
  tankGroup.add(waterLevelMesh);

  // Water Tap / Garden Irrigation Spigot
  const tapGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3);
  const tap = new THREE.Mesh(tapGeo, bandMat);
  tap.rotation.z = Math.PI / 2;
  tap.position.set(0.9, 0.35, 0);
  tankGroup.add(tap);

  buildingGroup.add(tankGroup);
}

// ============================================================================
// 10. INDOOR SMART SENSORS, AUTOMATION & HVAC
// ============================================================================
function buildIndoorSmartSensorsAndHVAC() {
  const roomGroup = new THREE.Group();

  // -------------------------------------------------------------
  // Furniture: Desk, Computer, Chair
  // -------------------------------------------------------------
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.2), deskMat);
  deskTop.position.set(0.5, 1.4, -1.8);
  deskTop.castShadow = true;
  roomGroup.add(deskTop);

  // Desk Legs
  for (let dx of [-1.0, 1.0]) {
    for (let dz of [-0.45, 0.45]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4), deskMat);
      leg.position.set(0.5 + dx, 0.7, -1.8 + dz);
      leg.castShadow = true;
      roomGroup.add(leg);
    }
  }

  // Dual Monitors on Desk
  const monitorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const monitor1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.04), monitorMat);
  monitor1.position.set(0.1, 1.85, -2.1);
  const screen1 = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.48, 0.02), screenMat);
  screen1.position.set(0.1, 1.85, -2.08);
  roomGroup.add(monitor1, screen1);

  // Office Chair
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.7), chairMat);
  chairSeat.position.set(0.5, 1.0, -0.9);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.1), chairMat);
  chairBack.position.set(0.5, 1.45, -0.55);
  roomGroup.add(chairSeat, chairBack);

  // -------------------------------------------------------------
  // Stylized Human Avatar (Presence Detection Target)
  // -------------------------------------------------------------
  personAvatar = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1b3, roughness: 0.6 });
  const clothesMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.7 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), skinMat);
  head.position.y = 2.1;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), clothesMat);
  torso.position.y = 1.5;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.25), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  legs.position.y = 0.85;

  personAvatar.add(head, torso, legs);
  personAvatar.position.set(0.5, 0.5, -0.9); // Standing at desk
  personAvatar.castShadow = true;
  roomGroup.add(personAvatar);

  // -------------------------------------------------------------
  // SMART SENSORS & IN-SCENE 3D VISUALIZATION
  // -------------------------------------------------------------
  sensorHudGroup = new THREE.Group();

  // 1. PIR Motion Sensor (Corner Ceiling Mount)
  const pirGroup = new THREE.Group();
  // Green breakout PCB
  const pirPcb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.42, 0.04), new THREE.MeshStandardMaterial({ color: 0x166534 }));
  // White housing base
  const pirBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.08), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  pirBase.position.z = 0.05;
  // White faceted Fresnel Dome
  const pirDome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 }));
  pirDome.position.z = 0.14;
  // Status Micro-LED indicator
  pirLedLight = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
  pirLedLight.position.set(0.1, 0.14, 0.08);

  pirGroup.add(pirPcb, pirBase, pirDome, pirLedLight);
  pirGroup.position.set(-4.5, 3.2, -3.6);
  pirSensorMesh = pirGroup;
  roomGroup.add(pirGroup);

  // PIR Infrared Detection Scanning Cone (Volumetric FOV Beam in 3D)
  const pirDir = new THREE.Vector3(5.0, -2.0, 2.7);
  const pirDist = pirDir.length();
  const coneGeo = new THREE.ConeGeometry(2.2, pirDist, 18, 1, true);
  coneGeo.translate(0, -pirDist / 2, 0); // Tip at origin

  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  pirBeamCone = new THREE.Mesh(coneGeo, coneMat);
  pirBeamCone.position.set(-4.5, 3.2, -3.6);
  pirBeamCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), pirDir.clone().normalize());
  roomGroup.add(pirBeamCone);

  // Floating 3D Holographic PIR Badge (Rear-Left Corner Ceiling)
  pirBadgeObj = createSensorBadgeSprite('PIR MOTION SENSOR', 'DETECTED (OCCUPIED)', '#10b981');
  pirBadgeObj.sprite.position.set(-3.8, 3.55, -3.5);
  sensorHudGroup.add(pirBadgeObj.sprite);

  // 2. DHT11 Digital Temperature & Humidity Sensor (Wall Mount)
  const dhtGroup = new THREE.Group();
  // Blue plastic sensor casing with ventilation grille
  const dhtCasing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.08), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }));
  const dhtGrid = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.24, 0.02), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  dhtGrid.position.z = 0.05;
  // Pin headers
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  const pins = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.02), pinMat);
  pins.position.y = -0.22;

  dhtGroup.add(dhtCasing, dhtGrid, pins);
  dhtGroup.position.set(-2.0, 2.3, -3.75);
  dht11Mesh = dhtGroup;
  roomGroup.add(dhtGroup);

  // DHT11 Thermal Warning Aura Sphere
  dht11AuraMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  dht11AuraMesh.position.set(-2.0, 2.3, -3.75);
  roomGroup.add(dht11AuraMesh);

  // DHT11 Heat Particles (Waving heat shimmer when overheating)
  const heatCount = 36;
  const heatGeo = new THREE.BufferGeometry();
  const heatPos = new Float32Array(heatCount * 3);
  for (let i = 0; i < heatCount * 3; i += 3) {
    heatPos[i] = -2.0 + (Math.random() - 0.5) * 0.4;
    heatPos[i + 1] = 2.4 + Math.random() * 0.9;
    heatPos[i + 2] = -3.7 + (Math.random() - 0.5) * 0.2;
  }
  heatGeo.setAttribute('position', new THREE.BufferAttribute(heatPos, 3));
  dht11HeatWaves = new THREE.Points(heatGeo, new THREE.PointsMaterial({
    color: 0xf43f5e,
    size: 0.16,
    transparent: true,
    opacity: 0, // Activated when temp >= 28C
    blending: THREE.AdditiveBlending
  }));
  roomGroup.add(dht11HeatWaves);

  // Floating 3D Holographic DHT11 Badge (Rear Center Wall)
  dht11BadgeObj = createSensorBadgeSprite('DHT11 TEMP & HUMIDITY', '24.5°C (NORMAL)', '#06b6d4');
  dht11BadgeObj.sprite.position.set(-0.8, 2.5, -3.75);
  sensorHudGroup.add(dht11BadgeObj.sprite);

  // 3. LDR Light Sensor (Window Sill Mount)
  const ldrGroup = new THREE.Group();
  // Mini breakout board
  const ldrPcb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.28), new THREE.MeshStandardMaterial({ color: 0x1e3a5f }));
  // Cadmium sulfide photocell disk
  const ldrDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }));
  ldrDisk.position.y = 0.03;
  // S-curve sensor track
  const track = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.03), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
  track.position.y = 0.05;

  ldrGroup.add(ldrPcb, ldrDisk, track);
  ldrGroup.position.set(4.7, 1.25, 0.4);
  ldrMesh = ldrGroup;
  roomGroup.add(ldrGroup);

  // Stylized 3D Hand Cover Simulation Mesh (hovers over LDR when hand is placed)
  const handGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16);
  const handMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    transparent: true,
    opacity: 0.85,
    roughness: 0.5
  });
  ldrHandMesh = new THREE.Mesh(handGeo, handMat);
  ldrHandMesh.position.set(4.7, 1.65, 0.4);
  ldrHandMesh.visible = false; // toggled when LDR covered
  roomGroup.add(ldrHandMesh);

  // Focused sunlight beam on LDR
  const ldrBeamGeo = new THREE.CylinderGeometry(0.08, 0.22, 1.8, 12, 1, true);
  ldrBeamGeo.translate(0, -0.9, 0);
  ldrSpotBeam = new THREE.Mesh(ldrBeamGeo, new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  }));
  ldrSpotBeam.position.set(4.7, 3.0, 0.4);
  roomGroup.add(ldrSpotBeam);

  // Floating 3D Holographic LDR Badge (Window Sill Mount)
  ldrBadgeObj = createSensorBadgeSprite('LDR LIGHT SENSOR', '1,250 Lux (DAYLIGHT)', '#f59e0b');
  ldrBadgeObj.sprite.position.set(4.85, 1.9, 0.4);
  sensorHudGroup.add(ldrBadgeObj.sprite);

  // -------------------------------------------------------------
  // SMART ACTUATORS & IN-SCENE BADGES
  // -------------------------------------------------------------
  // 1. Automatic Ceiling LED Luminaire
  const ledPanelGeo = new THREE.BoxGeometry(2.0, 0.05, 1.2);
  const ledPanelMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    emissive: 0x000000,
    roughness: 0.2
  });
  const ledPanel = new THREE.Mesh(ledPanelGeo, ledPanelMat);
  ledPanel.position.set(0, 3.7, -1.0);
  roomGroup.add(ledPanel);

  // Dynamic Point Light emitted by LED panel
  roomPointLight = new THREE.PointLight(0xfff1e6, 0, 12, 1.5);
  roomPointLight.position.set(0, 3.5, -1.0);
  roomPointLight.castShadow = true;
  roomGroup.add(roomPointLight);

  // Floating 3D LED Badge (Center Ceiling)
  ledBadgeObj = createSensorBadgeSprite('SMART LED FIXTURE', 'OFF (0W - SAVING)', '#10b981');
  ledBadgeObj.sprite.position.set(0.6, 3.75, -0.8);
  sensorHudGroup.add(ledBadgeObj.sprite);

  // 2. Automatic Ceiling Fan (DHT11 Microclimate Control)
  const fanGroup = new THREE.Group();
  fanGroup.position.set(0, 3.4, 1.2);

  const fanRod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
  fanRod.position.y = 0.25;
  fanGroup.add(fanRod);

  const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  fanGroup.add(fanHub);

  ceilingFanBlades = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const bladeGeo = new THREE.BoxGeometry(1.2, 0.02, 0.18);
    const blade = new THREE.Mesh(bladeGeo, new THREE.MeshStandardMaterial({ color: 0x334155 }));
    blade.position.set(Math.cos(angle) * 0.7, 0, Math.sin(angle) * 0.7);
    blade.rotation.y = -angle;
    blade.rotation.z = 0.1; // Aerodynamic pitch angle
    ceilingFanBlades.add(blade);
  }
  fanGroup.add(ceilingFanBlades);
  roomGroup.add(fanGroup);

  // 3. Motorized Automatic Servo Window (SG90 Micro-Servo Cross-Ventilation)
  const windowPivot = new THREE.Group();
  windowPivot.position.set(4.85, 2.0, -0.9); // Pivot hinge at side

  const sashFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.8, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 })
  );
  sashFrame.position.set(0, 0, 1.25);

  const sashGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 1.6, 2.3),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.1 })
  );
  sashGlass.position.set(0, 0, 1.25);

  windowPivot.add(sashFrame, sashGlass);
  servoWindowSash = windowPivot;
  roomGroup.add(windowPivot);

  // SG90 Micro-Servo Motor Model (Mounted on top corner of window frame)
  const servoMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
  const servoBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.14), servoMat);
  servoBody.position.set(4.85, 2.95, -0.9);
  roomGroup.add(servoBody);

  // Floating 3D Servo Window Badge (Right Wall Window Frame)
  servoBadgeObj = createSensorBadgeSprite('SG90 SERVO MOTOR', 'WINDOW CLOSED (0°)', '#64748b');
  servoBadgeObj.sprite.position.set(4.85, 3.65, 0.4);
  sensorHudGroup.add(servoBadgeObj.sprite);

  // -------------------------------------------------------------
  // 4. Industrial Wall Exhaust Fan (Mounted on OPPOSITE Wall: Left Wall at x = -4.85)
  // Emits Internal Room Air Directly Outwards Through Left Wall
  // -------------------------------------------------------------
  const exhaustGroup = new THREE.Group();
  exhaustGroup.position.set(-4.85, 2.85, -1.2);

  // Square Industrial Wall Shroud / Mounting Flange (Penetrates left wall)
  const shroudMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.6 });
  const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.05, 1.05), shroudMat);
  exhaustGroup.add(shroud);

  // Cylindrical Wall Cowl Duct (Passing through the left wall along X-axis)
  const ductMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
  const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.38, 24), ductMat);
  duct.rotation.z = Math.PI / 2; // Aligned through left wall
  exhaustGroup.add(duct);

  // Outer & Inner Protective Wire Grille Guards
  const guardMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  const guardOuter = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.014, 8, 24), guardMat);
  guardOuter.rotation.y = Math.PI / 2;
  guardOuter.position.x = -0.19; // Outside yard face
  const guardInner = new THREE.Mesh(new THREE.TorusGeometry(0.40, 0.014, 8, 24), guardMat);
  guardInner.rotation.y = Math.PI / 2;
  guardInner.position.x = 0.19;  // Inside room face
  exhaustGroup.add(guardOuter, guardInner);

  // Cross wire braces
  const braceH = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.8), guardMat);
  const braceV = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.8, 0.02), guardMat);
  exhaustGroup.add(braceH, braceV);

  // Aerodynamic Impeller Blades (Rotates around X-axis to emit air outwards)
  exhaustFanBlades = new THREE.Group();
  exhaustFanBlades.position.x = 0.02;

  const motorBullet = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.16, 16), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
  motorBullet.rotation.z = Math.PI / 2;
  exhaustFanBlades.add(motorBullet);

  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI * 2) / 4;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.36, 0.09), bladeMat);
    blade.position.set(0, Math.sin(angle) * 0.21, Math.cos(angle) * 0.21);
    blade.rotation.x = angle + 0.35; // Aerodynamic pitch angle
    exhaustFanBlades.add(blade);
  }
  exhaustGroup.add(exhaustFanBlades);
  exhaustFanMesh = exhaustGroup;
  roomGroup.add(exhaustGroup);

  // Dynamic Warm Exhaust Heat Particles (Emits internal room air outwards through left wall)
  const exhaustCount = 80;
  const exhaustGeo = new THREE.BufferGeometry();
  const exhaustPos = new Float32Array(exhaustCount * 3);
  for (let i = 0; i < exhaustCount * 3; i += 3) {
    exhaustPos[i] = -4.85 - Math.random() * 3.5; // From left wall outwards (-X)
    exhaustPos[i + 1] = 2.85 + (Math.random() - 0.5) * 0.6;
    exhaustPos[i + 2] = -1.2 + (Math.random() - 0.5) * 0.6;
  }
  exhaustGeo.setAttribute('position', new THREE.BufferAttribute(exhaustPos, 3));
  exhaustParticles = new THREE.Points(exhaustGeo, new THREE.PointsMaterial({
    color: 0xf59e0b,
    size: 0.18,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending
  }));
  roomGroup.add(exhaustParticles);

  // Floating 3D Holographic Exhaust Fan Badge (Opposite Left Wall)
  exhaustBadgeObj = createSensorBadgeSprite('SMART EXHAUST FAN', 'IDLE (OFF)', '#64748b');
  exhaustBadgeObj.sprite.position.set(-4.85, 3.65, -1.2);
  sensorHudGroup.add(exhaustBadgeObj.sprite);

  // Add the Sensor Holographic HUD Group
  roomGroup.add(sensorHudGroup);

  buildingGroup.add(roomGroup);
}

// ============================================================================
// 10B. 3D RAIN CLOUD SYSTEM (Stylized Overcast Storm Clouds)
// ============================================================================
function buildRainCloudSystem() {
  rainCloudGroup = new THREE.Group();
  rainCloudGroup.position.set(0, 13.5, 0);

  // Material for stylized low-poly stormy rain clouds
  const cloudMatDark = new THREE.MeshStandardMaterial({
    color: 0x334155, // Slate 700
    roughness: 0.9,
    flatShading: true
  });
  const cloudMatMid = new THREE.MeshStandardMaterial({
    color: 0x475569, // Slate 600
    roughness: 0.85,
    flatShading: true
  });
  const cloudMatBottom = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Slate 800 - dark stormy base
    roughness: 0.95,
    flatShading: true
  });

  // Cloud puff cluster positions [x, y, z, radius, mat]
  const puffs = [
    [0, 0, 0, 2.8, cloudMatMid],
    [-2.4, 0.2, 0.4, 2.3, cloudMatDark],
    [2.5, -0.1, -0.3, 2.4, cloudMatMid],
    [-0.5, 0.9, -0.2, 2.6, cloudMatMid],
    [1.7, 0.8, 0.5, 2.1, cloudMatDark],
    [-1.6, -0.3, 2.2, 2.0, cloudMatDark],
    [0.9, -0.2, 2.5, 2.2, cloudMatMid],
    [2.9, -0.4, 1.8, 1.7, cloudMatDark],
    [-3.6, -0.3, 1.5, 1.8, cloudMatDark],
    [-1.9, -0.2, -2.2, 2.1, cloudMatMid],
    [0.7, -0.3, -2.5, 2.3, cloudMatDark],
    [2.7, -0.2, -2.1, 1.9, cloudMatMid],
    [-3.3, -0.4, -1.7, 1.7, cloudMatDark],
    [-4.8, -0.5, 0, 1.9, cloudMatDark],
    [4.8, -0.5, 0.2, 1.9, cloudMatMid],
    [-1.0, -1.1, 0, 2.2, cloudMatBottom],
    [1.5, -1.2, 0.2, 2.3, cloudMatBottom]
  ];

  puffs.forEach(p => {
    const geo = new THREE.DodecahedronGeometry(p[3], 1);
    const mesh = new THREE.Mesh(geo, p[4]);
    mesh.position.set(p[0], p[1], p[2]);
    mesh.castShadow = true;
    rainCloudGroup.add(mesh);
  });

  // Initially scaled to 0 (scales up smoothly when rainfall starts)
  rainCloudGroup.scale.set(0.001, 0.001, 0.001);
  scene.add(rainCloudGroup);
}

// ============================================================================
// 11. VOLUMETRIC SUNBEAMS & PARTICLE SYSTEMS (Sun Rays, Breeze & Rain)
// ============================================================================
function buildParticleSystems() {
  // -------------------------------------------------------------
  // 1. Sun Targets & Volumetric Light Shafts (Soft Ethereal God-Rays)
  // -------------------------------------------------------------
  sunTargetPoints = [
    new THREE.Vector3(-3.2, 7.5, -2.2), // Solar Panel Row 1 Left
    new THREE.Vector3(-1.1, 7.5, -2.2), // Solar Panel Row 1 Center
    new THREE.Vector3(1.0, 7.5, -2.2),  // Solar Panel Row 1 Right
    new THREE.Vector3(-3.2, 7.5, 0.6),  // Solar Panel Row 2 Left
    new THREE.Vector3(-1.1, 7.5, 0.6),  // Solar Panel Row 2 Center
    new THREE.Vector3(1.0, 7.5, 0.6),   // Solar Panel Row 2 Right
    new THREE.Vector3(3.4, 7.4, 0.6),   // Green Roof Garden (Evapotranspiration)
    new THREE.Vector3(4.8, 2.5, 0.4)    // Ground Floor Glazed Window (Direct Solar Heat Gain)
  ];

  sunbeamGroup = new THREE.Group();
  sunbeamMeshes = [];

  sunTargetPoints.forEach((target, index) => {
    // Soft, slender light beam stretching from Sun to Target
    const beamGeo = new THREE.CylinderGeometry(0.18, 1.1, 1.0, 16, 1, true);
    beamGeo.translate(0, -0.5, 0); // Origin at top (Sun position)

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.10,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    sunbeamGroup.add(beamMesh);
    sunbeamMeshes.push({ mesh: beamMesh, target: target, baseIndex: index });
  });
  scene.add(sunbeamGroup);

  // -------------------------------------------------------------
  // 2. Direct Streaming Photon Particles (Soft Light Dust)
  // -------------------------------------------------------------
  const photonCount = 160;
  const photonGeo = new THREE.BufferGeometry();
  const photonPositions = new Float32Array(photonCount * 3);
  photonData = [];

  for (let i = 0; i < photonCount; i++) {
    const targetIdx = i % sunTargetPoints.length;
    const progress = Math.random();
    const speed = 0.45 + Math.random() * 0.6;
    const spreadAngle = Math.random() * Math.PI * 2;
    const spreadRadius = Math.random() * 0.45;

    photonData.push({
      targetIdx: targetIdx,
      progress: progress,
      speed: speed,
      spreadX: Math.cos(spreadAngle) * spreadRadius,
      spreadZ: Math.sin(spreadAngle) * spreadRadius
    });

    photonPositions[i * 3] = 0;
    photonPositions[i * 3 + 1] = 20;
    photonPositions[i * 3 + 2] = 0;
  }

  photonGeo.setAttribute('position', new THREE.BufferAttribute(photonPositions, 3));
  const photonMat = new THREE.PointsMaterial({
    color: 0xfffbeb,
    size: 0.20,
    transparent: true,
    opacity: 0.60,
    blending: THREE.AdditiveBlending
  });
  photonParticles = new THREE.Points(photonGeo, photonMat);
  scene.add(photonParticles);

  // -------------------------------------------------------------
  // 3. Wind Breeze Airflow Particles (Streaming through opened servo window)
  // -------------------------------------------------------------
  const windCount = 120;
  const windGeo = new THREE.BufferGeometry();
  const windPositions = new Float32Array(windCount * 3);
  for (let i = 0; i < windCount * 3; i += 3) {
    windPositions[i] = 5.2 + Math.random() * 2;
    windPositions[i + 1] = 1.3 + Math.random() * 1.4;
    windPositions[i + 2] = -0.8 + Math.random() * 2.2;
  }
  windGeo.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));
  const windMat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.18,
    transparent: true,
    opacity: 0, // Activated when window opens
    blending: THREE.AdditiveBlending
  });
  windParticles = new THREE.Points(windGeo, windMat);
  scene.add(windParticles);

  // -------------------------------------------------------------
  // 4. Rain Precipitation System (Falls directly from Rain Clouds)
  // -------------------------------------------------------------
  const rainCount = 1400;
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount * 3; i += 3) {
    rainPositions[i] = -8.5 + Math.random() * 17.0;
    rainPositions[i + 1] = Math.random() * 13.0; // From cloud base (13) to ground (0)
    rainPositions[i + 2] = -7.5 + Math.random() * 15.0;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0x93c5fd,
    size: 0.16,
    transparent: true,
    opacity: 0
  });
  rainParticles = new THREE.Points(rainGeo, rainMat);
  scene.add(rainParticles);
}

// ============================================================================
// 12. WEB AUDIO SYNTHESIZER (Pure HTML5 Web Audio API - Zero External Files)
// ============================================================================
let audioCtx = null;
let fanOsc = null, fanGain = null;
let rainNoise = null, rainGain = null;

function initAudio() {
  if (state.soundInitialized) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    // Fan Hum Synth (Brown/Pink Noise + Low Oscillator)
    fanGain = audioCtx.createGain();
    fanGain.gain.setValueAtTime(0, audioCtx.currentTime);
    fanGain.connect(audioCtx.destination);

    fanOsc = audioCtx.createOscillator();
    fanOsc.type = 'triangle';
    fanOsc.frequency.setValueAtTime(55, audioCtx.currentTime);
    fanOsc.connect(fanGain);
    fanOsc.start();

    // Rain White Noise Synth
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter noise to sound like soothing rain
    const rainFilter = audioCtx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(900, audioCtx.currentTime);

    rainGain = audioCtx.createGain();
    rainGain.gain.setValueAtTime(0, audioCtx.currentTime);

    whiteNoise.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(audioCtx.destination);
    whiteNoise.start();

    state.soundInitialized = true;
    showToast('<i class="fa-solid fa-volume-high"></i> Audio Synthesizer Initialized');
  } catch (e) {
    console.warn('Web Audio not allowed without interaction yet.', e);
  }
}

function playClickSound() {
  if (!state.audioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.06);
    g.gain.setValueAtTime(0.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
  } catch (e) {}
}

function playSuccessChime() {
  if (!state.audioEnabled || !audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      g.gain.setValueAtTime(0.08, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  } catch (e) {}
}

function updateAudioLevels() {
  if (!audioCtx || !state.audioEnabled) {
    if (fanGain) fanGain.gain.setValueAtTime(0, audioCtx ? audioCtx.currentTime : 0);
    if (rainGain) rainGain.gain.setValueAtTime(0, audioCtx ? audioCtx.currentTime : 0);
    return;
  }
  const now = audioCtx.currentTime;
  // Fan Sound
  if (state.fanRunning) {
    fanGain.gain.setTargetAtTime(0.06 * (state.fanSpeed / 2.5), now, 0.1);
    fanOsc.frequency.setTargetAtTime(45 + state.fanSpeed * 20, now, 0.1);
  } else {
    fanGain.gain.setTargetAtTime(0, now, 0.1);
  }
  // Rain Sound
  if (state.isRaining) {
    rainGain.gain.setTargetAtTime(0.12, now, 0.2);
  } else {
    rainGain.gain.setTargetAtTime(0, now, 0.2);
  }
}

// ============================================================================
// 13. SENSOR AUTOMATION LOGIC & TELEMETRY CALCULATOR
// ============================================================================
function updateSensorLogicAndTelemetry() {
  // 1. Calculate Solar Irradiance & LDR Lux from Time of Day
  // Peak sunlight is around 12:00 - 13:00 (12.5)
  const sunAngle = ((state.timeOfDay - 6) / 16) * Math.PI; // 0 at 6 AM, PI at 10 PM
  const solarElevation = Math.max(0, Math.sin(sunAngle));

  // Irradiance in W/m² (0 to 1000)
  state.solarIrradiance = Math.round(solarElevation * 950 * (state.isRaining ? 0.35 : 1.0));

  // LDR Lux: If hand is covering LDR, drop to pitch dark (45 Lux)
  if (state.isLdrCovered) {
    state.ldrLux = 45;
  } else {
    state.ldrLux = Math.round(solarElevation * 1500 * (state.isRaining ? 0.4 : 1.0));
  }

  // 2. DYNAMIC SOLAR-THERMAL HEAT GAIN (Direct Sunlight -> Temperature Coupling):
  // Intense solar radiation delivers direct thermal energy through windows and building envelope.
  // Base morning/night temp = 20.5°C.
  // Peak midday sun adds up to +13.5°C (reaching ~34.0°C), triggering passive cooling!
  // Rainstorm provides natural evaporative cooling (-4.5°C).
  if (!state.manualTempOverride) {
    const solarThermalGain = solarElevation * 13.5 * (state.isRaining ? 0.4 : 1.0);
    const rainCooling = state.isRaining ? 4.5 : 0.0;
    state.ambientTemp = Math.round((20.5 + solarThermalGain - rainCooling) * 10) / 10;

    // Keep temperature slider in sync
    const sliderTemp = document.getElementById('slider-temp');
    if (sliderTemp) sliderTemp.value = state.ambientTemp;
  }

  // 3. SMART LIGHTING LOGIC (Unit 4 Syllabus):
  // Rule: Light ON if (Lux < 300) AND (Room is Occupied)
  const isDarkOutside = state.ldrLux < 300;
  const shouldLightBeOn = isDarkOutside && state.isRoomOccupied;

  state.roomLightOn = shouldLightBeOn;

  // 4. SMART TEMPERATURE & HVAC LOGIC (Unit 3 Syllabus):
  // Rule: If Temperature >= 28.0°C:
  // - Ceiling Fan turns ON to circulate air
  // - Servo Window on Right Wall opens (45°) for fresh cross-breeze intake
  // - Wall Exhaust Fan on OPPOSITE Left Wall activates to emit internal hot air outside!
  if (state.ambientTemp >= 28.0) {
    state.fanRunning = true;
    state.fanSpeed = Math.min(3.0, 1.0 + (state.ambientTemp - 28.0) * 0.25);
    state.targetWindowAngle = THREE.MathUtils.degToRad(45); // Open 45 degrees
    
    state.exhaustRunning = true;
    state.exhaustSpeed = Math.min(3.2, 1.2 + (state.ambientTemp - 28.0) * 0.3);
  } else {
    state.fanRunning = false;
    state.fanSpeed = 0;
    state.targetWindowAngle = 0; // Closed
    
    state.exhaustRunning = false;
    state.exhaustSpeed = 0;
  }

  // 5. ENERGY FLOW CALCULATOR (Unit 1 & 2 Syllabus - Net-Zero Equation):
  // Solar Gen = Panel Area (6 x 1.6m x 2.4m = 23m²) x Irradiance x 19% Efficiency
  state.solarGenerationWatts = Math.round((state.solarIrradiance / 1000) * 380);

  // Electrical Load: Base + Lighting + HVAC
  let totalLoad = state.baseLoadWatts;
  if (state.roomLightOn) totalLoad += state.lightLoadWatts;
  if (state.fanRunning) totalLoad += Math.round(state.fanLoadWatts * (state.fanSpeed / 1.5));
  if (state.exhaustRunning) totalLoad += Math.round(state.exhaustLoadWatts * (state.exhaustSpeed / 1.5));
  state.currentLoadWatts = totalLoad;

  // Net Energy Balance (Surplus or Deficit)
  state.netEnergyWatts = state.solarGenerationWatts - state.currentLoadWatts;

  // 6. Update Visual Actuators in 3D
  // LED Light Material & Dynamic Point Light
  if (roomPointLight) {
    roomPointLight.intensity = state.roomLightOn ? 1.8 : 0;
  }

  // Person Avatar Visibility
  if (personAvatar) {
    personAvatar.visible = state.isRoomOccupied;
  }

  // Rain Particles Opacity
  if (rainParticles) {
    rainParticles.material.opacity = state.isRaining ? 0.8 : 0;
  }

  // 7. Update In-Scene 3D Sensors, Cones & Holographic Badges
  // A. PIR Motion Sensor & Infrared Scanning Cone
  if (pirBadgeObj) {
    pirBadgeObj.update(
      'PIR MOTION SENSOR',
      state.isRoomOccupied ? 'DETECTED (OCCUPIED)' : 'NO MOTION (VACANT)',
      state.isRoomOccupied ? '#10b981' : '#64748b'
    );
  }
  if (pirBeamCone) {
    pirBeamCone.material.color.setHex(state.isRoomOccupied ? 0x10b981 : 0x64748b);
    pirBeamCone.material.opacity = state.isRoomOccupied ? 0.24 : 0.04;
  }
  if (pirLedLight) {
    pirLedLight.material.color.setHex(state.isRoomOccupied ? 0x10b981 : 0xef4444);
  }

  // B. DHT11 Temperature & Humidity Sensor
  if (dht11BadgeObj) {
    const isHot = state.ambientTemp >= 28.0;
    dht11BadgeObj.update(
      'DHT11 TEMP & HUMIDITY',
      `${state.ambientTemp.toFixed(1)}°C (${isHot ? 'OVERHEATING!' : 'COMFORT'})`,
      isHot ? '#f43f5e' : '#06b6d4'
    );
  }
  if (dht11AuraMesh) {
    dht11AuraMesh.material.color.setHex(state.ambientTemp >= 28.0 ? 0xf43f5e : 0x06b6d4);
    dht11AuraMesh.material.opacity = state.ambientTemp >= 28.0 ? 0.45 : 0.18;
  }
  if (dht11HeatWaves) {
    dht11HeatWaves.material.opacity = state.ambientTemp >= 28.0 ? 0.85 : 0;
  }

  // C. LDR Light Sensor & Hand Covering Simulation
  if (ldrBadgeObj) {
    if (state.isLdrCovered) {
      ldrBadgeObj.update('LDR LIGHT SENSOR', 'COVERED (45 Lux -> DARK)', '#a855f7');
    } else {
      ldrBadgeObj.update(
        'LDR LIGHT SENSOR',
        `${state.ldrLux} Lux (${state.ldrLux < 300 ? 'LOW LIGHT' : 'DAYLIGHT'})`,
        state.ldrLux < 300 ? '#f43f5e' : '#f59e0b'
      );
    }
  }
  if (ldrHandMesh) {
    ldrHandMesh.visible = state.isLdrCovered;
  }
  if (ldrSpotBeam) {
    ldrSpotBeam.visible = !state.isLdrCovered && (state.ldrLux >= 300);
  }

  // D. SG90 Servo Motor & Window
  if (servoBadgeObj) {
    const isOpen = state.ambientTemp >= 28.0;
    servoBadgeObj.update(
      'SG90 SERVO MOTOR',
      isOpen ? 'WINDOW OPEN (45°)' : 'WINDOW CLOSED (0°)',
      isOpen ? '#38bdf8' : '#64748b'
    );
  }

  // E. Smart LED Luminaire
  if (ledBadgeObj) {
    ledBadgeObj.update(
      'SMART LED FIXTURE',
      state.roomLightOn ? 'ACTIVE (40W - 100%)' : 'OFF (0W - SAVING)',
      state.roomLightOn ? '#facc15' : '#10b981'
    );
  }

  // F. Industrial Wall Exhaust Fan (Opposite Left Wall)
  if (exhaustBadgeObj) {
    const isExhaustActive = state.ambientTemp >= 28.0;
    exhaustBadgeObj.update(
      'SMART EXHAUST FAN',
      isExhaustActive ? 'EMITTING HOT AIR (280 CFM)' : 'IDLE (OFF - 0 CFM)',
      isExhaustActive ? '#f59e0b' : '#64748b'
    );
  }

  // 3D Badges Group Visibility
  if (sensorHudGroup) {
    sensorHudGroup.visible = state.sensorHudMode;
  }

  // Sun Position, Atmosphere & Volumetric Sunbeams
  updateSunAndAtmosphere(solarElevation);

  // Update UI Elements
  syncUIElements();

  // Audio adjustments
  updateAudioLevels();
}

// ============================================================================
// 14. DYNAMIC ATMOSPHERE, SUN ORBIT & VOLUMETRIC SUNBEAMS
// ============================================================================
function updateSunAndAtmosphere(solarElevation) {
  // Move Sun in sky arc
  const sunX = Math.cos(((state.timeOfDay - 6) / 16) * Math.PI) * 28;
  const sunY = Math.max(1.5, solarElevation * 32);
  const sunZ = 16 - solarElevation * 8;

  if (sunLight) {
    sunLight.position.set(sunX, sunY, sunZ);
    sunLight.intensity = Math.max(0.08, solarElevation * 1.5);

    // Color shift: Golden Sunrise/Sunset vs Cool Midday Blue
    if (state.timeOfDay < 8 || state.timeOfDay > 18) {
      sunLight.color.setHex(0xfba94c); // Sunset/Sunrise orange-gold
    } else {
      sunLight.color.setHex(0xfffbeb); // Pure midday white-gold
    }
  }

  // Re-orient Volumetric Sunbeams so they track the Sun in real time!
  if (sunbeamMeshes && sunbeamMeshes.length > 0 && sunLight) {
    const sunWorldPos = new THREE.Vector3();
    sunLight.getWorldPosition(sunWorldPos);

    sunbeamMeshes.forEach((beamItem) => {
      const beam = beamItem.mesh;
      const target = beamItem.target;
      const dir = new THREE.Vector3().subVectors(target, sunWorldPos);
      const distance = dir.length();

      beam.position.copy(sunWorldPos);

      // Orientation from (0, -1, 0) downward to target
      const normDir = dir.clone().normalize();
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), normDir);
      beam.scale.set(1, distance, 1);

      // Sunbeams soft & light during day, fade out at night
      const beamBaseOpacity = solarElevation > 0.05 ? Math.min(0.12, solarElevation * 0.14) : 0;
      beam.material.opacity = state.energyFlowMode ? beamBaseOpacity : 0;
    });
  }

  // Sky background & Fog interpolation (Realistic Day / Sunset / Night / Storm transition)
  if (scene) {
    if (state.isRaining) {
      // Stormy overcast sky when raining
      scene.background.setHex(0x334155); // Stormy slate grey-blue
      scene.fog.color.setHex(0x475569);
      if (ambientLight) ambientLight.intensity = 0.45;
    } else if (solarElevation < 0.1) {
      // Midnight Sky
      scene.background.setHex(0x0a1122);
      scene.fog.color.setHex(0x0a1122);
      if (ambientLight) ambientLight.intensity = 0.2;
    } else if (state.timeOfDay < 8 || state.timeOfDay > 18) {
      // Sunset Sky (Warm golden peach)
      scene.background.setHex(0xf97316);
      scene.fog.color.setHex(0xfdba74);
      if (ambientLight) ambientLight.intensity = 0.55;
    } else {
      // Clean Daytime Sky Blue!
      scene.background.setHex(0x38bdf8);
      scene.fog.color.setHex(0x7dd3fc);
      if (ambientLight) ambientLight.intensity = 0.75;
    }
  }
}

// ============================================================================
// 15. UI SYNCHRONIZATION & TELEMETRY HUD UPDATER
// ============================================================================
function syncUIElements() {
  // Solar Generation & Load
  document.getElementById('solar-gen-val').textContent = `${state.solarGenerationWatts} W`;
  document.getElementById('load-val').textContent = `${state.currentLoadWatts} W`;

  // Net-Zero Badge & Power Meter
  const netBadge = document.getElementById('net-status-badge');
  const netValEl = document.getElementById('net-balance-val');
  if (state.netEnergyWatts >= 0) {
    netBadge.textContent = 'NET SURPLUS';
    netBadge.className = 'status-tag surplus';
    netValEl.textContent = `+${state.netEnergyWatts}`;
    netValEl.className = 'net-value';
  } else {
    netBadge.textContent = 'GRID DEFICIT';
    netBadge.className = 'status-tag deficit';
    netValEl.textContent = `${state.netEnergyWatts}`;
    netValEl.className = 'net-value negative';
  }

  // Meter Bar
  const maxScale = Math.max(450, state.solarGenerationWatts + state.currentLoadWatts);
  document.getElementById('solar-meter-bar').style.width = `${Math.min(100, (state.solarGenerationWatts / maxScale) * 100)}%`;
  document.getElementById('load-meter-bar').style.width = `${Math.min(100, (state.currentLoadWatts / maxScale) * 100)}%`;

  // Telemetry items
  document.getElementById('solar-irradiance-val').textContent = `${state.solarIrradiance} W/m²`;
  document.getElementById('ldr-lux-val').textContent = `${state.ldrLux} Lux`;
  document.getElementById('ldr-status-sub').textContent = state.ldrLux < 300 ? 'Low Daylight (Dark)' : 'Daylight Sufficient';

  document.getElementById('pir-status-val').textContent = state.isRoomOccupied ? 'Occupied' : 'Vacant';
  document.getElementById('pir-sub-status').textContent = state.isRoomOccupied ? 'Person in Room 1' : 'No Presence Detected';
  document.getElementById('pir-sub-status').className = state.isRoomOccupied ? 'tele-sub text-emerald' : 'tele-sub text-dim';

  document.getElementById('dht-temp-val').textContent = `${state.ambientTemp.toFixed(1)} °C`;
  document.getElementById('dht-hum-val').textContent = `Humidity: ${state.relativeHumidity}% RH`;

  // Actuator chips
  const lightChip = document.getElementById('chip-light');
  document.getElementById('chip-light-state').textContent = state.roomLightOn ? 'ON' : 'OFF';
  lightChip.className = state.roomLightOn ? 'act-chip active' : 'act-chip';

  const fanChip = document.getElementById('chip-fan');
  document.getElementById('chip-fan-state').textContent = state.fanRunning ? `ON (${Math.round(state.fanSpeed * 90)} RPM)` : 'OFF';
  fanChip.className = state.fanRunning ? 'act-chip active' : 'act-chip';

  const exhaustChip = document.getElementById('chip-exhaust');
  if (exhaustChip) {
    document.getElementById('chip-exhaust-state').textContent = state.exhaustRunning ? `ON (${Math.round(state.exhaustSpeed * 120)} CFM)` : 'OFF';
    exhaustChip.className = state.exhaustRunning ? 'act-chip active' : 'act-chip';
  }

  const windowChip = document.getElementById('chip-window');
  document.getElementById('chip-window-state').textContent = state.ambientTemp >= 28.0 ? 'OPEN (45°)' : 'CLOSED';
  windowChip.className = state.ambientTemp >= 28.0 ? 'act-chip active' : 'act-chip';

  // Rainwater Reservoir
  document.getElementById('rain-harvest-val').textContent = `${Math.round(state.rainwaterLevelLitres)} / 100 L`;
  document.getElementById('reservoir-fill-bar').style.width = `${state.rainwaterLevelLitres}%`;

  // Slider Badges
  const hours = Math.floor(state.timeOfDay);
  const minutes = Math.floor((state.timeOfDay % 1) * 60);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const timeFormatted = `${displayHours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
  document.getElementById('time-badge').textContent = timeFormatted;
  document.getElementById('temp-badge').textContent = `${state.ambientTemp.toFixed(1)} °C`;

  // Dynamic Solar-Thermal Status Indicator
  const solarStatusEl = document.getElementById('solar-thermal-status');
  if (solarStatusEl) {
    const sunAngle = ((state.timeOfDay - 6) / 16) * Math.PI;
    const solarElevation = Math.max(0, Math.sin(sunAngle));
    const solarThermalGain = (solarElevation * 13.5 * (state.isRaining ? 0.4 : 1.0)).toFixed(1);

    if (state.manualTempOverride) {
      solarStatusEl.innerHTML = `<i class="fa-solid fa-hand text-cyan"></i> Manual Mode (${state.ambientTemp.toFixed(1)}°C) &bull; Drag Time to Auto-link`;
      solarStatusEl.style.color = 'var(--cyan-water)';
      solarStatusEl.style.borderColor = 'rgba(6, 182, 212, 0.3)';
    } else if (state.ambientTemp >= 28.0) {
      solarStatusEl.innerHTML = `<i class="fa-solid fa-fire text-rose"></i> Solar Gain (+${solarThermalGain}°C) &rarr; Fan &amp; Window ON!`;
      solarStatusEl.style.color = 'var(--rose-heat)';
      solarStatusEl.style.borderColor = 'rgba(244, 63, 94, 0.3)';
    } else {
      solarStatusEl.innerHTML = `<i class="fa-solid fa-sun text-amber"></i> Solar Gain: +${solarThermalGain}°C from Sunlight`;
      solarStatusEl.style.color = 'var(--amber-solar)';
      solarStatusEl.style.borderColor = 'rgba(245, 158, 11, 0.25)';
    }
  }

  // Fast Trigger Buttons Active State
  const coverLdrBtn = document.getElementById('btn-cover-ldr');
  if (coverLdrBtn) {
    coverLdrBtn.classList.toggle('active', state.isLdrCovered);
  }
}

// ============================================================================
// 16. THE 6 GUIDED WALKTHROUGH SCENES (Matching the WhatsApp image design)
// ============================================================================
const scenesData = {
  1: {
    tag: 'SCENE 1 OF 6',
    title: 'Building Introduction & Architectural Overview',
    narrative: 'Show your 2-floor green building, rooftop solar panels, lush passive cooling gardens and surrounding site. The open cutaway reveals ground floor living and first floor cantilever balcony.',
    bullets: [
      '<i class="fa-solid fa-check"></i> 2-Floor Cutaway Cross-Section',
      '<i class="fa-solid fa-check"></i> Integrated Renewable Energy',
      '<i class="fa-solid fa-check"></i> Passive Cooling Envelope'
    ],
    camPos: { x: 22, y: 16, z: 24 },
    target: { x: 0, y: 4, z: 0 },
    setup: () => {
      state.cutawayMode = true;
      state.strataExploded = false;
    }
  },
  2: {
    tag: 'SCENE 2 OF 6',
    title: 'Solar Energy & Renewable Flow',
    narrative: 'Animate sunlight hitting the 6 high-efficiency photovoltaic panels and clean electricity flowing through conduit wiring into the Lithium battery storage unit and distribution board.',
    bullets: [
      '<i class="fa-solid fa-sun"></i> 28° Optimal Solar Harvest Angle',
      '<i class="fa-solid fa-bolt"></i> Golden Energy Particle Flow',
      '<i class="fa-solid fa-battery-full"></i> Li-Ion Battery Energy Storage (ESS)'
    ],
    camPos: { x: 2, y: 14, z: 8 },
    target: { x: -1, y: 7, z: -1 },
    setup: () => {
      state.timeOfDay = 12.5; // High noon peak irradiance
      state.isRaining = false;
      document.getElementById('slider-time').value = 12.5;
    }
  },
  3: {
    tag: 'SCENE 3 OF 6',
    title: 'Smart Lighting Automation (LDR + PIR)',
    narrative: 'Show daylight detection and occupancy sensing: Room LEDs automatically stay OFF when daylight is sufficient or when the room is vacant. When darkness falls AND a person enters, lights snap ON automatically!',
    bullets: [
      '<i class="fa-solid fa-lightbulb"></i> LDR Daylight Harvesting',
      '<i class="fa-solid fa-person"></i> PIR Pyroelectric Motion Sensing',
      '<i class="fa-solid fa-shield-halved"></i> Prevents Electricity Wastage'
    ],
    camPos: { x: 4.5, y: 3.2, z: 6.5 },
    target: { x: 0.5, y: 2.2, z: -1.0 },
    setup: () => {
      // Simulate dark dusk + occupied
      state.timeOfDay = 20.0;
      state.isRoomOccupied = true;
      document.getElementById('slider-time').value = 20.0;
    }
  },
  4: {
    tag: 'SCENE 4 OF 6',
    title: 'Cross-Ventilation & Exhaust Fan (DHT11 + Window + Exhaust)',
    narrative: 'Show temperature increasing beyond 28°C: The DHT11 sensor detects excess heat, signaling the servo window on the right wall to open for cool cross-breeze, while the industrial exhaust fan on the opposite left wall activates to emit internal warm air outdoors!',
    bullets: [
      '<i class="fa-solid fa-temperature-arrow-up"></i> DHT11 Microclimate Heat Detection',
      '<i class="fa-solid fa-window-maximize"></i> Right Wall Servo Window (Cool Air Intake)',
      '<i class="fa-solid fa-wind"></i> Opposite Wall Exhaust Fan (Emits Internal Heat Out)',
      '<i class="fa-solid fa-fan"></i> Variable-Speed DC Ceiling Circulation Fan'
    ],
    camPos: { x: 6.8, y: 3.5, z: 2.5 },
    target: { x: 2.5, y: 2.4, z: 0.2 },
    setup: () => {
      // Trigger heat condition
      state.ambientTemp = 33.5;
      document.getElementById('slider-temp').value = 33.5;
    }
  },
  5: {
    tag: 'SCENE 5 OF 6',
    title: 'Green Roof & Passive Heat Reduction',
    narrative: 'Show how rooftop vegetation and engineered substrate insulate the building slab, absorbing solar radiation and slashing indoor cooling demand by 5°C to 8°C via evapotranspiration.',
    bullets: [
      '<i class="fa-solid fa-seedling"></i> Extensive Sedum & Turf Vegetation',
      '<i class="fa-solid fa-layer-group"></i> Thermal Barrier & Drainage Strata',
      '<i class="fa-solid fa-temperature-arrow-down"></i> Urban Heat Island Mitigation'
    ],
    camPos: { x: 8.5, y: 12.5, z: 6.5 },
    target: { x: 3.4, y: 7.2, z: 0.6 },
    setup: () => {
      state.strataExploded = true;
    }
  },
  6: {
    tag: 'SCENE 6 OF 6',
    title: 'Rainwater Catchment & Storage Filtration',
    narrative: 'Animate rainfall flowing along perimeter roof gutters, filtering through downspout tubes and filling the on-site ground reservoir for zero-cost garden irrigation and toilet flushing.',
    bullets: [
      '<i class="fa-solid fa-cloud-rain"></i> Perimeter Eaves Catchment',
      '<i class="fa-solid fa-filter"></i> First-Flush Sediment Filtration',
      '<i class="fa-solid fa-droplet"></i> 100L Storage Gauge & Water Recycling'
    ],
    camPos: { x: 12.5, y: 3.8, z: -3.0 },
    target: { x: 6.4, y: 1.5, z: -3.8 },
    setup: () => {
      state.isRaining = true;
      document.getElementById('check-rain').checked = true;
    }
  }
};

function goToScene(sceneNum) {
  playClickSound();

  if (sceneNum === 'sandbox') {
    state.currentScene = 'sandbox';
    document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.scene-btn.sandbox-pill').classList.add('active');

    document.getElementById('scene-tag').textContent = 'FREE SANDBOX';
    document.getElementById('scene-title').textContent = 'Interactive Playground & Live Teacher Testing';
    document.getElementById('scene-narrative').textContent = 'Full manual control enabled. Adjust the sun angle, toggle occupancy, trigger darkness or apply heat to test sensors live!';
    document.getElementById('scene-bullets').innerHTML = `
      <span class="bullet-tag"><i class="fa-solid fa-sliders"></i> All Controls Unlocked</span>
      <span class="bullet-tag"><i class="fa-solid fa-hand"></i> Cover LDR with Hand</span>
      <span class="bullet-tag"><i class="fa-solid fa-fire"></i> Heat Sensor Live</span>
    `;
    return;
  }

  sceneNum = parseInt(sceneNum);
  if (sceneNum < 1 || sceneNum > 6) return;
  state.currentScene = sceneNum;

  const data = scenesData[sceneNum];
  if (!data) return;

  // Run Scene Setup
  data.setup();

  // Update UI scene buttons
  document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.scene-btn[data-scene="${sceneNum}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // Update Bottom Narrative Deck
  document.getElementById('scene-tag').textContent = data.tag;
  document.getElementById('scene-title').textContent = data.title;
  document.getElementById('scene-narrative').textContent = data.narrative;
  document.getElementById('scene-bullets').innerHTML = data.bullets.map(b => `<span class="bullet-tag">${b}</span>`).join('');

  // Smooth Camera Glide
  tweenCamera(data.camPos, data.target, 1200);

  // Recalculate states
  updateSensorLogicAndTelemetry();

  // Net-zero milestone celebration
  if (sceneNum === 2) {
    triggerNetZeroCelebration();
  }
}

function tweenCamera(targetPos, targetLookAt, duration = 1000) {
  const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  const startTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
  const startTime = performance.now();

  function animateCam(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    // Smooth easeInOutCubic
    const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    camera.position.x = startPos.x + (targetPos.x - startPos.x) * ease;
    camera.position.y = startPos.y + (targetPos.y - startPos.y) * ease;
    camera.position.z = startPos.z + (targetPos.z - startPos.z) * ease;

    controls.target.x = startTarget.x + (targetLookAt.x - startTarget.x) * ease;
    controls.target.y = startTarget.y + (targetLookAt.y - startTarget.y) * ease;
    controls.target.z = startTarget.z + (targetLookAt.z - startTarget.z) * ease;

    if (progress < 1) {
      requestAnimationFrame(animateCam);
    }
  }
  requestAnimationFrame(animateCam);
}

function triggerNetZeroCelebration() {
  if (window.confetti) {
    window.confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#10b981', '#38bdf8', '#f59e0b']
    });
  }
  playSuccessChime();
}

// ============================================================================
// 17. EVENT LISTENERS & USER INTERACTION WIRING
// ============================================================================
function setupEventListeners() {
  // Top Scene Pills
  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sceneId = btn.getAttribute('data-scene');
      goToScene(sceneId);
    });
  });

  // Prev / Next Scene in Walkthrough Deck
  document.getElementById('btn-prev-scene').addEventListener('click', () => {
    let next = typeof state.currentScene === 'number' ? state.currentScene - 1 : 6;
    if (next < 1) next = 6;
    goToScene(next);
  });

  document.getElementById('btn-next-scene').addEventListener('click', () => {
    let next = typeof state.currentScene === 'number' ? state.currentScene + 1 : 1;
    if (next > 6) next = 1;
    goToScene(next);
  });

  // Auto-play Guided Tour
  const playBtn = document.getElementById('btn-play-tour');
  playBtn.addEventListener('click', () => {
    initAudio();
    playClickSound();
    state.isTourPlaying = !state.isTourPlaying;

    if (state.isTourPlaying) {
      document.getElementById('label-play-btn').textContent = 'Pause Tour';
      playBtn.classList.add('active');
      showToast('<i class="fa-solid fa-play"></i> Guided Walkthrough Started (10s per scene)');
      runTourCycle();
    } else {
      document.getElementById('label-play-btn').textContent = 'Play Walkthrough';
      playBtn.classList.remove('active');
      clearTimeout(state.tourTimer);
      showToast('<i class="fa-solid fa-pause"></i> Walkthrough Paused');
    }
  });

  function runTourCycle() {
    if (!state.isTourPlaying) return;
    let next = typeof state.currentScene === 'number' ? state.currentScene + 1 : 1;
    if (next > 6) next = 1;
    goToScene(next);
    state.tourTimer = setTimeout(runTourCycle, 9000);
  }

  // Fast Demonstration Triggers (For Teachers / Examiners)
  // 1. Cover LDR with Hand
  const btnCoverLdr = document.getElementById('btn-cover-ldr');
  btnCoverLdr.addEventListener('click', () => {
    initAudio();
    playClickSound();
    state.isLdrCovered = !state.isLdrCovered;
    btnCoverLdr.classList.toggle('active', state.isLdrCovered);
    updateSensorLogicAndTelemetry();

    if (state.isLdrCovered) {
      showToast('<i class="fa-solid fa-hand"></i> LDR Covered with Hand: Sensor reads 45 Lux (Darkness)!');
    } else {
      showToast('<i class="fa-solid fa-sun text-yellow"></i> Hand Removed: Daylight restored!');
    }
  });

  // 2. Toggle PIR Presence
  const btnTogglePir = document.getElementById('btn-toggle-pir');
  btnTogglePir.addEventListener('click', () => {
    initAudio();
    playClickSound();
    state.isRoomOccupied = !state.isRoomOccupied;
    btnTogglePir.classList.toggle('active', state.isRoomOccupied);
    updateSensorLogicAndTelemetry();

    if (state.isRoomOccupied) {
      showToast('<i class="fa-solid fa-person-walking text-blue"></i> Person entered room: PIR Motion Triggered!');
    } else {
      showToast('<i class="fa-solid fa-person text-dim"></i> Room Vacant: Person exited.');
    }
  });

  // 3. Heat DHT11 Sensor
  document.getElementById('btn-heat-sensor').addEventListener('click', () => {
    initAudio();
    playClickSound();
    state.manualTempOverride = true;
    state.ambientTemp = 34.0;
    document.getElementById('slider-temp').value = 34.0;
    updateSensorLogicAndTelemetry();
    showToast('<i class="fa-solid fa-fire text-rose"></i> Heated DHT11 Sensor (34.0°C)! Window Opens &amp; Opposite Wall Exhaust Fan Emits Hot Air!');
  });

  // 4. Cool Down to Ambient Comfort
  document.getElementById('btn-cool-sensor').addEventListener('click', () => {
    initAudio();
    playClickSound();
    state.manualTempOverride = true;
    state.ambientTemp = 24.0;
    document.getElementById('slider-temp').value = 24.0;
    updateSensorLogicAndTelemetry();
    showToast('<i class="fa-solid fa-snowflake text-cyan"></i> Temperature Set to 24.0°C: Window &amp; Exhaust Fan Reset.');
  });

  // Sliders: Time of Day (Automatically Drives Solar Heat Gain)
  const sliderTime = document.getElementById('slider-time');
  sliderTime.addEventListener('input', (e) => {
    state.manualTempOverride = false; // Re-link solar-thermal coupling
    state.timeOfDay = parseFloat(e.target.value);
    updateSensorLogicAndTelemetry();
  });

  const sliderTemp = document.getElementById('slider-temp');
  sliderTemp.addEventListener('input', (e) => {
    state.manualTempOverride = true; // User manually set temp
    state.ambientTemp = parseFloat(e.target.value);
    updateSensorLogicAndTelemetry();
  });

  // Rain Weather Toggle
  const checkRain = document.getElementById('check-rain');
  checkRain.addEventListener('change', (e) => {
    initAudio();
    playClickSound();
    state.isRaining = e.target.checked;
    updateSensorLogicAndTelemetry();
    showToast(state.isRaining ? '<i class="fa-solid fa-cloud-showers-heavy text-cyan"></i> Rainstorm Simulation Started' : 'Rain Stopped');
  });

  // Architectural 3D Inspection Toggles
  document.getElementById('btn-toggle-cutaway').addEventListener('click', function() {
    playClickSound();
    state.cutawayMode = !state.cutawayMode;
    this.classList.toggle('active', state.cutawayMode);
    showToast(state.cutawayMode ? 'Cutaway View Enabled' : 'Solid Facade View');
  });

  document.getElementById('btn-toggle-thermal').addEventListener('click', function() {
    playClickSound();
    state.thermalMode = !state.thermalMode;
    this.classList.toggle('active', state.thermalMode);
    groundMesh.material.color.setHex(state.thermalMode ? 0x0f766e : 0xffffff);
    showToast(state.thermalMode ? 'Thermal Heatmap Gradient Active' : 'Standard BIM Shading');
  });

  document.getElementById('btn-toggle-energy-flow').addEventListener('click', function() {
    playClickSound();
    state.energyFlowMode = !state.energyFlowMode;
    this.classList.toggle('active', state.energyFlowMode);
    if (photonParticles) photonParticles.visible = state.energyFlowMode;
    if (sunbeamGroup) sunbeamGroup.visible = state.energyFlowMode;
  });

  document.getElementById('btn-toggle-greenroof-layers').addEventListener('click', function() {
    playClickSound();
    state.strataExploded = !state.strataExploded;
    this.classList.toggle('active', state.strataExploded);
    showToast(state.strataExploded ? 'Exploded Green Roof Strata' : 'Compact Roof View');
  });

  // 3D In-Scene Sensor Badges HUD Toggle
  const btnSensorHud = document.getElementById('btn-toggle-sensor-hud');
  if (btnSensorHud) {
    btnSensorHud.addEventListener('click', function() {
      playClickSound();
      state.sensorHudMode = !state.sensorHudMode;
      this.classList.toggle('active', state.sensorHudMode);
      if (sensorHudGroup) sensorHudGroup.visible = state.sensorHudMode;
      showToast(state.sensorHudMode ? '<i class="fa-solid fa-cube text-emerald"></i> 3D Sensor Badges Enabled' : '3D Sensor Badges Hidden');
    });
  }

  // Camera Presets (Macro Architectural Perspectives)
  document.querySelectorAll('.cam-preset-btn[data-cam]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClickSound();
      document.querySelectorAll('.cam-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cam = btn.getAttribute('data-cam');
      if (cam === 'iso') tweenCamera({ x: 22, y: 16, z: 24 }, { x: 0, y: 4, z: 0 });
      else if (cam === 'roof') tweenCamera({ x: 3, y: 14, z: 8 }, { x: 0, y: 7, z: 0 });
      else if (cam === 'interior') tweenCamera({ x: 4.5, y: 3.2, z: 6.5 }, { x: 0.5, y: 2.2, z: -1.0 });
      else if (cam === 'window') tweenCamera({ x: 6.8, y: 3.5, z: 2.5 }, { x: 2.5, y: 2.4, z: 0.2 });
      else if (cam === 'tank') tweenCamera({ x: 12.5, y: 3.8, z: -3.0 }, { x: 6.4, y: 1.5, z: -3.8 });
    });
  });

  // Dedicated Live Sensor Zoom Camera Buttons
  document.querySelectorAll('[data-sensor-cam]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClickSound();
      document.querySelectorAll('.cam-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const targetSensor = btn.getAttribute('data-sensor-cam');
      if (targetSensor === 'pir') {
        tweenCamera({ x: -1.4, y: 2.8, z: -1.1 }, { x: -4.5, y: 3.2, z: -3.6 }, 1100);
        showToast('<i class="fa-solid fa-person-walking text-blue"></i> Focusing PIR Motion Sensor &amp; Detection FOV Cone');
      } else if (targetSensor === 'dht') {
        tweenCamera({ x: 0.6, y: 2.4, z: -1.6 }, { x: -2.0, y: 2.3, z: -3.75 }, 1100);
        showToast('<i class="fa-solid fa-temperature-half text-rose"></i> Focusing DHT11 Microclimate Temp Sensor');
      } else if (targetSensor === 'ldr') {
        tweenCamera({ x: 2.5, y: 1.8, z: 1.7 }, { x: 4.7, y: 1.25, z: 0.4 }, 1100);
        showToast('<i class="fa-solid fa-sun text-amber"></i> Focusing LDR Photocell Daylight Sensor');
      } else if (targetSensor === 'servo') {
        tweenCamera({ x: 2.2, y: 3.0, z: 2.6 }, { x: 4.85, y: 2.5, z: 0.4 }, 1100);
        showToast('<i class="fa-solid fa-window-maximize text-cyan"></i> Focusing Motorized Servo Window &amp; Fan');
      } else if (targetSensor === 'exhaust') {
        tweenCamera({ x: -7.6, y: 3.2, z: 0.6 }, { x: -4.85, y: 2.85, z: -1.2 }, 1100);
        showToast('<i class="fa-solid fa-wind text-cyan"></i> Focusing Opposite-Wall Exhaust Fan (Emitting Hot Air)');
      }
    });
  });

  // Top Nav Actions
  document.getElementById('btn-audio-toggle').addEventListener('click', function() {
    initAudio();
    state.audioEnabled = !state.audioEnabled;
    this.classList.toggle('active', state.audioEnabled);
    this.innerHTML = state.audioEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
    updateAudioLevels();
    showToast(state.audioEnabled ? 'Sound FX Enabled' : 'Sound FX Muted');
  });

  document.getElementById('btn-reset-cam').addEventListener('click', () => {
    playClickSound();
    tweenCamera({ x: 22, y: 16, z: 26 }, { x: 0, y: 4, z: 0 });
  });

  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    playClickSound();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Modal Controls
  const modal = document.getElementById('syllabus-modal');
  document.getElementById('btn-syllabus-modal').addEventListener('click', () => {
    playClickSound();
    modal.classList.add('open');
  });

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  document.getElementById('btn-close-modal-bottom').addEventListener('click', () => {
    modal.classList.remove('open');
  });

  // Modal Tabs
  document.querySelectorAll('.modal-tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      playClickSound();
      document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tabBtn.classList.add('active');
      const paneId = `pane-${tabBtn.getAttribute('data-tab')}`;
      const pane = document.getElementById(paneId);
      if (pane) pane.classList.add('active');
    });
  });

  // Right Panel Collapse Toggle
  const ctrlPanel = document.getElementById('control-panel');
  document.getElementById('btn-toggle-ctrls').addEventListener('click', () => {
    ctrlPanel.classList.toggle('collapsed');
  });
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================================
// 18. MAIN ANIMATION & RENDER LOOP
// ============================================================================
let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // 1. Ceiling Fan & Opposite Wall Exhaust Fan Blades Rotation
  if (ceilingFanBlades && state.fanRunning) {
    ceilingFanBlades.rotation.y += delta * state.fanSpeed * 9.0;
  }
  if (exhaustFanBlades && state.exhaustRunning) {
    exhaustFanBlades.rotation.x += delta * state.exhaustSpeed * 16.0; // Rotates to emit air through left wall
  }

  // 2. Servo Window Smooth Hinging (Opening & Closing)
  if (servoWindowSash) {
    servoWindowSash.rotation.y = THREE.MathUtils.lerp(servoWindowSash.rotation.y, state.targetWindowAngle, 0.08);
  }

  // 3. Wind Breeze Particles & Opposite Wall Exhaust Airflow Animation
  if (windParticles) {
    const isWindowOpen = servoWindowSash && servoWindowSash.rotation.y > 0.15;
    windParticles.material.opacity = THREE.MathUtils.lerp(
      windParticles.material.opacity,
      isWindowOpen ? 0.75 : 0,
      0.08
    );

    if (isWindowOpen) {
      const pos = windParticles.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] -= delta * 3.5; // Flow from right window towards room center
        pos[i + 1] += Math.sin(time * 3 + i) * 0.01;
        if (pos[i] < -2.0) {
          pos[i] = 5.2 + Math.random() * 1.5; // Loop back
        }
      }
      windParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Opposite Wall Exhaust Heat Evacuation (Emits internal room air outwards through left wall)
  if (exhaustParticles) {
    const isExhaustActive = state.exhaustRunning;
    exhaustParticles.material.opacity = THREE.MathUtils.lerp(
      exhaustParticles.material.opacity,
      isExhaustActive ? 0.85 : 0,
      0.08
    );
    if (isExhaustActive) {
      const epos = exhaustParticles.geometry.attributes.position.array;
      for (let i = 0; i < epos.length; i += 3) {
        epos[i] -= delta * 5.5; // Blast outwards through left wall (-X)
        epos[i + 1] += Math.sin(time * 5 + i) * 0.015;
        if (epos[i] < -8.2) {
          epos[i] = -4.6 + Math.random() * 0.3; // Reset at fan intake on wall
          epos[i + 1] = 2.85 + (Math.random() - 0.5) * 0.55;
          epos[i + 2] = -1.2 + (Math.random() - 0.5) * 0.55;
        }
      }
      exhaustParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // 4. Volumetric Sunbeams & Direct Streaming Photons Animation
  if (sunCoronaGroup) {
    sunCoronaGroup.rotation.z += delta * 0.12;
  }

  // Shimmering Volumetric Sunbeams (Soft, gentle god-rays)
  if (sunbeamMeshes && sunbeamMeshes.length > 0 && state.energyFlowMode) {
    const sunAngle = ((state.timeOfDay - 6) / 16) * Math.PI;
    const solarElevation = Math.max(0, Math.sin(sunAngle));
    if (solarElevation > 0.05) {
      sunbeamMeshes.forEach((beamItem, i) => {
        const shimmer = 0.08 + 0.04 * Math.sin(time * 2.2 + i * 0.6);
        beamItem.mesh.material.opacity = shimmer * Math.min(1.0, solarElevation * 1.2);
      });
    }
  }

  // Direct Streaming Photon Particles (Soft sparkling light dust)
  if (photonParticles && sunLight && state.energyFlowMode) {
    const sunWorldPos = new THREE.Vector3();
    sunLight.getWorldPosition(sunWorldPos);
    const sunAngle = ((state.timeOfDay - 6) / 16) * Math.PI;
    const solarElevation = Math.max(0, Math.sin(sunAngle));

    photonParticles.material.opacity = state.isRaining ? 0.15 : Math.min(0.65, solarElevation * 0.85);

    if (solarElevation > 0.05) {
      const posArray = photonParticles.geometry.attributes.position.array;
      for (let i = 0; i < photonData.length; i++) {
        const p = photonData[i];
        p.progress += delta * p.speed;
        if (p.progress >= 1.0) {
          p.progress -= 1.0;
        }

        const targetPos = sunTargetPoints[p.targetIdx];
        const curX = THREE.MathUtils.lerp(sunWorldPos.x, targetPos.x, p.progress) + p.spreadX * (1.0 - p.progress * 0.4);
        const curY = THREE.MathUtils.lerp(sunWorldPos.y, targetPos.y, p.progress);
        const curZ = THREE.MathUtils.lerp(sunWorldPos.z, targetPos.z, p.progress) + p.spreadZ * (1.0 - p.progress * 0.4);

        posArray[i * 3] = curX;
        posArray[i * 3 + 1] = curY;
        posArray[i * 3 + 2] = curZ;
      }
      photonParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // 5. Rain Clouds Animation & Rain Precipitation
  if (rainCloudGroup) {
    const targetScale = state.isRaining ? 1.0 : 0.001;
    rainCloudGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

    if (state.isRaining) {
      // Gentle floating / drifting of clouds
      rainCloudGroup.position.y = 13.5 + Math.sin(time * 1.4) * 0.22;
      rainCloudGroup.rotation.y = Math.sin(time * 0.25) * 0.03;
    }
  }

  if (rainParticles && state.isRaining) {
    const rpos = rainParticles.geometry.attributes.position.array;
    for (let i = 0; i < rpos.length; i += 3) {
      rpos[i + 1] -= delta * 24; // Fast falling rain from cloud base
      if (rpos[i + 1] < 0.2) {
        // Reset inside the rain cloud above building
        rpos[i + 1] = 13.0 + Math.random() * 1.2;
        rpos[i] = -8.5 + Math.random() * 17.0;
        rpos[i + 2] = -7.5 + Math.random() * 15.0;
      }
    }
    rainParticles.geometry.attributes.position.needsUpdate = true;

    // Increment tank water level slowly
    if (state.rainwaterLevelLitres < 100) {
      state.rainwaterLevelLitres += delta * 1.4;
      document.getElementById('rain-harvest-val').textContent = `${Math.round(state.rainwaterLevelLitres)} / 100 L`;
      document.getElementById('reservoir-fill-bar').style.width = `${state.rainwaterLevelLitres}%`;
    }
  }

  // 6. Rainwater Tank Dynamic Mesh Scale
  if (waterLevelMesh) {
    const targetHeight = (state.rainwaterLevelLitres / 100) * 1.9;
    waterLevelMesh.scale.y = THREE.MathUtils.lerp(waterLevelMesh.scale.y, Math.max(0.05, targetHeight), 0.05);
    waterLevelMesh.position.y = (waterLevelMesh.scale.y / 2) + 0.1;
  }

  // 7. Green Roof Strata Vertical Separation (Exploded View Animation)
  if (strataGroup) {
    const targetSeparation = state.strataExploded ? 1.6 : 0;
    strataGroup.children.forEach((child, idx) => {
      const layerOffset = (idx * 0.28) * targetSeparation;
      child.position.y = THREE.MathUtils.lerp(child.position.y, 7.2 + layerOffset, 0.08);
    });
  }

  // 8. In-Scene 3D Sensors Live Operational Animations
  // A. PIR Motion Infrared Scanning Radar Cone
  if (pirBeamCone) {
    if (state.isRoomOccupied) {
      pirBeamCone.material.opacity = 0.20 + 0.08 * Math.sin(time * 5.0);
    } else {
      pirBeamCone.material.opacity = 0.04 + 0.02 * Math.sin(time * 1.5);
    }
  }

  // B. DHT11 Thermal Heat Shimmer & Pulsing Warning Aura
  if (dht11AuraMesh) {
    if (state.ambientTemp >= 28.0) {
      const auraScale = 1.0 + 0.14 * Math.sin(time * 4.0);
      dht11AuraMesh.scale.set(auraScale, auraScale, auraScale);
    } else {
      dht11AuraMesh.scale.set(1.0, 1.0, 1.0);
    }
  }

  if (dht11HeatWaves && state.ambientTemp >= 28.0) {
    const hpos = dht11HeatWaves.geometry.attributes.position.array;
    for (let i = 1; i < hpos.length; i += 3) {
      hpos[i] += delta * 0.55; // Waft upwards like heat shimmer
      if (hpos[i] > 3.3) {
        hpos[i] = 2.3 + Math.random() * 0.2; // Return to DHT11 body
      }
    }
    dht11HeatWaves.geometry.attributes.position.needsUpdate = true;
  }

  // C. LDR Hand Placement Smooth Dynamic Hiding/Showing
  if (ldrHandMesh) {
    if (state.isLdrCovered) {
      ldrHandMesh.visible = true;
      ldrHandMesh.position.y = THREE.MathUtils.lerp(ldrHandMesh.position.y, 1.34, 0.12);
    } else {
      ldrHandMesh.position.y = THREE.MathUtils.lerp(ldrHandMesh.position.y, 1.85, 0.12);
      if (ldrHandMesh.position.y > 1.78) {
        ldrHandMesh.visible = false;
      }
    }
  }

  // Controls update
  controls.update();

  // Render Scene
  renderer.render(scene, camera);
}

// ============================================================================
// 19. BOOTSTRAP APPLICATION
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  init3D();
  setupEventListeners();
  animate();
  goToScene(1);
});


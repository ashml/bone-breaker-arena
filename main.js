const {
  Engine,
  Render,
  Runner,
  Bodies,
  Body,
  Composite,
  Constraint,
  Events,
  World,
} = Matter;

const PART_MULTIPLIER = {
  head: 2,
  torso: 1.2,
  upperArm: 0.8,
  lowerArm: 0.8,
  upperLeg: 0.8,
  lowerLeg: 0.8,
};

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const STILLNESS_FRAMES_TO_END = 160;

const ui = {
  faceAInput: document.getElementById('faceAInput'),
  faceBInput: document.getElementById('faceBInput'),
  faceAPreview: document.getElementById('faceAPreview'),
  faceBPreview: document.getElementById('faceBPreview'),
  seedInput: document.getElementById('seedInput'),
  startButton: document.getElementById('startButton'),
  rerunButton: document.getElementById('rerunButton'),
  status: document.getElementById('status'),
  scoreA: document.getElementById('scoreA'),
  scoreB: document.getElementById('scoreB'),
  maxImpact: document.getElementById('maxImpact'),
  resultATotal: document.getElementById('resultATotal'),
  resultAImpacts: document.getElementById('resultAImpacts'),
  resultBTotal: document.getElementById('resultBTotal'),
  resultBImpacts: document.getElementById('resultBImpacts'),
  winner: document.getElementById('winner'),
};

const engine = Engine.create();
engine.gravity.y = 1;

const render = Render.create({
  canvas: document.getElementById('worldCanvas'),
  engine,
  options: {
    width: 960,
    height: 540,
    wireframes: false,
    background: 'transparent',
  },
});
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

const faceTextures = { A: null, B: null };
let inProgress = false;

const baseMatch = {
  dynamicLayout: [],
  impulseA: 0,
  impulseB: 0,
  poseNoiseA: 0,
  poseNoiseB: 0,
};

function hashSeed(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setStatus(text) {
  ui.status.textContent = text;
}

function drawCircularPreview(image, canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 1, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const side = Math.min(image.width, image.height);
  const sx = (image.width - side) / 2;
  const sy = (image.height - side) / 2;
  ctx.drawImage(image, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function loadFace(inputEl, previewCanvas, key) {
  inputEl.addEventListener('change', () => {
    const [file] = inputEl.files;
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setStatus(`${key} face too large (max 2MB).`);
      inputEl.value = '';
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      drawCircularPreview(image, previewCanvas);
      faceTextures[key] = previewCanvas.toDataURL('image/png');
      URL.revokeObjectURL(url);
      setStatus(`Loaded face ${key}.`);
    };
    image.src = url;
  });
}

function clearWorld() {
  Composite.clear(engine.world, false, true);
}

function buildStaircase(world) {
  const stairs = [];
  const stepWidth = 140;
  const stepHeight = 34;
  for (let i = 0; i < 14; i += 1) {
    const step = Bodies.rectangle(100 + i * stepWidth, 480 - i * stepHeight, stepWidth, 26, {
      isStatic: true,
      friction: 0.9,
      render: { fillStyle: '#334155' },
    });
    stairs.push(step);
  }
  World.add(world, stairs);

  const floor = Bodies.rectangle(1300, 575, 3000, 60, {
    isStatic: true,
    render: { fillStyle: '#1e293b' },
  });
  World.add(world, floor);
}

function generateLayout(seedText) {
  const rand = mulberry32(hashSeed(seedText));
  const obstacles = [];
  for (let i = 0; i < 8; i += 1) {
    const x = 300 + i * 160 + Math.floor(rand() * 60);
    const y = 350 - i * 22 + Math.floor(rand() * 18);
    const roll = rand();
    if (roll > 0.5) {
      obstacles.push({ type: 'box', x, y, s: 30 + rand() * 25 });
    } else {
      obstacles.push({ type: 'ball', x, y, s: 14 + rand() * 10 });
    }
  }

  baseMatch.dynamicLayout = obstacles;
  baseMatch.poseNoiseA = (rand() - 0.5) * 0.18;
  baseMatch.poseNoiseB = (rand() - 0.5) * 0.18;
  baseMatch.impulseA = 0.034 + rand() * 0.006;
  baseMatch.impulseB = 0.034 + rand() * 0.006;
}

function addObstacles(world) {
  const bodies = baseMatch.dynamicLayout.map((o) => {
    if (o.type === 'box') {
      return Bodies.rectangle(o.x, o.y, o.s, o.s, {
        restitution: 0.2,
        friction: 0.7,
        density: 0.002,
        render: { fillStyle: '#f97316' },
      });
    }
    return Bodies.circle(o.x, o.y, o.s, {
      restitution: 0.4,
      friction: 0.5,
      density: 0.001,
      render: { fillStyle: '#facc15' },
    });
  });
  World.add(world, bodies);
}

function ragdoll(x, y, faceTexture, poseNoise) {
  const common = { friction: 0.9, frictionAir: 0.006, restitution: 0.1 };

  const torso = Bodies.rectangle(x, y, 26, 60, {
    ...common,
    label: 'torso',
    render: { fillStyle: '#22d3ee' },
  });
  const head = Bodies.circle(x, y - 52, 16, {
    ...common,
    label: 'head',
    render: faceTexture
      ? { sprite: { texture: faceTexture, xScale: 0.45, yScale: 0.45 } }
      : { fillStyle: '#e2e8f0' },
  });

  const upperArmL = Bodies.rectangle(x - 22, y - 12, 14, 32, { ...common, label: 'upperArm' });
  const lowerArmL = Bodies.rectangle(x - 24, y + 16, 12, 28, { ...common, label: 'lowerArm' });
  const upperArmR = Bodies.rectangle(x + 22, y - 12, 14, 32, { ...common, label: 'upperArm' });
  const lowerArmR = Bodies.rectangle(x + 24, y + 16, 12, 28, { ...common, label: 'lowerArm' });
  const upperLegL = Bodies.rectangle(x - 9, y + 44, 14, 34, { ...common, label: 'upperLeg' });
  const lowerLegL = Bodies.rectangle(x - 10, y + 75, 12, 34, { ...common, label: 'lowerLeg' });
  const upperLegR = Bodies.rectangle(x + 9, y + 44, 14, 34, { ...common, label: 'upperLeg' });
  const lowerLegR = Bodies.rectangle(x + 10, y + 75, 12, 34, { ...common, label: 'lowerLeg' });

  const links = [
    Constraint.create({ bodyA: head, bodyB: torso, pointA: { x: 0, y: 14 }, pointB: { x: 0, y: -32 }, stiffness: 0.8 }),
    Constraint.create({ bodyA: torso, bodyB: upperArmL, pointA: { x: -14, y: -20 }, pointB: { x: 0, y: -14 }, stiffness: 0.7 }),
    Constraint.create({ bodyA: upperArmL, bodyB: lowerArmL, pointA: { x: 0, y: 14 }, pointB: { x: 0, y: -13 }, stiffness: 0.7 }),
    Constraint.create({ bodyA: torso, bodyB: upperArmR, pointA: { x: 14, y: -20 }, pointB: { x: 0, y: -14 }, stiffness: 0.7 }),
    Constraint.create({ bodyA: upperArmR, bodyB: lowerArmR, pointA: { x: 0, y: 14 }, pointB: { x: 0, y: -13 }, stiffness: 0.7 }),
    Constraint.create({ bodyA: torso, bodyB: upperLegL, pointA: { x: -8, y: 30 }, pointB: { x: 0, y: -16 }, stiffness: 0.8 }),
    Constraint.create({ bodyA: upperLegL, bodyB: lowerLegL, pointA: { x: 0, y: 16 }, pointB: { x: 0, y: -16 }, stiffness: 0.8 }),
    Constraint.create({ bodyA: torso, bodyB: upperLegR, pointA: { x: 8, y: 30 }, pointB: { x: 0, y: -16 }, stiffness: 0.8 }),
    Constraint.create({ bodyA: upperLegR, bodyB: lowerLegR, pointA: { x: 0, y: 16 }, pointB: { x: 0, y: -16 }, stiffness: 0.8 }),
  ];

  const parts = [torso, head, upperArmL, lowerArmL, upperArmR, lowerArmR, upperLegL, lowerLegL, upperLegR, lowerLegR];
  Body.setAngle(torso, -0.45 + poseNoise);
  Body.setAngle(upperLegL, 0.65 + poseNoise * 0.5);
  Body.setAngle(upperLegR, 0.65 + poseNoise * 0.5);

  return { parts, links, torso };
}

function speedMagnitude(body) {
  return Math.hypot(body.velocity.x, body.velocity.y) + Math.abs(body.angularVelocity * 8);
}

function setupImpactTracking(runResult, watchedBodies) {
  return (event) => {
    event.pairs.forEach((pair) => {
      const body = watchedBodies.find((candidate) => candidate === pair.bodyA || candidate === pair.bodyB);
      if (!body || pair.isSensor) return;

      const impact = pair.collision.depth * 100 + speedMagnitude(body) * 0.6;
      const partMultiplier = PART_MULTIPLIER[body.label] ?? 1;
      const damage = impact * partMultiplier;

      runResult.totalDamage += damage;
      runResult.impacts += 1;
      runResult.maxImpact = Math.max(runResult.maxImpact, damage);
      ui.maxImpact.textContent = runResult.maxImpact.toFixed(1);
    });
  };
}

function worldSettled(parts) {
  return parts.every((p) => speedMagnitude(p) < 0.12);
}

async function runSingleCharacterRun(name, faceTexture, impulse, poseNoise) {
  clearWorld();
  engine.world.gravity.y = 1;
  buildStaircase(engine.world);
  addObstacles(engine.world);

  const doll = ragdoll(80, 90, faceTexture, poseNoise);
  World.add(engine.world, [...doll.parts, ...doll.links]);
  Body.applyForce(doll.torso, doll.torso.position, { x: impulse, y: 0.003 });

  const runResult = { name, totalDamage: 0, impacts: 0, maxImpact: 0 };
  const impactHandler = setupImpactTracking(runResult, doll.parts);
  Events.on(engine, 'collisionStart', impactHandler);

  let stillFrames = 0;
  return new Promise((resolve) => {
    const poll = setInterval(() => {
      if (worldSettled(doll.parts)) {
        stillFrames += 1;
      } else {
        stillFrames = 0;
      }

      if (stillFrames > STILLNESS_FRAMES_TO_END) {
        clearInterval(poll);
        Events.off(engine, 'collisionStart', impactHandler);
        resolve(runResult);
      }
    }, 16);
  });
}

function updateResults(a, b) {
  ui.resultATotal.textContent = a.totalDamage.toFixed(1);
  ui.resultAImpacts.textContent = String(a.impacts);
  ui.resultBTotal.textContent = b.totalDamage.toFixed(1);
  ui.resultBImpacts.textContent = String(b.impacts);
  ui.scoreA.textContent = a.totalDamage.toFixed(1);
  ui.scoreB.textContent = b.totalDamage.toFixed(1);

  if (a.totalDamage > b.totalDamage) {
    ui.winner.textContent = `Winner: Character A by ${(a.totalDamage - b.totalDamage).toFixed(1)} damage.`;
  } else if (b.totalDamage > a.totalDamage) {
    ui.winner.textContent = `Winner: Character B by ${(b.totalDamage - a.totalDamage).toFixed(1)} damage.`;
  } else {
    ui.winner.textContent = 'Tie game!';
  }
}

async function startMatch() {
  if (inProgress) return;
  inProgress = true;
  ui.startButton.disabled = true;
  ui.rerunButton.disabled = true;

  const seed = ui.seedInput.value.trim() || 'ARENA-01';
  generateLayout(seed);

  setStatus(`Running A (impulse ${baseMatch.impulseA.toFixed(4)})...`);
  const a = await runSingleCharacterRun('A', faceTextures.A, baseMatch.impulseA, baseMatch.poseNoiseA);

  setStatus(`Running B (impulse ${baseMatch.impulseB.toFixed(4)})...`);
  const b = await runSingleCharacterRun('B', faceTextures.B, baseMatch.impulseB, baseMatch.poseNoiseB);

  updateResults(a, b);
  setStatus('Done. Deterministic environment reused for both runs.');
  inProgress = false;
  ui.startButton.disabled = false;
  ui.rerunButton.disabled = false;
}

loadFace(ui.faceAInput, ui.faceAPreview, 'A');
loadFace(ui.faceBInput, ui.faceBPreview, 'B');
ui.startButton.addEventListener('click', startMatch);
ui.rerunButton.addEventListener('click', startMatch);

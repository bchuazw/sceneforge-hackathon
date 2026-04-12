import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id || !id.match(/^scene-\d+$/)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scene ID' },
        { status: 400 }
      );
    }
    
    const scenePath = path.join(process.cwd(), 'data/scenes', `${id}.json`);
    
    let sceneData;
    try {
      const content = await readFile(scenePath, 'utf-8');
      sceneData = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Scene not found' },
        { status: 404 }
      );
    }
    
    // Generate standalone HTML
    const html = generateStandaloneHTML(sceneData);
    
    // Return as downloadable file
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${sceneData.sceneData?.scene_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'scene'}_${id}.html"`,
      },
    });
    
  } catch (error) {
    console.error('Export scene error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

function generateStandaloneHTML(scene: any): string {
  const sceneData = scene.sceneData;
  const audioFiles = scene.audioFiles || [];
  const musicFile = audioFiles.find((a: any) => a.type === 'music');
  
  const title = escapeHTML(sceneData.scene_name);
  const theme = escapeHTML(sceneData.theme);
  const mood = escapeHTML(sceneData.mood);
  const prompt = escapeHTML(scene.prompt);
  const objectCount = sceneData.objects?.length || 0;
  const initialTimeButton = sceneData.time === 'night' ? '☀️ Switch to Day' : '🌙 Switch to Night';
  
  const sceneDataJson = JSON.stringify(sceneData);
  const audioFilesJson = JSON.stringify(audioFiles);
  
  const musicCode = musicFile 
    ? `
    const music = new Audio('${musicFile.url}');
    music.loop = true;
    music.volume = 0.5;
    document.addEventListener('click', () => {
      if (music.paused) music.play().catch(() => {});
    }, { once: true });
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - SceneForge AI</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; background: #000; font-family: system-ui, -apple-system, sans-serif; }
    #canvas-container { width: 100vw; height: 100vh; }
    #ui {
      position: absolute;
      top: 16px;
      left: 16px;
      color: white;
      font-family: monospace;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      padding: 16px;
      border-radius: 8px;
      pointer-events: auto;
      max-width: 300px;
    }
    #ui h1 { font-size: 18px; color: #c084fc; margin-bottom: 4px; }
    #ui .subtitle { font-size: 14px; color: #cbd5e1; margin-bottom: 4px; }
    #ui .prompt { font-size: 12px; color: #94a3b8; margin-bottom: 12px; line-height: 1.4; }
    #ui .controls { font-size: 11px; color: #94a3b8; margin-bottom: 12px; }
    #ui button {
      width: 100%;
      padding: 6px 12px;
      margin-top: 8px;
      background: #334155;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      transition: background 0.2s;
    }
    #ui button:hover { background: #475569; }
    #ui button.daynight { background: #7c3aed; }
    #ui button.daynight:hover { background: #6d28d9; }
    #instructions {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      background: rgba(0,0,0,0.7);
      opacity: 1;
      transition: opacity 0.3s;
    }
    #instructions.hidden { opacity: 0; pointer-events: none; }
    #instructions-content {
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 24px 32px;
      border-radius: 8px;
      text-align: center;
    }
    #instructions-content h2 { font-size: 20px; margin-bottom: 8px; }
    #instructions-content p { color: #94a3b8; font-size: 14px; }
    #object-counter {
      position: absolute;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.5);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  
  <div id="ui">
    <h1>${title}</h1>
    <div class="subtitle">${theme} • ${mood}</div>
    <div class="prompt">${prompt}</div>
    <div class="controls">
      <div>WASD / Arrows to move</div>
      <div>Mouse to look (click to lock)</div>
      <div>Space to jump</div>
      <div>Click objects to interact</div>
    </div>
    <button class="daynight" id="daynight-btn">${initialTimeButton}</button>
    <button id="camera-btn">📷 Toggle Camera Mode</button>
  </div>
  
  <div id="instructions">
    <div id="instructions-content">
      <h2>Click to Play</h2>
      <p>WASD to move • Mouse to look</p>
    </div>
  </div>
  
  <div id="object-counter">${objectCount} objects • Click objects to interact</div>

  <script>
    // Scene Data
    const sceneData = ${sceneDataJson};
    const audioFiles = ${audioFilesJson};
    
    // Game State
    let isDayTime = sceneData.time !== 'night';
    let cameraMode = 'follow';
    let mouseLocked = false;
    
    // Three.js Setup
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Object Colors
    const objectColors = {
      tree: 0x2d5a27,
      rock: 0x808080,
      building: 0x8B4513,
      vehicle: 0x6366f1,
      character: 0xf59e0b,
      prop: 0xa855f7,
      default: 0x6366f1,
    };
    
    // Lighting
    let ambientLight, dirLight, nightLight;
    
    function setupLighting() {
      scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));
      
      ambientLight = new THREE.AmbientLight(0xffffff, isDayTime ? 0.6 : 0.2);
      scene.add(ambientLight);
      
      dirLight = new THREE.DirectionalLight(
        isDayTime ? 0xffffff : 0x4444ff,
        isDayTime ? 1 : 0.3
      );
      dirLight.position.set(
        isDayTime ? 10 : -10,
        isDayTime ? 20 : 10,
        isDayTime ? 10 : -10
      );
      dirLight.castShadow = true;
      scene.add(dirLight);
      
      if (!isDayTime) {
        nightLight = new THREE.PointLight(0xffaa44, 0.5, 50);
        nightLight.position.set(0, 10, 0);
        scene.add(nightLight);
      }
      
      scene.background = new THREE.Color(isDayTime ? (sceneData.lighting?.color || '#87CEEB') : '#0a0a1a');
      scene.fog = new THREE.Fog(scene.background, 20, 100);
    }
    
    setupLighting();
    
    // Ground
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: isDayTime ? 0x3a5a3a : 0x1a1a2a 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Grid Helper
    const gridHelper = new THREE.GridHelper(200, 50, isDayTime ? 0x444444 : 0x222244, isDayTime ? 0x333333 : 0x1a1a2a);
    gridHelper.position.y = -0.9;
    scene.add(gridHelper);
    
    // Interactive Objects
    const objects = [];
    const musicFile = audioFiles.find(a => a.type === 'music');
    const sfxFiles = audioFiles.filter(a => a.type === 'sfx');
    
    function getGeometry(type) {
      switch (type) {
        case 'tree': return new THREE.ConeGeometry(0.5, 2, 8);
        case 'rock': return new THREE.DodecahedronGeometry(0.5);
        case 'building': return new THREE.BoxGeometry(1, 1.5, 1);
        case 'vehicle': return new THREE.BoxGeometry(0.8, 0.5, 1.2);
        case 'character': return new THREE.CapsuleGeometry(0.3, 1, 4, 8);
        default: return new THREE.BoxGeometry(1, 1, 1);
      }
    }
    
    sceneData.objects?.forEach((objData, index) => {
      const geometry = getGeometry(objData.type);
      const material = new THREE.MeshStandardMaterial({ 
        color: objectColors[objData.type] || objectColors.default 
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...objData.position);
      mesh.scale.setScalar(objData.scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { index, type: objData.type, originalScale: objData.scale };
      scene.add(mesh);
      objects.push(mesh);
    });
    
    // Player
    const playerGeo = new THREE.BoxGeometry(1, 1, 1);
    const playerMat = new THREE.MeshStandardMaterial({ 
      color: 0x6366f1,
      emissive: 0x4338ca,
      emissiveIntensity: 0.3
    });
    const player = new THREE.Mesh(playerGeo, playerMat);
    player.position.set(0, 0.5, 0);
    player.castShadow = true;
    scene.add(player);
    
    // Input Handling
    const keys = new Set();
    let velocity = new THREE.Vector3();
    let isJumping = false;
    let rotation = { x: 0, y: 0 };
    
    window.addEventListener('keydown', (e) => {
      keys.add(e.key.toLowerCase());
      if (e.code === 'Space' && !isJumping) {
        isJumping = true;
        velocity.y = 0.3;
      }
    });
    
    window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
    
    window.addEventListener('mousemove', (e) => {
      if (!mouseLocked) return;
      rotation.x -= e.movementY * 0.002;
      rotation.y -= e.movementX * 0.002;
      rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotation.x));
    });
    
    container.addEventListener('click', () => {
      if (!mouseLocked) {
        container.requestPointerLock();
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      mouseLocked = document.pointerLockElement === container;
      document.getElementById('instructions').classList.toggle('hidden', mouseLocked);
    });
    
    // Raycaster for object interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    container.addEventListener('click', (e) => {
      if (!mouseLocked) return;
      
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(objects);
      
      if (intersects.length > 0) {
        const obj = intersects[0].object;
        animateObject(obj);
        playSfx(obj.userData.index);
      }
    });
    
    function animateObject(mesh) {
      const originalScale = mesh.userData.originalScale;
      mesh.scale.setScalar(originalScale * 1.3);
      mesh.material.emissive.setHex(0xffffff);
      mesh.material.emissiveIntensity = 0.5;
      
      setTimeout(() => {
        mesh.scale.setScalar(originalScale);
        mesh.material.emissive.setHex(0x000000);
        mesh.material.emissiveIntensity = 0;
      }, 200);
    }
    
    function playSfx(index) {
      if (sfxFiles.length > 0) {
        const sfx = sfxFiles[index % sfxFiles.length];
        if (sfx?.url) {
          const audio = new Audio(sfx.url);
          audio.volume = 0.5;
          audio.play().catch(() => {});
        }
      }
    }
    
    // Camera Orbit
    let orbitAngle = 0;
    
    // Game Loop
    function animate() {
      requestAnimationFrame(animate);
      
      const speed = 0.15;
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0), rotation.y
      );
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
        new THREE.Vector3(0, 1, 0), rotation.y
      );
      
      const direction = new THREE.Vector3();
      if (keys.has('w') || keys.has('arrowup')) direction.add(forward);
      if (keys.has('s') || keys.has('arrowdown')) direction.sub(forward);
      if (keys.has('a') || keys.has('arrowleft')) direction.sub(right);
      if (keys.has('d') || keys.has('arrowright')) direction.add(right);
      
      direction.normalize().multiplyScalar(speed);
      
      if (player.position.y > 0 || velocity.y > 0) {
        velocity.y -= 0.015;
      } else {
        velocity.y = 0;
        isJumping = false;
        player.position.y = 0;
      }
      
      player.position.x += direction.x;
      player.position.z += direction.z;
      player.position.y += velocity.y;
      player.position.y = Math.max(0, player.position.y);
      
      if (cameraMode === 'follow') {
        const offset = new THREE.Vector3(0, 5, 10);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.y);
        camera.position.copy(player.position).add(offset);
        camera.lookAt(player.position);
      } else {
        orbitAngle += 0.005;
        const radius = 15;
        camera.position.x = Math.sin(orbitAngle) * radius;
        camera.position.z = Math.cos(orbitAngle) * radius;
        camera.position.y = 5;
        camera.lookAt(0, 0, 0);
      }
      
      renderer.render(scene, camera);
    }
    
    animate();
    
    // Resize Handler
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Day/Night Toggle
    document.getElementById('daynight-btn').addEventListener('click', () => {
      isDayTime = !isDayTime;
      document.getElementById('daynight-btn').textContent = isDayTime ? '🌙 Switch to Night' : '☀️ Switch to Day';
      setupLighting();
      groundMat.color.setHex(isDayTime ? 0x3a5a3a : 0x1a1a2a);
      gridHelper.material.color.setHex(isDayTime ? 0x444444 : 0x222244);
    });
    
    // Camera Toggle
    document.getElementById('camera-btn').addEventListener('click', () => {
      cameraMode = cameraMode === 'follow' ? 'orbit' : 'follow';
      document.getElementById('camera-btn').textContent = cameraMode === 'follow' ? '📷 Toggle Camera Mode' : '🎮 Toggle Camera Mode';
    });
    
    // Background Music
    ${musicCode}
  </script>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

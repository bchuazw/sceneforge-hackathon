'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';

interface GameRendererProps {
  sceneData: {
    scene_name: string;
    theme: string;
    mood: string;
    time: string;
    objects: Array<{
      type: string;
      position: [number, number, number];
      scale: number;
      properties?: Record<string, any>;
    }>;
    lighting: {
      type: string;
      intensity: number;
      color: string;
    };
    audio_zones?: Array<{
      type: string;
      sound: string;
      position?: [number, number, number];
      volume: number;
    }>;
    gameplay?: {
      type: string;
      camera: string;
    };
  };
  audioFiles?: Array<{
    type: string;
    name: string;
    url: string;
  }>;
  skyboxUrl?: string;
}

// Color palette for different object types
const objectColors: Record<string, string> = {
  tree: '#2d5a27',
  rock: '#808080',
  building: '#8B4513',
  vehicle: '#6366f1',
  character: '#f59e0b',
  prop: '#a855f7',
  default: '#6366f1',
};

export default function GameRenderer({ sceneData, audioFiles, skyboxUrl }: GameRendererProps) {
  const musicFile = audioFiles?.find((a) => a.type === 'music');
  const sfxFiles = audioFiles?.filter((a) => a.type === 'sfx') || [];
  
  const [isDayTime, setIsDayTime] = useState(sceneData.time !== 'night');
  const [cameraMode, setCameraMode] = useState<'follow' | 'orbit'>('follow');
  
  // Toggle day/night based on scene time
  useEffect(() => {
    setIsDayTime(sceneData.time !== 'night');
  }, [sceneData.time]);

  const backgroundColor = isDayTime 
    ? (sceneData.lighting?.color || '#87CEEB')
    : '#0a0a1a';

  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <color attach="background" args={[backgroundColor]} />
        <fog attach="fog" args={[backgroundColor, 20, 100]} />
        
        {/* Dynamic Lighting */}
        <ambientLight intensity={isDayTime ? 0.6 : 0.2} />
        <directionalLight 
          position={isDayTime ? [10, 20, 10] : [-10, 10, -10]} 
          intensity={isDayTime ? 1 : 0.3}
          color={isDayTime ? '#ffffff' : '#4444ff'}
          castShadow
        />
        {!isDayTime && (
          <pointLight position={[0, 10, 0]} intensity={0.5} color="#ffaa44" />
        )}
        
        {/* Ground with grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial 
            color={isDayTime ? '#3a5a3a' : '#1a1a2a'} 
          />
        </mesh>
        
        {/* Grid helper */}
        <gridHelper args={[200, 50, isDayTime ? '#444444' : '#222244', isDayTime ? '#333333' : '#1a1a2a']} position={[0, -0.9, 0]} />
        
        {/* Scene Objects */}
        {sceneData.objects?.map((obj, i) => (
          <InteractiveObject 
            key={i} 
            obj={obj} 
            index={i}
            sfxFiles={sfxFiles}
          />
        ))}
        
        {/* Player with Camera Controller */}
        <PlayerController cameraMode={cameraMode} />
        
        {/* Camera controller for orbit mode */}
        {cameraMode === 'orbit' && <OrbitCamera />}
      </Canvas>
      
      {/* HUD */}
      <div className="absolute top-4 left-4 text-white font-mono text-sm bg-black/70 backdrop-blur-sm p-4 rounded-lg pointer-events-auto">
        <div className="font-bold text-purple-400 text-lg">{sceneData.scene_name}</div>
        <div className="text-slate-300">Theme: {sceneData.theme} • {sceneData.mood}</div>
        <div className="text-slate-400 text-xs mt-1">Time: {isDayTime ? '☀️ Day' : '🌙 Night'}</div>
        
        <div className="mt-3 space-y-1 text-xs text-slate-400">
          <div>WASD / Arrows to move</div>
          <div>Mouse to look (click to lock)</div>
          <div>Space to jump</div>
        </div>
        
        {/* Controls */}
        <div className="mt-4 space-y-2">
          <button
            onClick={() => setIsDayTime(!isDayTime)}
            className="w-full text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
          >
            {isDayTime ? '🌙 Switch to Night' : '☀️ Switch to Day'}
          </button>
          <button
            onClick={() => setCameraMode(cameraMode === 'follow' ? 'orbit' : 'follow')}
            className="w-full text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
          >
            {cameraMode === 'follow' ? '📷 Orbit Camera' : '🎮 Follow Camera'}
          </button>
        </div>
      </div>
      
      {/* Object count */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs bg-black/50 px-4 py-2 rounded-full">
        {sceneData.objects?.length || 0} objects • Click objects to interact
      </div>
      
      {/* Background Audio */}
      {musicFile && (
        <audio 
          src={musicFile.url} 
          autoPlay 
          loop 
          className="hidden"
        />
      )}
    </div>
  );
}

// Interactive Object Component
function InteractiveObject({ 
  obj, 
  index,
  sfxFiles 
}: { 
  obj: GameRendererProps['sceneData']['objects'][0];
  index: number;
  sfxFiles: Array<{ type: string; name: string; url: string }>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  
  const color = objectColors[obj.type] || objectColors.default;
  const hoverColor = '#ffffff';
  
  // Play sound on click
  const handleClick = useCallback(() => {
    setClicked(true);
    setTimeout(() => setClicked(false), 200);
    
    // Play a random SFX if available
    if (sfxFiles.length > 0) {
      const randomSfx = sfxFiles[index % sfxFiles.length];
      if (randomSfx?.url) {
        const audio = new Audio(randomSfx.url);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }
    }
  }, [sfxFiles, index]);
  
  // Animation on hover/click
  useFrame((state) => {
    if (!meshRef.current) return;
    
    if (hovered || clicked) {
      meshRef.current.scale.setScalar(
        obj.scale * (clicked ? 1.2 : 1.1)
      );
      meshRef.current.rotation.y += 0.02;
    } else {
      meshRef.current.scale.setScalar(obj.scale);
    }
  });
  
  // Determine geometry based on object type
  const getGeometry = () => {
    switch (obj.type) {
      case 'tree':
        return <coneGeometry args={[0.5, 2, 8]} />;
      case 'rock':
        return <dodecahedronGeometry args={[0.5]} />;
      case 'building':
        return <boxGeometry args={[1, 1.5, 1]} />;
      case 'vehicle':
        return <boxGeometry args={[0.8, 0.5, 1.2]} />;
      case 'character':
        return <capsuleGeometry args={[0.3, 1, 4, 8]} />;
      default:
        return <boxGeometry args={[obj.scale, obj.scale, obj.scale]} />;
    }
  };
  
  return (
    <mesh 
      ref={meshRef}
      position={obj.position}
      castShadow
      receiveShadow
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}

    >
      {getGeometry()}
      <meshStandardMaterial 
        color={hovered || clicked ? hoverColor : color}
        emissive={clicked ? color : '#000000'}
        emissiveIntensity={clicked ? 0.5 : 0}
      />
    </mesh>
  );
}

// Player Controller Component
function PlayerController({ cameraMode }: { cameraMode: 'follow' | 'orbit' }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [velocity, setVelocity] = useState(new THREE.Vector3());
  const [isJumping, setIsJumping] = useState(false);
  
  // Mouse look
  const [mouseLocked, setMouseLocked] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set([...Array.from(prev), e.key.toLowerCase()]));
      if (e.code === 'Space' && !isJumping) {
        setIsJumping(true);
        setVelocity(v => new THREE.Vector3(v.x, 0.3, v.z));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseLocked) return;
      setRotation(prev => ({
        x: prev.x - e.movementY * 0.002,
        y: prev.y - e.movementX * 0.002,
      }));
    };
    
    const handleClick = () => {
      if (!mouseLocked) {
        document.body.requestPointerLock();
      }
    };
    
    const handlePointerLockChange = () => {
      setMouseLocked(document.pointerLockElement === document.body);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [mouseLocked, isJumping]);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    const speed = 0.15;
    const direction = new THREE.Vector3();
    
    // Movement relative to camera rotation
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotation.y
    );
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotation.y
    );
    
    if (keys.has('w') || keys.has('arrowup')) direction.add(forward);
    if (keys.has('s') || keys.has('arrowdown')) direction.sub(forward);
    if (keys.has('a') || keys.has('arrowleft')) direction.sub(right);
    if (keys.has('d') || keys.has('arrowright')) direction.add(right);
    
    direction.normalize().multiplyScalar(speed);
    
    // Apply gravity
    let newVelocity = velocity.clone();
    if (meshRef.current.position.y > 0 || velocity.y > 0) {
      newVelocity.y -= 0.015; // Gravity
    } else {
      newVelocity.y = 0;
      setIsJumping(false);
      meshRef.current.position.y = 0;
    }
    
    // Apply movement
    meshRef.current.position.x += direction.x;
    meshRef.current.position.z += direction.z;
    meshRef.current.position.y += newVelocity.y;
    
    if (newVelocity.y !== velocity.y) {
      setVelocity(newVelocity);
    }
    
    // Update camera in follow mode
    if (cameraMode === 'follow') {
      const cameraOffset = new THREE.Vector3(0, 5, 10);
      cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.y);
      camera.position.copy(meshRef.current.position).add(cameraOffset);
      camera.lookAt(meshRef.current.position);
    }
  });
  
  return (
    <>
      <mesh ref={meshRef} position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#6366f1" emissive="#4338ca" emissiveIntensity={0.3} />
      </mesh>
      
      {/* Instructions overlay */}
      {!mouseLocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 text-white px-6 py-4 rounded-lg text-center">
            <p className="text-lg font-semibold">Click to Play</p>
            <p className="text-sm text-slate-400">WASD to move • Mouse to look</p>
          </div>
        </div>
      )}
    </>
  );
}

// Orbit Camera Component
function OrbitCamera() {
  const { camera } = useThree();
  const [rotation, setRotation] = useState(0);
  
  useFrame(() => {
    setRotation(r => r + 0.005);
    const radius = 15;
    camera.position.x = Math.sin(rotation) * radius;
    camera.position.z = Math.cos(rotation) * radius;
    camera.lookAt(0, 0, 0);
  });
  
  return null;
}

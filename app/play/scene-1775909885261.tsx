'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Scene: Generated Scene
// Generated from: "A racing track with fast cars and cheering crowds"

export default function GameScene() {
  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <color attach="background" args={['#ffffff']} />
        
        {/* Lighting */}
        <ambientLight intensity={1} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1}
          castShadow
        />
        
        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
        
        {/* Scene Objects */}
        
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#2d5a27" />
        </mesh>
        <mesh position={[5, 0, 5]} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#808080" />
        </mesh>
        
        {/* Player */}
        <PlayerController />
        
        {/* Camera follows player */}
        <CameraController />
      </Canvas>
      
      {/* HUD */}
      <div className="absolute top-4 left-4 text-white font-mono text-sm bg-black/50 p-3 rounded">
        <div className="font-bold text-purple-400">Generated Scene</div>
        <div className="text-slate-300">Theme: adventure</div>
        <div className="text-slate-300">Mood: mysterious</div>
        <div className="mt-2 text-xs text-slate-400">
          WASD to move • Mouse to look
        </div>
      </div>
      
      {/* Audio */}
      <audio src="/generated/music-1775909888329.mp3" autoPlay loop />
    </div>
  );
}

function PlayerController() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const velocity = useRef(new THREE.Vector3());
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set(Array.from(prev).concat(e.key.toLowerCase())));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    const speed = 0.1;
    const direction = new THREE.Vector3();
    
    if (keys.has('w') || keys.has('arrowup')) direction.z -= 1;
    if (keys.has('s') || keys.has('arrowdown')) direction.z += 1;
    if (keys.has('a') || keys.has('arrowleft')) direction.x -= 1;
    if (keys.has('d') || keys.has('arrowright')) direction.x += 1;
    
    direction.normalize().multiplyScalar(speed);
    meshRef.current.position.add(direction);
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0.5, 0]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#6366f1" />
    </mesh>
  );
}

function CameraController() {
  // Simple camera that can be extended for mouse look
  return null;
}

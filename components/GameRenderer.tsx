'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState, useEffect } from 'react';
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

export default function GameRenderer({ sceneData, audioFiles, skyboxUrl }: GameRendererProps) {
  const musicFile = audioFiles?.find((a) => a.type === 'music');
  
  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <color attach="background" args={[sceneData.lighting?.color || '#1a1a2e']} />
        
        {/* Lighting */}
        <ambientLight intensity={sceneData.lighting?.intensity || 0.5} />
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
        {sceneData.objects?.map((obj, i) => {
          const color = obj.type === 'tree' ? '#2d5a27' : 
                       obj.type === 'rock' ? '#808080' : 
                       obj.type === 'building' ? '#8B4513' : 
                       obj.type === 'vehicle' ? '#6366f1' :
                       obj.type === 'character' ? '#f59e0b' : '#6366f1';
          
          return (
            <mesh key={i} position={obj.position} castShadow>
              <boxGeometry args={[obj.scale, obj.scale, obj.scale]} />
              <meshStandardMaterial color={color} />
            </mesh>
          );
        })}
        
        {/* Player */}
        <PlayerController />
      </Canvas>
      
      {/* HUD */}
      <div className="absolute top-4 left-4 text-white font-mono text-sm bg-black/50 p-3 rounded">
        <div className="font-bold text-purple-400">{sceneData.scene_name}</div>
        <div className="text-slate-300">Theme: {sceneData.theme}</div>
        <div className="text-slate-300">Mood: {sceneData.mood}</div>
        <div className="mt-2 text-xs text-slate-400">
          WASD to move • Mouse to look
        </div>
      </div>
      
      {/* Audio */}
      {musicFile && <audio src={musicFile.url} autoPlay loop />}
    </div>
  );
}

function PlayerController() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set([...Array.from(prev), e.key.toLowerCase()]));
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

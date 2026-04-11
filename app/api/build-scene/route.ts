import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    console.log('Building scene for prompt:', prompt);
    const sceneId = `scene-${Date.now()}`;
    
    // Step 1: Parse scene with LLM
    console.log('Step 1: Parsing scene...');
    const parseRes = await fetch(`${BASE_URL}/api/parse-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    
    if (!parseRes.ok) {
      throw new Error(`Parse scene failed: ${await parseRes.text()}`);
    }
    
    const { sceneData } = await parseRes.json();
    console.log('Scene parsed:', sceneData.scene_name);
    
    // Step 2: Search similar scenes
    console.log('Step 2: Searching similar scenes...');
    const searchRes = await fetch(`${BASE_URL}/api/search-scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneDescription: prompt })
    });
    
    const { similarScenes } = await searchRes.json();
    console.log(`Found ${similarScenes?.length || 0} similar scenes`);
    
    // Step 3: Generate audio
    console.log('Step 3: Generating audio...');
    const audioRes = await fetch(`${BASE_URL}/api/generate-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneData, similarScenes })
    });
    
    const { audioFiles } = await audioRes.json();
    console.log(`Generated ${audioFiles?.length || 0} audio files`);
    
    // Step 4: Generate skybox
    console.log('Step 4: Generating skybox...');
    const imageRes = await fetch(`${BASE_URL}/api/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sceneData })
    });
    
    const { skyboxUrl } = await imageRes.json();
    console.log('Skybox generated:', skyboxUrl);
    
    // Step 5: Generate Three.js game code
    console.log('Step 5: Generating game code...');
    const gameCode = generateGameCode({ sceneId, sceneData, audioFiles, skyboxUrl });
    
    // Step 6: Save game file
    await mkdir(path.join(process.cwd(), 'app/play'), { recursive: true });
    await writeFile(
      path.join(process.cwd(), `app/play/${sceneId}.tsx`),
      gameCode
    );
    console.log('Game file saved:', `app/play/${sceneId}.tsx`);
    
    return NextResponse.json({
      success: true,
      sceneId,
      url: `/play/${sceneId}`,
      sceneData,
      generated: {
        audioFiles: audioFiles?.length || 0,
        similarScenesFound: similarScenes?.length || 0,
        skybox: !!skyboxUrl,
      }
    });
    
  } catch (error) {
    console.error('Build scene error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

function generateGameCode({ sceneId, sceneData, audioFiles, skyboxUrl }: any) {
  const musicFile = audioFiles?.find((a: any) => a.type === 'music');
  const sfxFiles = audioFiles?.filter((a: any) => a.type === 'sfx') || [];
  
  return `'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Scene: ${sceneData.scene_name}
// Generated from: "${sceneData.raw_prompt}"

export default function GameScene() {
  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <color attach="background" args={['${sceneData.lighting?.color || '#1a1a2e'}']} />
        
        {/* Lighting */}
        <ambientLight intensity={${sceneData.lighting?.intensity || 0.5}} />
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
        ${(sceneData.objects || []).map((obj: any, i: number) => {
          const pos = obj.position || [0, 0, 0];
          const scale = obj.scale || 1;
          const color = obj.type === 'tree' ? '#2d5a27' : 
                       obj.type === 'rock' ? '#808080' : 
                       obj.type === 'building' ? '#8B4513' : '#6366f1';
          
          return `
        <mesh position={[${pos.join(', ')}]} castShadow>
          <boxGeometry args={[${scale}, ${scale}, ${scale}]} />
          <meshStandardMaterial color="${color}" />
        </mesh>`;
        }).join('')}
        
        {/* Player */}
        <PlayerController />
        
        {/* Camera follows player */}
        <CameraController />
      </Canvas>
      
      {/* HUD */}
      <div className="absolute top-4 left-4 text-white font-mono text-sm bg-black/50 p-3 rounded">
        <div className="font-bold text-purple-400">${sceneData.scene_name}</div>
        <div className="text-slate-300">Theme: ${sceneData.theme}</div>
        <div className="text-slate-300">Mood: ${sceneData.mood}</div>
        <div className="mt-2 text-xs text-slate-400">
          WASD to move • Mouse to look
        </div>
      </div>
      
      {/* Audio */}
      ${musicFile ? `<audio src="${musicFile.url}" autoPlay loop />` : ''}
    </div>
  );
}

function PlayerController() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const velocity = useRef(new THREE.Vector3());
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set([...prev, e.key.toLowerCase()]));
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
`;
}
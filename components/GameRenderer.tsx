'use client';

import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import {
  Stars,
  Cloud,
  Environment,
  Float,
  Sparkles,
  PerspectiveCamera,
} from '@react-three/drei';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

interface GameObject {
  type: string;
  position: [number, number, number];
  scale: number;
  properties?: Record<string, any>;
}

interface GameRendererProps {
  sceneData: {
    scene_name: string;
    theme: string;
    mood: string;
    time: string;
    objects: GameObject[];
    lighting: { type: string; intensity: number; color: string };
    audio_zones?: Array<{
      type: string;
      sound: string;
      position?: [number, number, number];
      volume: number;
    }>;
    gameplay?: { type: string; camera: string };
  };
  audioFiles?: Array<{ type: string; name: string; url: string }>;
  skyboxUrl?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Palette + subtype resolution
// ──────────────────────────────────────────────────────────────────────────

function SkyDome({ url }: { url: string }) {
  const texture = useLoader(THREE.TextureLoader, url);
  useMemo(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[200, 48, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

const themePalette = (theme: string) => {
  switch (theme) {
    case 'racing':
      return { ground: '#2a2a2a', accent: '#ff2200', fog: '#453c3a', sky: '#7b6c5e' };
    case 'cyberpunk':
      return { ground: '#0b0e1a', accent: '#00ffff', fog: '#120a2a', sky: '#0a0a1a' };
    case 'scifi':
      return { ground: '#5c2b24', accent: '#ff6b4a', fog: '#3a1810', sky: '#4a1a10' };
    case 'horror':
      return { ground: '#15100e', accent: '#ff3344', fog: '#0a0505', sky: '#120806' };
    case 'fantasy':
      return { ground: '#3c6b30', accent: '#f0c674', fog: '#7a6090', sky: '#a070c0' };
    case 'forest':
    case 'nature':
      return { ground: '#2d5a2d', accent: '#ffeb66', fog: '#9ebfa8', sky: '#cfe0cb' };
    case 'desert':
      return { ground: '#c4a35a', accent: '#ffbb55', fog: '#e6c98a', sky: '#f5e4b3' };
    case 'space':
      return { ground: '#0a0a18', accent: '#ffffff', fog: '#000000', sky: '#000000' };
    case 'adventure':
      return { ground: '#3a5a3a', accent: '#ffcc66', fog: '#a0b8c4', sky: '#87ceeb' };
    default:
      return { ground: '#3a5a3a', accent: '#ffcc66', fog: '#a0b8c4', sky: '#87ceeb' };
  }
};

// Normalize a raw type + properties.type to one of our known renderers.
// GPT-4o often puts the real asset kind in properties.type (e.g. "street food vendor").
function resolveSubtype(obj: GameObject): string {
  const raw = (obj.type || '').toLowerCase();
  const sub = String(obj.properties?.type || '').toLowerCase();
  const combined = (sub + ' ' + raw).trim();

  // Track/road elements MUST match before 'building' so pit_lane/racetrack don't become towers.
  if (/pit.?lane|pit.?stop|track|road|racetrack|tarmac|asphalt|lane/.test(combined)) return 'skip';
  // Antennas, spectators, cones etc. — map to sensible stand-ins before fallback.
  if (/antenna|satellite|dish/.test(combined)) return 'lamp_post';
  if (/cone|pylon/.test(combined)) return 'barrel';
  if (/crowd|spectator|fan/.test(combined)) return 'character';
  if (/mushroom|fungus|toadstool/.test(combined)) return 'mushroom';
  if (/crystal|shard|gem/.test(combined)) return 'crystal';
  if (/hologram|holo|dragon|spirit|ghost/.test(combined)) return 'hologram';
  if (/neon|billboard|sign/.test(combined)) return 'neon_sign';
  if (/lamp|lantern|street.?light|torch/.test(combined)) return 'lamp_post';
  if (/astronaut|cosmonaut|spacesuit/.test(combined)) return 'astronaut';
  if (/rover|hover|police car|hoverbike|craft|thruster|ship|lander|spaceship/.test(combined))
    return 'rover';
  if (/race.?car|nascar|sports.?car|stock.?car/.test(combined)) return 'race_car';
  if (/grandstand|bleacher|stand|stadium/.test(combined)) return 'grandstand';
  if (/cottage|cabin|hut|dwelling/.test(combined)) return 'cottage';
  if (/ruin|pillar|column|stone.?arch|monument|obelisk/.test(combined)) return 'ruin';
  if (/fence|barrier|railing/.test(combined)) return 'fence';
  if (/flag|banner|pennant/.test(combined)) return 'flag';
  if (/food.?vendor|food.?cart|stall|market/.test(combined)) return 'food_cart';
  if (/firefly|spark|ember/.test(combined)) return 'firefly';
  if (/barrel|crate|box|container/.test(combined)) return 'barrel';
  if (/pine|fir|conifer|spruce/.test(combined)) return 'pine_tree';
  if (/tree|bush|shrub|sapling/.test(combined)) return 'tree';
  if (/rock|boulder|stone/.test(combined)) return 'rock';
  if (/grass|fern|plant|foliage/.test(combined)) return 'grass_clump';
  if (/vehicle|car|truck/.test(combined)) return 'race_car';
  if (/building|skyscraper|tower|structure/.test(combined)) return 'building';
  if (/character|npc|person|human|knight|warrior/.test(combined)) return 'character';
  if (raw === 'light') return 'lamp_post';
  if (raw === 'prop') return 'barrel';
  return raw || 'barrel';
}

// ──────────────────────────────────────────────────────────────────────────
// Reusable low-poly asset renderers (kept as plain functions → one tree)
// ──────────────────────────────────────────────────────────────────────────

function PineTree({ position, scale = 1, variant = 0 }: { position: [number, number, number]; scale?: number; variant?: number }) {
  const green = ['#2d6d3a', '#3a7a45', '#265a2c', '#468f52'][variant % 4];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 1.2, 6]} />
        <meshStandardMaterial color="#6b4a2a" roughness={1} />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <coneGeometry args={[1.05, 1.8, 7]} />
        <meshStandardMaterial color={green} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[0.75, 1.3, 7]} />
        <meshStandardMaterial color={green} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 3.4, 0]} castShadow>
        <coneGeometry args={[0.45, 0.9, 7]} />
        <meshStandardMaterial color={green} roughness={1} flatShading />
      </mesh>
    </group>
  );
}

function BroadTree({ position, scale = 1, theme = 'default' }: { position: [number, number, number]; scale?: number; theme?: string }) {
  const leafColor =
    theme === 'fantasy' ? '#b95dbb' : theme === 'desert' ? '#7ba25a' : '#3a7a45';
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 1.5, 6]} />
        <meshStandardMaterial color="#5b3e24" roughness={1} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow>
        <icosahedronGeometry args={[1.05, 0]} />
        <meshStandardMaterial color={leafColor} roughness={1} flatShading />
      </mesh>
      <mesh position={[-0.5, 1.8, 0.4]} castShadow>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color={leafColor} roughness={1} flatShading />
      </mesh>
      <mesh position={[0.6, 1.9, -0.3]} castShadow>
        <icosahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial color={leafColor} roughness={1} flatShading />
      </mesh>
    </group>
  );
}

function Rock({ position, scale = 1, theme = 'default' }: { position: [number, number, number]; scale?: number; theme?: string }) {
  const col = theme === 'scifi' ? '#884a3a' : theme === 'desert' ? '#b08050' : '#7a7a7a';
  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow>
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color={col} roughness={1} flatShading />
      </mesh>
      <mesh position={[0.3, -0.15, 0.25]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial color={col} roughness={1} flatShading />
      </mesh>
    </group>
  );
}

function GrassClump({ position, scale = 1, color = '#4fa554' }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2;
        const r = 0.1;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.15, Math.sin(a) * r]} rotation={[0, a, 0]}>
            <coneGeometry args={[0.06, 0.4, 4]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

function Mushroom({ position, scale = 1, variant = 0 }: { position: [number, number, number]; scale?: number; variant?: number }) {
  const caps = ['#d43f3f', '#c266c4', '#d07a34', '#3ec0c0'];
  const cap = caps[variant % caps.length];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.5, 10]} />
        <meshStandardMaterial color="#f5ecd7" roughness={1} />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <sphereGeometry args={[0.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={cap} roughness={0.7} emissive={cap} emissiveIntensity={0.15} />
      </mesh>
      {/* spots */}
      {[[0.25, 0.72, 0.1], [-0.2, 0.7, -0.15], [0.1, 0.8, 0.2]].map((p, i) => (
        <mesh key={i} position={p as any}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color="#f5ecd7" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Crystal({ position, scale = 1, color = '#8df5ff' }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <octahedronGeometry args={[0.7, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.1}
          transparent
          opacity={0.85}
          flatShading
        />
      </mesh>
      <mesh position={[0.3, 0.4, 0.2]} castShadow>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.8} flatShading />
      </mesh>
      <pointLight color={color} intensity={0.6} distance={4} />
    </group>
  );
}

function Hologram({ position, scale = 1, color = '#66ffff' }: { position: [number, number, number]; scale?: number; color?: string }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (groupRef.current) groupRef.current.rotation.y = s.clock.elapsedTime * 0.4;
  });
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* glowing core */}
      <mesh position={[0, 2.2, 0]}>
        <icosahedronGeometry args={[0.9, 0]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} wireframe />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.35, 16, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* base rings */}
      {[0.2, 0.45].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7 - i * 0.15, 0.03, 6, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      ))}
      <pointLight color={color} intensity={1.2} distance={6} />
    </group>
  );
}

function NeonSign({ position, scale = 1, color = '#ff55aa' }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      {/* post */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 3, 6]} />
        <meshStandardMaterial color="#222" roughness={0.9} />
      </mesh>
      {/* sign */}
      <mesh position={[0.7, 2.7, 0]} castShadow>
        <boxGeometry args={[1.4, 0.8, 0.1]} />
        <meshStandardMaterial color="#0d0d12" roughness={0.8} />
      </mesh>
      <mesh position={[0.7, 2.7, 0.06]}>
        <planeGeometry args={[1.3, 0.7]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight position={[0.7, 2.7, 0.4]} color={color} intensity={1.5} distance={5} />
    </group>
  );
}

function LampPost({ position, scale = 1, color = '#ffc966' }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 3, 6]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.4} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[0, 3.05, 0]} color={color} intensity={0.9} distance={8} decay={2} />
    </group>
  );
}

function Cottage({ position, scale = 1, theme = 'default' }: { position: [number, number, number]; scale?: number; theme?: string }) {
  const wall = theme === 'fantasy' ? '#b89870' : '#d9c08a';
  const roof = theme === 'fantasy' ? '#6b2d2d' : '#8a3a2a';
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 1.2, 1.6]} />
        <meshStandardMaterial color={wall} roughness={1} />
      </mesh>
      {/* roof */}
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.6, 0.9, 4]} />
        <meshStandardMaterial color={roof} roughness={0.9} flatShading />
      </mesh>
      {/* door */}
      <mesh position={[0, 0.4, 0.81]}>
        <planeGeometry args={[0.4, 0.8]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      {/* windows */}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.7, 0.81]}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshBasicMaterial color="#ffd88a" />
        </mesh>
      ))}
    </group>
  );
}

function Building({ position, scale = 1, theme = 'default' }: { position: [number, number, number]; scale?: number; theme?: string }) {
  const palette = themePalette(theme);
  const isCyber = theme === 'cyberpunk' || theme === 'scifi';
  const base = isCyber ? '#1e2438' : '#c8b99a';
  const accent = isCyber ? palette.accent : '#ffd88a';
  const h = 3 + (Math.abs(Math.sin(position[0] * 0.7 + position[2] * 0.3)) * 4); // procedural height based on pos
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, h, 1.8]} />
        <meshStandardMaterial color={base} roughness={0.7} metalness={isCyber ? 0.2 : 0} />
      </mesh>
      {/* window grid rows */}
      {Array.from({ length: Math.floor(h / 0.6) }).map((_, i) => (
        <group key={i} position={[0, 0.5 + i * 0.7, 0]}>
          {[-0.5, 0.5].map((side) => (
            <mesh key={side} position={[side > 0 ? 0.91 : -0.91, 0, 0]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
              <planeGeometry args={[1.4, 0.35]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          ))}
          {[-0.5, 0.5].map((side) => (
            <mesh key={'z' + side} position={[0, 0, side > 0 ? 0.91 : -0.91]} rotation={[0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
              <planeGeometry args={[1.4, 0.35]} />
              <meshBasicMaterial color={accent} />
            </mesh>
          ))}
        </group>
      ))}
      {/* roof detail */}
      <mesh position={[0, h + 0.2, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}

function RaceCar({ position, scale = 1, color = '#e63946' }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      {/* chassis */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1.1, 0.34, 2.4]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.7} />
      </mesh>
      {/* cabin */}
      <mesh position={[0, 0.62, -0.15]} castShadow>
        <boxGeometry args={[0.85, 0.35, 1.1]} />
        <meshStandardMaterial color="#0a0a14" roughness={0.1} metalness={0.9} />
      </mesh>
      {/* windshield tint */}
      <mesh position={[0, 0.62, 0.35]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[0.82, 0.35]} />
        <meshStandardMaterial color="#6cc7ff" roughness={0.05} metalness={0.9} transparent opacity={0.6} />
      </mesh>
      {/* rear spoiler */}
      <mesh position={[0, 0.7, -1.1]}>
        <boxGeometry args={[1.2, 0.08, 0.25]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* number circle */}
      <mesh position={[0, 0.62, -0.8]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.2, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* wheels */}
      {[
        [-0.58, 0.2, 0.85],
        [0.58, 0.2, 0.85],
        [-0.58, 0.2, -0.85],
        [0.58, 0.2, -0.85],
      ].map((p, i) => (
        <group key={i} position={p as any}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, 0.22, 14]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.8} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.23, 10]} />
            <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Rover({ position, scale = 1, color = '#1c6dc5' }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      {/* base */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.2, 0.3, 1.8]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* dome */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.55, 16, 10]} />
        <meshStandardMaterial color="#a8d8ff" transparent opacity={0.5} roughness={0.05} metalness={0.9} />
      </mesh>
      {/* thrusters */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.5, -1.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.18, 0.3, 10]} />
          <meshStandardMaterial color="#666" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* glow */}
      <pointLight position={[0, 0.5, -1.1]} color="#00ccff" intensity={1.2} distance={4} />
      {/* wheels */}
      {[
        [-0.6, 0.2, 0.65],
        [0.6, 0.2, 0.65],
        [-0.6, 0.2, -0.65],
        [0.6, 0.2, -0.65],
      ].map((p, i) => (
        <mesh key={i} position={p as any} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 0.2, 12]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
    </group>
  );
}

function Astronaut({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.6, 6, 10]} />
        <meshStandardMaterial color="#e8e8ee" roughness={0.4} metalness={0.25} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <sphereGeometry args={[0.26, 14, 10]} />
        <meshStandardMaterial color="#e8e8ee" roughness={0.3} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.25, 0.19]}>
        <sphereGeometry args={[0.19, 14, 10]} />
        <meshStandardMaterial color="#0a1a3a" metalness={1} roughness={0.05} />
      </mesh>
      {/* backpack */}
      <mesh position={[0, 0.7, -0.28]} castShadow>
        <boxGeometry args={[0.45, 0.55, 0.25]} />
        <meshStandardMaterial color="#aaaaae" />
      </mesh>
      {/* arms */}
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.7, 0]} castShadow>
          <capsuleGeometry args={[0.09, 0.4, 4, 8]} />
          <meshStandardMaterial color="#e8e8ee" />
        </mesh>
      ))}
      {/* legs */}
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} position={[x, 0.15, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.3, 4, 8]} />
          <meshStandardMaterial color="#d6d6dc" />
        </mesh>
      ))}
    </group>
  );
}

function Character({ position, scale = 1, theme = 'default' }: { position: [number, number, number]; scale?: number; theme?: string }) {
  const body = theme === 'cyberpunk' ? '#9f00ff' : theme === 'horror' ? '#331a1a' : '#3a6fe8';
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.24, 0.65, 4, 10]} />
        <meshStandardMaterial color={body} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.22, 14, 10]} />
        <meshStandardMaterial color="#f5c8a8" />
      </mesh>
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.65, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
          <meshStandardMaterial color={body} />
        </mesh>
      ))}
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.15, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.3, 4, 8]} />
          <meshStandardMaterial color="#1a1a24" />
        </mesh>
      ))}
    </group>
  );
}

function Grandstand({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[0, 0.2 + i * 0.3, -i * 0.4]} castShadow>
          <boxGeometry args={[4, 0.25, 0.4]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#dd3333' : '#ffffff'} roughness={0.8} />
        </mesh>
      ))}
      {/* backing */}
      <mesh position={[0, 0.9, -2.1]} castShadow>
        <boxGeometry args={[4.2, 1.8, 0.2]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
    </group>
  );
}

function Ruin({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 1.8, 8]} />
          <meshStandardMaterial color="#a8a090" roughness={1} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 1.9, 0]} castShadow>
        <boxGeometry args={[2, 0.2, 0.4]} />
        <meshStandardMaterial color="#a8a090" roughness={1} flatShading />
      </mesh>
      {/* scattered chunks */}
      <mesh position={[1, 0.2, 0.8]} rotation={[0.3, 0.5, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.3]} />
        <meshStandardMaterial color="#8c8474" roughness={1} />
      </mesh>
    </group>
  );
}

function Fence({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {[-0.9, -0.3, 0.3, 0.9].map((x) => (
        <mesh key={x} position={[x, 0.4, 0]} castShadow>
          <boxGeometry args={[0.08, 0.8, 0.08]} />
          <meshStandardMaterial color="#6b4a2a" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[1.9, 0.06, 0.05]} />
        <meshStandardMaterial color="#6b4a2a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.9, 0.06, 0.05]} />
        <meshStandardMaterial color="#6b4a2a" roughness={1} />
      </mesh>
    </group>
  );
}

function Flag({ position, scale = 1, color = '#ee3344' }: { position: [number, number, number]; scale?: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) (ref.current.material as THREE.MeshStandardMaterial).color.setHSL(((s.clock.elapsedTime * 0.05) % 1), 0.7, 0.5);
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.5, 6]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.7} />
      </mesh>
      <mesh position={[0.45, 2.1, 0]}>
        <planeGeometry args={[0.9, 0.6]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function FoodCart({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.4, 1, 0.9]} />
        <meshStandardMaterial color="#b94a4a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <boxGeometry args={[1.6, 0.1, 1.1]} />
        <meshStandardMaterial color="#e6c87a" roughness={0.8} />
      </mesh>
      {/* wheels */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.1, 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.12, 10]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* steam (billboard) */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
      </mesh>
      <pointLight position={[0, 1, 0.5]} color="#ff8844" intensity={0.4} distance={3} />
    </group>
  );
}

function Barrel({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.8, 14]} />
        <meshStandardMaterial color="#6b4a2a" roughness={1} />
      </mesh>
      {/* bands */}
      {[0.15, 0.65].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[0.36, 0.03, 6, 20]} />
          <meshStandardMaterial color="#3a2a1a" metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Per-theme ground + scatter
// ──────────────────────────────────────────────────────────────────────────

function Ground({ theme, palette }: { theme: string; palette: ReturnType<typeof themePalette> }) {
  const isRacing = theme === 'racing';
  const isMars = theme === 'scifi' && palette.ground.toLowerCase().startsWith('#5');
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[300, 300, 1, 1]} />
        <meshStandardMaterial color={palette.ground} roughness={1} />
      </mesh>
      {isRacing && (
        <group position={[0, -0.98, 0]}>
          {/* racing track inner strip */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[14, 22, 64]} />
            <meshStandardMaterial color="#1b1b1b" roughness={1} />
          </mesh>
          {/* lane markings */}
          {Array.from({ length: 40 }).map((_, i) => {
            const a = (i / 40) * Math.PI * 2;
            const r = 18;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * r, 0.01, Math.sin(a) * r]}
                rotation={[-Math.PI / 2, 0, -a]}
              >
                <planeGeometry args={[1.2, 0.2]} />
                <meshBasicMaterial color="#ffee55" />
              </mesh>
            );
          })}
          {/* rumble strip */}
          {Array.from({ length: 80 }).map((_, i) => {
            const a = (i / 80) * Math.PI * 2;
            const r = 14;
            return (
              <mesh
                key={'r' + i}
                position={[Math.cos(a) * r, 0.02, Math.sin(a) * r]}
                rotation={[-Math.PI / 2, 0, -a]}
              >
                <planeGeometry args={[0.7, 0.6]} />
                <meshBasicMaterial color={i % 2 === 0 ? '#d93030' : '#ffffff'} />
              </mesh>
            );
          })}
        </group>
      )}
      {isMars && (
        <Sparkles count={60} scale={[120, 3, 120]} size={1.2} speed={0.3} color="#c97a50" opacity={0.35} />
      )}
    </group>
  );
}

// Instanced scatter — very cheap density
function Scatter({
  theme,
  count,
  spread,
  kind,
}: {
  theme: string;
  count: number;
  spread: number;
  kind: 'grass' | 'rock' | 'tree' | 'dust';
}) {
  const data = useMemo(() => {
    const out: Array<{ p: [number, number, number]; r: number; s: number }> = [];
    let seed = 12345 + count;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 6 + rng() * spread;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      out.push({ p: [x, -1, z], r: rng() * Math.PI * 2, s: 0.5 + rng() * 0.9 });
    }
    return out;
  }, [count, spread]);

  if (kind === 'grass') {
    const color = theme === 'fantasy' ? '#5ab55a' : theme === 'racing' ? '#4a7c3a' : '#4fa554';
    return (
      <group>
        {data.map((d, i) => (
          <GrassClump key={i} position={d.p} scale={d.s} color={color} />
        ))}
      </group>
    );
  }
  if (kind === 'rock') {
    return (
      <group>
        {data.map((d, i) => (
          <Rock key={i} position={d.p} scale={d.s * 0.7} theme={theme} />
        ))}
      </group>
    );
  }
  if (kind === 'tree') {
    return (
      <group>
        {data.map((d, i) => (
          <PineTree key={i} position={d.p} scale={d.s * 1.1} variant={i % 4} />
        ))}
      </group>
    );
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// Dispatcher — route a scene object to the right renderer
// ──────────────────────────────────────────────────────────────────────────

function SceneObject({ obj, theme, sfxFiles, index }: { obj: GameObject; theme: string; sfxFiles: Array<{ name: string; url: string; type: string }>; index: number }) {
  const [clicked, setClicked] = useState(false);
  const subtype = resolveSubtype(obj);
  const scale = obj.scale ?? 1;
  const pos = obj.position;
  const propColor =
    obj.properties?.color ||
    obj.properties?.light_color ||
    undefined;

  const handleClick = useCallback(() => {
    setClicked(true);
    setTimeout(() => setClicked(false), 180);
    const sfx = sfxFiles[index % Math.max(1, sfxFiles.length)];
    if (sfx?.url) {
      const audio = new Audio(sfx.url);
      audio.volume = 0.6;
      audio.play().catch(() => {});
    }
  }, [index, sfxFiles]);

  const wrap = (node: JSX.Element) => (
    <group onClick={handleClick}>{node}</group>
  );

  switch (subtype) {
    case 'pine_tree':
      return wrap(<PineTree position={pos} scale={scale} variant={index} />);
    case 'tree':
      return wrap(<BroadTree position={pos} scale={scale} theme={theme} />);
    case 'rock':
      return wrap(<Rock position={pos} scale={scale} theme={theme} />);
    case 'grass_clump':
      return wrap(<GrassClump position={pos} scale={scale} />);
    case 'mushroom':
      return wrap(<Mushroom position={pos} scale={scale} variant={index} />);
    case 'crystal':
      return wrap(<Crystal position={pos} scale={scale} color={propColor || '#8df5ff'} />);
    case 'hologram':
      return wrap(<Hologram position={pos} scale={scale} color={propColor || '#66ffff'} />);
    case 'neon_sign':
      return wrap(<NeonSign position={pos} scale={scale} color={propColor || '#ff55aa'} />);
    case 'lamp_post':
      return wrap(<LampPost position={pos} scale={scale} color={propColor || '#ffc966'} />);
    case 'cottage':
      return wrap(<Cottage position={pos} scale={scale} theme={theme} />);
    case 'building':
      return wrap(<Building position={pos} scale={scale} theme={theme} />);
    case 'race_car':
      return wrap(<RaceCar position={pos} scale={scale} color={propColor || ['#e63946', '#ffcc33', '#2b8cff', '#2ed573'][index % 4]} />);
    case 'rover':
      return wrap(<Rover position={pos} scale={scale} color={propColor || '#4a7ac5'} />);
    case 'astronaut':
      return wrap(<Astronaut position={pos} scale={scale} />);
    case 'character':
      return wrap(<Character position={pos} scale={scale} theme={theme} />);
    case 'grandstand':
      return wrap(<Grandstand position={pos} scale={scale} />);
    case 'ruin':
      return wrap(<Ruin position={pos} scale={scale} />);
    case 'fence':
      return wrap(<Fence position={pos} scale={scale} />);
    case 'flag':
      return wrap(<Flag position={pos} scale={scale} color={propColor} />);
    case 'food_cart':
      return wrap(<FoodCart position={pos} scale={scale} />);
    case 'firefly':
      return null; // covered by particle system
    case 'skip':
      return null; // track / road / pit lane — drawn by the Ground component
    case 'barrel':
    default:
      return wrap(<Barrel position={pos} scale={scale} />);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Lightweight particles (theme-aware, bounded counts for perf)
// ──────────────────────────────────────────────────────────────────────────

function AmbientParticles({ theme, isDayTime }: { theme: string; isDayTime: boolean }) {
  const config = useMemo(() => {
    switch (theme) {
      case 'fantasy':
        return { count: 80, color: '#ffdd66', size: 0.25, speed: 0.4 };
      case 'forest':
      case 'nature':
        return { count: 60, color: '#ffee88', size: 0.2, speed: 0.4 };
      case 'cyberpunk':
        return { count: 100, color: '#00ffff', size: 0.12, speed: 1.0 };
      case 'horror':
        return { count: 30, color: '#ff3344', size: 0.28, speed: 0.3 };
      case 'scifi':
        return { count: 50, color: '#ff9c6b', size: 0.2, speed: 0.6 };
      default:
        return { count: isDayTime ? 0 : 30, color: '#ffffff', size: 0.2, speed: 0.4 };
    }
  }, [theme, isDayTime]);

  if (config.count === 0) return null;
  return (
    <Sparkles
      count={config.count}
      size={config.size}
      speed={config.speed}
      scale={[60, 18, 60]}
      color={config.color}
      opacity={0.75}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────

export default function GameRenderer({ sceneData, audioFiles, skyboxUrl }: GameRendererProps) {
  const musicFile = audioFiles?.find((a) => a.type === 'music');
  const sfxFiles = audioFiles?.filter((a) => a.type === 'sfx') || [];

  const [isDayTime, setIsDayTime] = useState(sceneData.time !== 'night');
  const [cameraMode, setCameraMode] = useState<'follow' | 'orbit'>('follow');
  const [isMobile, setIsMobile] = useState(false);
  const [mouseLocked, setMouseLocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (mouseLocked && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [mouseLocked]);

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [hudVisible, setHudVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHudVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => setIsDayTime(sceneData.time !== 'night'), [sceneData.time]);

  const palette = useMemo(() => themePalette(sceneData.theme), [sceneData.theme]);
  const objects = sceneData.objects || [];

  // Scatter density by theme
  const scatter = useMemo(() => {
    switch (sceneData.theme) {
      case 'forest':
      case 'nature':
      case 'fantasy':
        return { grass: 160, rock: 20, tree: 22, dust: 0 };
      case 'racing':
        return { grass: 80, rock: 0, tree: 12, dust: 0 };
      case 'desert':
      case 'scifi':
        return { grass: 0, rock: 40, tree: 0, dust: 1 };
      case 'cyberpunk':
        return { grass: 0, rock: 0, tree: 0, dust: 0 };
      default:
        return { grass: 80, rock: 10, tree: 10, dust: 0 };
    }
  }, [sceneData.theme]);

  const bloomIntensity = sceneData.theme === 'cyberpunk' ? 0.9 : sceneData.theme === 'scifi' ? 0.6 : 0.35;

  return (
    <div className="w-full h-[100dvh] bg-black relative overflow-hidden touch-none">
      <Canvas
        shadows
        dpr={[1, 1.25]}
        frameloop="always"
        camera={{ position: [0, 5, 20], fov: isMobile ? 75 : 62 }}
        gl={{ antialias: true, powerPreference: 'high-performance', stencil: false, depth: true }}
        performance={{ min: 0.5 }}
        style={{ touchAction: 'none' }}
      >
        <color attach="background" args={[isDayTime ? palette.sky : '#0a0a1a']} />
        <fog attach="fog" args={[palette.fog, 25, 110]} />

        {/* Skybox / environment lighting */}
        <Environment preset={isDayTime ? 'sunset' : 'night'} background={false} />
        {skyboxUrl && <SkyDome url={skyboxUrl} />}

        {/* Stars only in deep-night themes, fewer than before */}
        {!isDayTime && sceneData.theme !== 'cyberpunk' && (
          <Stars radius={120} depth={40} count={1800} factor={3} saturation={0} fade speed={1} />
        )}

        {/* Daylight clouds — just one */}
        {isDayTime && sceneData.theme !== 'space' && (
          <Cloud position={[-10, 18, -30]} speed={0.15} opacity={0.5} scale={2} color="#ffffff" />
        )}

        {/* Lighting — single shadow-casting directional + soft ambient */}
        <ambientLight intensity={isDayTime ? 0.55 : 0.2} color={sceneData.theme === 'horror' ? '#ff4444' : '#ffffff'} />
        <directionalLight
          position={isDayTime ? [14, 22, 10] : [-10, 12, -8]}
          intensity={isDayTime ? 1.35 : 0.4}
          color={isDayTime ? '#fff4dc' : sceneData.theme === 'cyberpunk' ? '#ff55ff' : '#4488ff'}
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-camera-far={60}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          shadow-bias={-0.0005}
        />

        {/* Theme-specific fill lights */}
        {sceneData.theme === 'cyberpunk' && (
          <>
            <pointLight position={[8, 4, 8]} intensity={2.5} color="#00ffff" distance={24} />
            <pointLight position={[-8, 4, -8]} intensity={2.5} color="#ff00ff" distance={24} />
            <pointLight position={[0, 6, 0]} intensity={1} color="#8800ff" distance={30} />
          </>
        )}
        {sceneData.theme === 'horror' && (
          <pointLight position={[0, 4, 0]} intensity={1.2} color="#ff3333" distance={18} />
        )}

        {/* Ground + scatter */}
        <Ground theme={sceneData.theme} palette={palette} />
        {scatter.grass > 0 && <Scatter theme={sceneData.theme} count={scatter.grass} spread={45} kind="grass" />}
        {scatter.rock > 0 && <Scatter theme={sceneData.theme} count={scatter.rock} spread={50} kind="rock" />}
        {scatter.tree > 0 && <Scatter theme={sceneData.theme} count={scatter.tree} spread={55} kind="tree" />}

        {/* Ambient mood particles (lightweight Sparkles) */}
        <AmbientParticles theme={sceneData.theme} isDayTime={isDayTime} />

        {/* Scene objects from the parser */}
        {objects.map((obj, i) => (
          <SceneObject key={i} obj={obj} theme={sceneData.theme} sfxFiles={sfxFiles} index={i} />
        ))}

        {/* Player */}
        <PlayerController
          cameraMode={cameraMode}
          theme={sceneData.theme}
          onMouseLockChange={setMouseLocked}
        />

        {cameraMode === 'orbit' && <OrbitCamera />}

        {/* Post-processing — tame, perf-friendly */}
        <EffectComposer multisampling={0}>
          <Bloom intensity={bloomIntensity} luminanceThreshold={0.6} luminanceSmoothing={0.85} mipmapBlur />
          <Vignette eskil={false} offset={0.15} darkness={sceneData.theme === 'horror' ? 0.7 : 0.35} />
        </EffectComposer>
      </Canvas>

      {/* Click to Play — outside Canvas */}
      {!mouseLocked && cameraMode === 'follow' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-black/80 backdrop-blur-md text-white px-8 py-6 rounded-2xl text-center border border-white/10 shadow-2xl">
            <p className="text-2xl font-bold mb-2">🎮 Click to Play</p>
            <p className="text-sm text-slate-400">WASD · Mouse to look · Space to jump</p>
          </div>
        </div>
      )}

      {/* HUD */}
      <div
        className={`absolute top-2 sm:top-4 left-2 sm:left-4 transition-all duration-700 transform ${
          hudVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
        }`}
      >
        <div className="text-white font-mono text-xs sm:text-sm bg-black/80 backdrop-blur-md p-3 sm:p-5 rounded-lg sm:rounded-xl border border-white/10 shadow-2xl pointer-events-auto min-w-[160px] sm:min-w-[220px] max-w-[200px] sm:max-w-none">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <span className="text-lg sm:text-2xl">
              {sceneData.theme === 'forest' ? '🌲' :
               sceneData.theme === 'nature' ? '🌿' :
               sceneData.theme === 'desert' ? '🏜️' :
               sceneData.theme === 'cyberpunk' ? '🌃' :
               sceneData.theme === 'horror' ? '👻' :
               sceneData.theme === 'space' ? '🚀' :
               sceneData.theme === 'scifi' ? '🛸' :
               sceneData.theme === 'racing' ? '🏎️' :
               sceneData.theme === 'fantasy' ? '⚔️' :
               sceneData.theme === 'adventure' ? '🗺️' : '🎮'}
            </span>
            <div className="min-w-0">
              <div className="font-bold text-purple-400 text-sm sm:text-lg tracking-wide truncate">{sceneData.scene_name}</div>
              <div className="text-[10px] sm:text-xs text-slate-400">{sceneData.theme} • {sceneData.mood}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300 mb-3">
            <span className="text-lg">{isDayTime ? '☀️' : '🌙'}</span>
            <span>{isDayTime ? 'Daytime' : 'Nighttime'}</span>
          </div>

          <div className="h-px bg-gradient-to-r from-purple-500/50 to-transparent mb-3" />

          <div className="hidden sm:block space-y-1.5 text-xs text-slate-400 mb-4">
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">WASD</kbd><span>Move</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">Mouse</kbd><span>Look (click to lock)</span></div>
            <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">Space</kbd><span>Jump</span></div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <button
              onClick={() => setIsDayTime(!isDayTime)}
              className="w-full text-[10px] sm:text-xs bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all border border-white/5 flex items-center justify-center gap-1.5 sm:gap-2"
            >
              {isDayTime ? '🌙 Night' : '☀️ Day'}
            </button>
            <button
              onClick={() => setCameraMode(cameraMode === 'follow' ? 'orbit' : 'follow')}
              className="w-full text-[10px] sm:text-xs bg-gradient-to-r from-purple-700/80 to-indigo-700/80 hover:from-purple-600/80 hover:to-indigo-600/80 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all border border-purple-500/20 flex items-center justify-center gap-1.5 sm:gap-2"
            >
              {cameraMode === 'follow' ? '📷 Orbit' : '🎮 Follow'}
            </button>
          </div>
        </div>
      </div>

      {/* Music indicator */}
      {musicFile && (
        <div
          className={`absolute bottom-16 sm:bottom-20 left-2 sm:left-4 transition-all duration-700 delay-300 transform ${
            hudVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-white/5">
            <div className="flex gap-0.5">
              <div className="w-1 h-3 bg-purple-500 animate-pulse" />
              <div className="w-1 h-4 bg-purple-400 animate-pulse delay-75" />
              <div className="w-1 h-2 bg-purple-300 animate-pulse delay-150" />
              <div className="w-1 h-5 bg-purple-400 animate-pulse delay-100" />
            </div>
            <span className="text-[10px] sm:text-xs text-slate-300 truncate max-w-[140px]">♫ ElevenLabs Music</span>
          </div>
        </div>
      )}

      {/* Object count */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 transition-all duration-700 delay-400 transform ${
          hudVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-4 text-white text-[10px] sm:text-xs bg-black/60 backdrop-blur-sm px-3 sm:px-5 py-2 sm:py-2.5 rounded-full border border-white/10">
          <span className="flex items-center gap-1.5">
            <span className="text-purple-400 font-bold">{objects.length}</span>
            <span className="text-slate-400">objects</span>
          </span>
          <span className="w-px h-3 bg-slate-600" />
          <span className="text-slate-400">Click objects for SFX</span>
        </div>
      </div>

      <div
        className={`absolute bottom-4 right-2 sm:right-4 transition-all duration-700 delay-500 transform ${
          hudVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
        }`}
      >
        <div className="text-[8px] sm:text-[10px] text-slate-500 font-mono">
          SceneForge AI
        </div>
      </div>

      {musicFile && (
        <audio ref={audioRef} src={musicFile.url} loop className="hidden" />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Player — low-poly character, replaces the cube
// ──────────────────────────────────────────────────────────────────────────

function PlayerController({
  cameraMode,
  theme,
  onMouseLockChange,
}: {
  cameraMode: 'follow' | 'orbit';
  theme: string;
  onMouseLockChange?: (locked: boolean) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bobRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const keysRef = useRef<Set<string>>(new Set());
  const velocityRef = useRef(new THREE.Vector3());
  const isJumpingRef = useRef(false);
  const rotationRef = useRef({ x: 0, y: 0 });
  const mouseLockedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.code === 'Space' && !isJumpingRef.current) {
        isJumpingRef.current = true;
        velocityRef.current.y = 0.32;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseLockedRef.current) return;
      rotationRef.current.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, rotationRef.current.x - e.movementY * 0.002)
      );
      rotationRef.current.y -= e.movementX * 0.002;
    };
    const handleClick = () => {
      if (!mouseLockedRef.current) document.body.requestPointerLock();
    };
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === document.body;
      mouseLockedRef.current = locked;
      onMouseLockChange?.(locked);
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
  }, [onMouseLockChange]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const speed = 7.5 * delta; // scale by delta for FPS independence
    const dir = new THREE.Vector3();
    const ry = rotationRef.current.y;
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);

    const keys = keysRef.current;
    if (keys.has('w') || keys.has('arrowup')) dir.add(forward);
    if (keys.has('s') || keys.has('arrowdown')) dir.sub(forward);
    if (keys.has('a') || keys.has('arrowleft')) dir.sub(right);
    if (keys.has('d') || keys.has('arrowright')) dir.add(right);

    if (dir.lengthSq() > 0) dir.normalize().multiplyScalar(speed);

    // gravity
    const v = velocityRef.current;
    if (group.position.y > 0 || v.y > 0) {
      v.y -= 0.9 * delta;
    } else {
      v.y = 0;
      isJumpingRef.current = false;
      group.position.y = 0;
    }

    group.position.x += dir.x;
    group.position.z += dir.z;
    group.position.y += v.y;

    // face travel direction
    if (dir.lengthSq() > 0) {
      const targetAngle = Math.atan2(dir.x, dir.z);
      const cur = group.rotation.y;
      const diff = ((targetAngle - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      group.rotation.y = cur + diff * 0.18;
    }

    // walking bob
    if (bobRef.current) {
      const moving = dir.lengthSq() > 0 ? 1 : 0;
      bobRef.current.position.y = moving ? Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.08 : 0;
    }

    if (cameraMode === 'follow') {
      const offset = new THREE.Vector3(0, 4.5, 8).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        rotationRef.current.y
      );
      camera.position.lerp(group.position.clone().add(offset), 0.18);
      const look = group.position.clone();
      look.y += 1.2;
      camera.lookAt(look);
    }
  });

  const body =
    theme === 'cyberpunk' ? '#9f00ff' :
    theme === 'horror' ? '#4a1a1a' :
    theme === 'scifi' ? '#ff9c6b' :
    theme === 'racing' ? '#e63946' :
    theme === 'fantasy' ? '#4f8fe5' :
    '#3a6fe8';

  return (
    <>
      <group ref={groupRef} position={[0, 0, 12]}>
        <group ref={bobRef}>
          {/* torso */}
          <mesh position={[0, 0.85, 0]} castShadow>
            <capsuleGeometry args={[0.28, 0.7, 6, 12]} />
            <meshStandardMaterial color={body} roughness={0.5} metalness={0.1} />
          </mesh>
          {/* chest accent */}
          <mesh position={[0, 0.9, 0.23]}>
            <boxGeometry args={[0.25, 0.3, 0.04]} />
            <meshStandardMaterial color="#ffffff" emissive={body} emissiveIntensity={0.3} />
          </mesh>
          {/* head */}
          <mesh position={[0, 1.55, 0]} castShadow>
            <sphereGeometry args={[0.24, 16, 12]} />
            <meshStandardMaterial color="#f5c8a8" roughness={0.6} />
          </mesh>
          {/* visor / eyes */}
          <mesh position={[0, 1.58, 0.22]}>
            <boxGeometry args={[0.28, 0.08, 0.02]} />
            <meshStandardMaterial color="#141418" emissive="#88ccff" emissiveIntensity={0.5} />
          </mesh>
          {/* arms */}
          {[-0.4, 0.4].map((x) => (
            <mesh key={x} position={[x, 0.85, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.45, 4, 10]} />
              <meshStandardMaterial color={body} />
            </mesh>
          ))}
          {/* legs */}
          {[-0.14, 0.14].map((x) => (
            <mesh key={x} position={[x, 0.28, 0]} castShadow>
              <capsuleGeometry args={[0.12, 0.4, 4, 10]} />
              <meshStandardMaterial color="#1a1a24" />
            </mesh>
          ))}
        </group>
      </group>
      {/* soft player light */}
      <pointLight position={[0, 2.5, 0]} intensity={0.25} color="#ffffff" distance={5} />
    </>
  );
}

function OrbitCamera() {
  const { camera } = useThree();
  const rotRef = useRef(0);
  useFrame(() => {
    rotRef.current += 0.004;
    const r = 22;
    camera.position.x = Math.sin(rotRef.current) * r;
    camera.position.z = Math.cos(rotRef.current) * r;
    camera.position.y = 10 + Math.sin(rotRef.current * 0.5) * 2;
    camera.lookAt(0, 2, 0);
  });
  return null;
}

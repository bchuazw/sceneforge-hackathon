'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Stars, 
  Cloud, 
  Environment, 
  Float, 
  ContactShadows,
  Sparkles,
  useTexture,
  Trail,
  PerspectiveCamera,
  Lightformer
} from '@react-three/drei';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';

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

// Theme-based environment presets
const environmentPresets: Record<string, any> = {
  forest: 'forest',
  city: 'city',
  nature: 'forest',
  adventure: 'sunset',
  fantasy: 'sunset',
  sunset: 'sunset',
  desert: 'dawn',
  racing: 'dawn',
  scifi: 'night',
  cyberpunk: 'night',
  horror: 'night',
  space: 'night',
  underwater: 'lobby',
  default: 'sunset',
};

// Material configurations based on object type and theme
const getMaterialConfig = (type: string, theme: string) => {
  const configs: Record<string, Record<string, any>> = {
    tree: {
      roughness: 0.9,
      metalness: 0.0,
      color: '#2d5a27',
      emissive: '#0a1f08',
      emissiveIntensity: 0.1,
    },
    rock: {
      roughness: 0.95,
      metalness: 0.1,
      color: '#6b6b6b',
      ior: 1.5,
    },
    building: {
      roughness: 0.7,
      metalness: 0.2,
      color: '#8B7355',
    },
    vehicle: {
      roughness: 0.2,
      metalness: 0.8,
      color: '#4f46e5',
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    },
    character: {
      roughness: 0.5,
      metalness: 0.1,
      color: '#f59e0b',
    },
    prop: {
      roughness: 0.6,
      metalness: 0.3,
      color: '#a855f7',
    },
  };

  // Theme overrides
  if (theme === 'cyberpunk') {
    if (type === 'building') return { ...configs.building, emissive: '#00ffff', emissiveIntensity: 0.3 };
    if (type === 'vehicle') return { ...configs.vehicle, emissive: '#ff00ff', emissiveIntensity: 0.4 };
  }
  if (theme === 'horror') {
    return { ...configs[type] || configs.prop, color: '#3a2525', emissive: '#ff0000', emissiveIntensity: 0.1 };
  }
  if (theme === 'racing') {
    if (type === 'vehicle') return { ...configs.vehicle, color: '#ff2200', clearcoat: 1.0, clearcoatRoughness: 0.05 };
    if (type === 'building') return { ...configs.building, color: '#cccccc', metalness: 0.4 };
  }
  if (theme === 'scifi') {
    if (type === 'building') return { ...configs.building, color: '#334455', emissive: '#0088ff', emissiveIntensity: 0.2 };
    if (type === 'vehicle') return { ...configs.vehicle, color: '#223344', emissive: '#00ffcc', emissiveIntensity: 0.3 };
  }
  if (theme === 'fantasy') {
    if (type === 'building') return { ...configs.building, color: '#7a5c3c', metalness: 0.0 };
    if (type === 'character') return { ...configs.character, color: '#c0a060', metalness: 0.5 };
  }

  return configs[type] || configs.prop;
};

// Particle effects based on theme/mood
function ParticleEffects({ theme, mood, isDayTime }: { theme: string; mood: string; isDayTime: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particleConfig = useMemo(() => {
    switch (theme) {
      case 'forest':
        return {
          count: 100,
          color: '#ffff00',
          size: 0.05,
          speed: 0.2,
          type: 'fireflies',
        };
      case 'cyberpunk':
        return {
          count: 200,
          color: '#00ffff',
          size: 0.02,
          speed: 0.8,
          type: 'neon',
        };
      case 'scifi':
        return {
          count: 150,
          color: '#00ffcc',
          size: 0.03,
          speed: 1.0,
          type: 'neon',
        };
      case 'space':
        return {
          count: 300,
          color: '#ffffff',
          size: 0.03,
          speed: 0.1,
          type: 'stars',
        };
      case 'horror':
        return {
          count: 50,
          color: '#ff0000',
          size: 0.08,
          speed: 0.3,
          type: 'fog',
        };
      default:
        return {
          count: isDayTime ? 0 : 50,
          color: '#ffffff',
          size: 0.04,
          speed: 0.4,
          type: 'fireflies',
        };
    }
  }, [theme, isDayTime]);

  const positions = useMemo(() => {
    const pos = new Float32Array(particleConfig.count * 3);
    for (let i = 0; i < particleConfig.count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = Math.random() * 10 + 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, [particleConfig.count]);

  useFrame((state) => {
    if (!particlesRef.current) return;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < particleConfig.count; i++) {
      const i3 = i * 3;
      positions[i3 + 1] += Math.sin(state.clock.elapsedTime * particleConfig.speed + i) * 0.01;
      
      if (particleConfig.type === 'neon') {
        positions[i3] += Math.cos(state.clock.elapsedTime * 0.5 + i) * 0.02;
      }
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (particleConfig.count === 0) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleConfig.count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={particleConfig.size}
        color={particleConfig.color}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

// Rain effect for stormy/cyberpunk themes
function RainEffect({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  
  return (
    <Sparkles
      count={1000}
      scale={[50, 20, 50]}
      size={0.05}
      speed={4}
      color="#88ccff"
      opacity={0.6}
    />
  );
}

// Heat shimmer for desert
function HeatShimmer({ enabled }: { enabled: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!groupRef.current || !enabled) return;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
  });
  
  if (!enabled) return null;
  
  return (
    <group ref={groupRef}>
      {Array.from({ length: 20 }).map((_, i) => (
        <Float key={i} speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
          <mesh position={[(Math.random() - 0.5) * 40, Math.random() * 5, (Math.random() - 0.5) * 40]}>
            <planeGeometry args={[0.5, 0.5]} />
            <meshBasicMaterial color="#ffaa44" transparent opacity={0.1} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function GameRenderer({ sceneData, audioFiles, skyboxUrl }: GameRendererProps) {
  const musicFile = audioFiles?.find((a) => a.type === 'music');
  const sfxFiles = audioFiles?.filter((a) => a.type === 'sfx') || [];

  const [isDayTime, setIsDayTime] = useState(sceneData.time !== 'night');
  const [cameraMode, setCameraMode] = useState<'follow' | 'orbit'>('follow');
  const [isMobile, setIsMobile] = useState(false);
  const [mouseLocked, setMouseLocked] = useState(false);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice || isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [hudVisible, setHudVisible] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string>('');
  
  // HUD animation on load
  useEffect(() => {
    const timer = setTimeout(() => setHudVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Set currently playing track
  useEffect(() => {
    if (musicFile) {
      setCurrentlyPlaying(musicFile.name.replace(/\.[^/.]+$/, ''));
    }
  }, [musicFile]);

  // Toggle day/night based on scene time
  useEffect(() => {
    setIsDayTime(sceneData.time !== 'night');
  }, [sceneData.time]);

  const backgroundColor = useMemo(() => {
    if (sceneData.theme === 'space') return '#000000';
    if (sceneData.theme === 'horror') return '#1a0505';
    if (sceneData.theme === 'cyberpunk') return '#0a0a1a';
    return isDayTime 
      ? (sceneData.lighting?.color || '#87CEEB')
      : '#0a0a1a';
  }, [isDayTime, sceneData.lighting?.color, sceneData.theme]);

  const envPreset = environmentPresets[sceneData.theme] || environmentPresets.default;
  const showRain = sceneData.mood === 'stormy' || sceneData.theme === 'cyberpunk';
  const showHeatShimmer = sceneData.theme === 'desert';

  return (
    <div className="w-full h-[100dvh] bg-black relative overflow-hidden touch-none">
      <Canvas 
        camera={{ position: [0, 5, 10], fov: isMobile ? 75 : 60 }} 
        shadows
        style={{ touchAction: 'none' }}
      >
        <color attach="background" args={[backgroundColor]} />
        <fog 
          attach="fog" 
          args={[backgroundColor, sceneData.theme === 'horror' ? 10 : 20, sceneData.theme === 'horror' ? 50 : 100]} 
        />
        
        {/* Environment */}
        <Environment preset={envPreset} background={false} />
        
        {/* Stars for night scenes */}
        {!isDayTime && sceneData.theme !== 'cyberpunk' && sceneData.theme !== 'horror' && (
          <Stars 
            radius={100} 
            depth={50} 
            count={5000} 
            factor={4} 
            saturation={0} 
            fade 
            speed={1}
          />
        )}
        
        {/* Extra stars for space theme */}
        {sceneData.theme === 'space' && (
          <Stars 
            radius={200} 
            depth={100} 
            count={10000} 
            factor={2} 
            saturation={0.5} 
            fade 
            speed={0.5}
          />
        )}
        
        {/* Clouds for day scenes */}
        {isDayTime && sceneData.theme !== 'space' && sceneData.theme !== 'underwater' && (
          <>
            <Cloud
              position={[-10, 15, -20]}
              speed={0.2}
              opacity={0.8}
              scale={2}
              color="#ffffff"
            />
            <Cloud
              position={[15, 12, -15]}
              speed={0.15}
              opacity={0.6}
              scale={1.5}
              color="#ffffff"
            />
            <Cloud
              position={[0, 18, -30]}
              speed={0.25}
              opacity={0.7}
              scale={3}
              color="#f0f0f0"
            />
          </>
        )}
        
        {/* Dynamic Lighting */}
        <ambientLight intensity={isDayTime ? 0.5 : 0.15} color={sceneData.theme === 'horror' ? '#ff4444' : '#ffffff'} />
        <directionalLight 
          position={isDayTime ? [10, 20, 10] : [-10, 10, -10]} 
          intensity={isDayTime ? 1.2 : 0.3}
          color={isDayTime ? '#fffaf0' : sceneData.theme === 'cyberpunk' ? '#ff00ff' : '#4444ff'}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={100}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        
        {/* Theme-specific lighting */}
        {sceneData.theme === 'cyberpunk' && (
          <>
            <pointLight position={[10, 5, 10]} intensity={2} color="#00ffff" distance={20} />
            <pointLight position={[-10, 5, -10]} intensity={2} color="#ff00ff" distance={20} />
          </>
        )}
        
        {sceneData.theme === 'horror' && (
          <>
            <pointLight position={[5, 2, 5]} intensity={1} color="#ff0000" distance={15} />
            <spotLight
              position={[0, 10, 0]}
              angle={0.5}
              penumbra={0.5}
              intensity={0.5}
              color="#ff3333"
              castShadow
            />
          </>
        )}
        
        {/* Warm glow for buildings at night */}
        {!isDayTime && sceneData.objects?.some(obj => obj.type === 'building') && (
          <>
            <pointLight position={[5, 3, 5]} intensity={0.8} color="#ffaa44" distance={15} />
            <pointLight position={[-5, 3, -5]} intensity={0.6} color="#ffcc66" distance={12} />
          </>
        )}
        
        {/* Ground with enhanced material */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshPhysicalMaterial 
            color={
              sceneData.theme === 'forest' || sceneData.theme === 'nature' ? '#2d4a2d' :
              sceneData.theme === 'desert' ? '#c4a35a' :
              sceneData.theme === 'horror' ? '#1a0f0f' :
              sceneData.theme === 'cyberpunk' || sceneData.theme === 'scifi' ? '#1a1a2e' :
              sceneData.theme === 'racing' ? '#333333' :
              sceneData.theme === 'fantasy' ? '#4a3a2a' :
              isDayTime ? '#3a5a3a' : '#1a1a2a'
            }
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
        
        {/* Contact shadows for ambient occlusion feel */}
        <ContactShadows
          position={[0, -0.99, 0]}
          opacity={0.6}
          scale={50}
          blur={2}
          far={10}
        />
        
        {/* Grid helper */}
        <gridHelper 
          args={[200, 50, isDayTime ? '#444444' : '#222244', isDayTime ? '#333333' : '#1a1a2a']} 
          position={[0, -0.9, 0]} 
        />
        
        {/* Particle Effects */}
        <ParticleEffects theme={sceneData.theme} mood={sceneData.mood} isDayTime={isDayTime} />
        
        {/* Rain Effect */}
        <RainEffect enabled={showRain} />
        
        {/* Heat Shimmer */}
        <HeatShimmer enabled={showHeatShimmer} />
        
        {/* Scene Objects */}
        {sceneData.objects?.map((obj, i) => (
          <InteractiveObject 
            key={i} 
            obj={obj} 
            index={i}
            sfxFiles={sfxFiles}
            theme={sceneData.theme}
          />
        ))}
        
        {/* Player with Camera Controller */}
        <PlayerController cameraMode={cameraMode} theme={sceneData.theme} onMouseLockChange={setMouseLocked} />
        
        {/* Camera controller for orbit mode */}
        {cameraMode === 'orbit' && <OrbitCamera />}
        
        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom 
            intensity={sceneData.theme === 'cyberpunk' ? 1.5 : 0.3}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
          />
          <Vignette eskil={false} offset={0.1} darkness={sceneData.theme === 'horror' ? 0.8 : 0.4} />
          <ToneMapping adaptive />
        </EffectComposer>
      </Canvas>
      
      {/* Click to Play overlay — outside Canvas so DOM renders correctly */}
      {!mouseLocked && cameraMode === 'follow' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-black/80 backdrop-blur-md text-white px-8 py-6 rounded-2xl text-center border border-white/10 shadow-2xl">
            <p className="text-2xl font-bold mb-2">🎮 Click to Play</p>
            <p className="text-sm text-slate-400">WASD to move • Mouse to look • Space to jump</p>
          </div>
        </div>
      )}

      {/* Enhanced HUD */}
      <div
        className={`absolute top-2 sm:top-4 left-2 sm:left-4 transition-all duration-700 transform ${
          hudVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
        }`}
      >
        <div className="text-white font-mono text-xs sm:text-sm bg-black/80 backdrop-blur-md p-3 sm:p-5 rounded-lg sm:rounded-xl border border-white/10 shadow-2xl pointer-events-auto min-w-[160px] sm:min-w-[220px] max-w-[200px] sm:max-w-none">
          {/* Scene Title */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
            <span className="text-lg sm:text-2xl">
              {sceneData.theme === 'forest' ? '🌲' :
               sceneData.theme === 'nature' ? '🌿' :
               sceneData.theme === 'city' ? '🏙️' :
               sceneData.theme === 'desert' ? '🏜️' :
               sceneData.theme === 'cyberpunk' ? '🌃' :
               sceneData.theme === 'horror' ? '👻' :
               sceneData.theme === 'space' ? '🚀' :
               sceneData.theme === 'scifi' ? '🛸' :
               sceneData.theme === 'racing' ? '🏎️' :
               sceneData.theme === 'fantasy' ? '⚔️' :
               sceneData.theme === 'adventure' ? '🗺️' :
               sceneData.theme === 'underwater' ? '🐠' : '🎮'}
            </span>
            <div className="min-w-0">
              <div className="font-bold text-purple-400 text-sm sm:text-lg tracking-wide truncate">{sceneData.scene_name}</div>
              <div className="text-[10px] sm:text-xs text-slate-400">{sceneData.theme} • {sceneData.mood}</div>
            </div>
          </div>
          
          {/* Time indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-300 mb-3">
            <span className="text-lg">{isDayTime ? '☀️' : '🌙'}</span>
            <span>{isDayTime ? 'Daytime' : 'Nighttime'}</span>
            {sceneData.theme === 'cyberpunk' && <span className="text-cyan-400 ml-1">⚡ Neon Active</span>}
            {sceneData.theme === 'horror' && <span className="text-red-400 ml-1">⚠️ Dark Zone</span>}
          </div>
          
          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-purple-500/50 to-transparent mb-3" />
          
          {/* Controls info - Hidden on mobile, shown on larger screens */}
          <div className="hidden sm:block space-y-1.5 text-xs text-slate-400 mb-4">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">WASD</kbd>
              <span>Move</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">Mouse</kbd>
              <span>Look (click to lock)</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">Space</kbd>
              <span>Jump</span>
            </div>
          </div>
          
          {/* Mobile controls hint */}
          {isMobile && (
            <div className="sm:hidden text-[10px] text-slate-400 mb-2">
              <p>Tap to look • Use on-screen controls</p>
            </div>
          )}
          
          {/* Controls */}
          <div className="space-y-1.5 sm:space-y-2">
            <button
              onClick={() => setIsDayTime(!isDayTime)}
              className="w-full text-[10px] sm:text-xs bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all transform hover:scale-[1.02] border border-white/5 flex items-center justify-center gap-1.5 sm:gap-2"
            >
              {isDayTime ? '🌙 Night' : '☀️ Day'}
            </button>
            <button
              onClick={() => setCameraMode(cameraMode === 'follow' ? 'orbit' : 'follow')}
              className="w-full text-[10px] sm:text-xs bg-gradient-to-r from-purple-700/80 to-indigo-700/80 hover:from-purple-600/80 hover:to-indigo-600/80 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all transform hover:scale-[1.02] border border-purple-500/20 flex items-center justify-center gap-1.5 sm:gap-2"
            >
              {cameraMode === 'follow' ? '📷 Orbit' : '🎮 Follow'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Compass / Mini-map - Hidden on mobile */}
      <div 
        className={`hidden sm:block absolute top-4 right-4 transition-all duration-700 delay-200 transform ${
          hudVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
        }`}
      >
        <div className="bg-black/80 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-xl">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-slate-600/50" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-800 to-slate-900" />
            {/* Compass needle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
              <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[10px] border-l-transparent border-r-transparent border-b-red-500" />
            </div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-slate-400 font-bold">N</div>
          </div>
        </div>
      </div>
      
      {/* Audio Track Display */}
      {currentlyPlaying && (
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
            <span className="text-[10px] sm:text-xs text-slate-300 truncate max-w-[120px] sm:max-w-none">♫ {currentlyPlaying}</span>
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
            <span className="text-purple-400 font-bold">{sceneData.objects?.length || 0}</span>
            <span className="text-slate-400">objects</span>
          </span>
          <span className="w-px h-3 bg-slate-600" />
          <span className="text-slate-400">Click objects to interact</span>
          {sceneData.theme === 'forest' && <span className="text-yellow-400 text-[10px]">✨ Fireflies active</span>}
          {showRain && <span className="text-blue-400 text-[10px]">🌧️ Rain active</span>}
        </div>
      </div>
      
      {/* Theme indicator */}
      <div 
        className={`absolute bottom-4 right-2 sm:right-4 transition-all duration-700 delay-500 transform ${
          hudVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
        }`}
      >
        <div className="text-[8px] sm:text-[10px] text-slate-500 font-mono">
          SceneForge AI v1.0
        </div>
      </div>
      
      {/* Mobile touch controls overlay */}
      {isMobile && (
        <div className="absolute bottom-24 left-4 right-4 pointer-events-none sm:hidden">
          <div className="flex justify-between items-end">
            {/* D-pad hint */}
            <div className="pointer-events-auto bg-black/60 backdrop-blur-sm p-2 rounded-lg border border-white/10">
              <div className="grid grid-cols-3 gap-1 w-24">
                <div></div>
                <button className="w-7 h-7 bg-slate-700/80 rounded flex items-center justify-center text-white text-xs">↑</button>
                <div></div>
                <button className="w-7 h-7 bg-slate-700/80 rounded flex items-center justify-center text-white text-xs">←</button>
                <button className="w-7 h-7 bg-slate-700/80 rounded flex items-center justify-center text-white text-xs">↓</button>
                <button className="w-7 h-7 bg-slate-700/80 rounded flex items-center justify-center text-white text-xs">→</button>
              </div>
            </div>
            {/* Action buttons */}
            <div className="pointer-events-auto flex gap-2">
              <button className="w-12 h-12 bg-purple-600/80 rounded-full flex items-center justify-center text-white text-xs font-bold">Jump</button>
            </div>
          </div>
        </div>
      )}
      
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

// Enhanced Interactive Object Component
function InteractiveObject({ 
  obj, 
  index,
  sfxFiles,
  theme,
}: { 
  obj: GameRendererProps['sceneData']['objects'][0];
  index: number;
  sfxFiles: Array<{ type: string; name: string; url: string }>;
  theme: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  
  const materialConfig = getMaterialConfig(obj.type, theme);
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
  
  // Enhanced geometry based on object type
  const renderObject = () => {
    switch (obj.type) {
      case 'tree':
        return (
          <group position={obj.position}>
            {/* Trunk */}
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
              <meshPhysicalMaterial color="#4a3728" roughness={0.9} />
            </mesh>
            {/* Leaves - multiple cones for fuller look */}
            <mesh position={[0, 1.5, 0]} castShadow>
              <coneGeometry args={[0.8, 1.5, 8]} />
              <meshPhysicalMaterial 
                color={materialConfig.color} 
                roughness={materialConfig.roughness}
                metalness={materialConfig.metalness}
              />
            </mesh>
            <mesh position={[0, 2.2, 0]} castShadow>
              <coneGeometry args={[0.6, 1.2, 8]} />
              <meshPhysicalMaterial 
                color={materialConfig.color} 
                roughness={materialConfig.roughness}
                metalness={materialConfig.metalness}
              />
            </mesh>
          </group>
        );
      case 'rock':
        return (
          <mesh position={obj.position} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.6, 0]} />
            <meshPhysicalMaterial 
              color={materialConfig.color}
              roughness={materialConfig.roughness}
              metalness={materialConfig.metalness}
              ior={materialConfig.ior}
            />
          </mesh>
        );
      case 'building':
        return (
          <group position={obj.position}>
            {/* Main building */}
            <mesh position={[0, 0.75, 0]} castShadow>
              <boxGeometry args={[1.2, 1.5, 1.2]} />
              <meshPhysicalMaterial 
                color={materialConfig.color}
                roughness={materialConfig.roughness}
                metalness={materialConfig.metalness}
                emissive={materialConfig.emissive || '#000000'}
                emissiveIntensity={materialConfig.emissiveIntensity || 0}
              />
            </mesh>
            {/* Windows - emissive planes */}
            <mesh position={[0, 1, 0.61]}>
              <planeGeometry args={[0.6, 0.4]} />
              <meshBasicMaterial 
                color={theme === 'cyberpunk' ? '#00ffff' : '#ffee88'} 
              />
            </mesh>
            <mesh position={[0, 0.4, 0.61]}>
              <planeGeometry args={[0.6, 0.4]} />
              <meshBasicMaterial 
                color={theme === 'cyberpunk' ? '#00ffff' : '#ffee88'} 
              />
            </mesh>
          </group>
        );
      case 'vehicle':
        return (
          <group position={obj.position}>
            {/* Body */}
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[1.2, 0.5, 2]} />
              <meshPhysicalMaterial 
                color={materialConfig.color}
                roughness={materialConfig.roughness}
                metalness={materialConfig.metalness}
                clearcoat={materialConfig.clearcoat}
                clearcoatRoughness={materialConfig.clearcoatRoughness}
                emissive={materialConfig.emissive}
                emissiveIntensity={materialConfig.emissiveIntensity}
              />
            </mesh>
            {/* Cabin */}
            <mesh position={[0, 0.7, -0.2]} castShadow>
              <boxGeometry args={[0.9, 0.4, 0.8]} />
              <meshPhysicalMaterial 
                color="#1a1a2e"
                roughness={0.1}
                metalness={0.9}
              />
            </mesh>
            {/* Wheels */}
            {[[-0.6, 0.2, 0.7] as [number, number, number], [0.6, 0.2, 0.7] as [number, number, number], [-0.6, 0.2, -0.7] as [number, number, number], [0.6, 0.2, -0.7] as [number, number, number]].map((pos, i) => (
              <mesh key={i} position={pos} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
            ))}
          </group>
        );
      case 'character':
        return (
          <group position={obj.position}>
            {/* Body */}
            <mesh position={[0, 0.6, 0]} castShadow>
              <capsuleGeometry args={[0.25, 0.8, 4, 8]} />
              <meshPhysicalMaterial 
                color={materialConfig.color}
                roughness={materialConfig.roughness}
                metalness={materialConfig.metalness}
              />
            </mesh>
            {/* Head */}
            <mesh position={[0, 1.3, 0]} castShadow>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color="#ffdbac" />
            </mesh>
            {/* Arms */}
            <mesh position={[-0.35, 0.7, 0]} castShadow>
              <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
              <meshPhysicalMaterial color={materialConfig.color} />
            </mesh>
            <mesh position={[0.35, 0.7, 0]} castShadow>
              <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
              <meshPhysicalMaterial color={materialConfig.color} />
            </mesh>
          </group>
        );
      default:
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
            <boxGeometry args={[obj.scale, obj.scale, obj.scale]} />
            <meshPhysicalMaterial 
              color={hovered || clicked ? hoverColor : materialConfig.color}
              emissive={clicked ? materialConfig.color : '#000000'}
              emissiveIntensity={clicked ? 0.5 : 0}
              roughness={materialConfig.roughness}
              metalness={materialConfig.metalness}
            />
          </mesh>
        );
    }
  };

  // For grouped objects (tree, building, vehicle, character), wrap with Float and interaction handlers
  if (['tree', 'building', 'vehicle', 'character'].includes(obj.type)) {
    return (
      <Float
        speed={2}
        rotationIntensity={hovered ? 0.3 : 0.1}
        floatIntensity={hovered ? 0.5 : 0.2}
      >
        <group
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={handleClick}
        >
          {renderObject()}
        </group>
        {clicked && (
          <pointLight
            position={[obj.position[0], obj.position[1] + 2, obj.position[2]]}
            intensity={2}
            color={materialConfig.color}
            distance={5}
            decay={2}
          />
        )}
      </Float>
    );
  }

  return renderObject();
}

// Enhanced Player Controller Component
function PlayerController({ cameraMode, theme, onMouseLockChange }: { cameraMode: 'follow' | 'orbit'; theme: string; onMouseLockChange?: (locked: boolean) => void }) {
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
        x: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev.x - e.movementY * 0.002)),
        y: prev.y - e.movementX * 0.002,
      }));
    };
    
    const handleClick = () => {
      if (!mouseLocked) {
        document.body.requestPointerLock();
      }
    };
    
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === document.body;
      setMouseLocked(locked);
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
      
      // Apply camera rotation for look
      const lookTarget = meshRef.current.position.clone();
      lookTarget.y += 1;
      camera.lookAt(lookTarget);
    }
  });

  const playerColor = theme === 'cyberpunk' ? '#00ffff' : theme === 'horror' ? '#ff4444' : '#6366f1';
  
  return (
    <>
      <Float speed={3} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh ref={meshRef} position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshPhysicalMaterial 
            color={playerColor} 
            emissive={playerColor}
            emissiveIntensity={0.3}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      </Float>
      
      {/* Spotlight following player */}
      <spotLight
        position={[meshRef.current?.position.x || 0, 10, meshRef.current?.position.z || 0]}
        target={meshRef.current || undefined}
        angle={0.5}
        penumbra={0.5}
        intensity={0.8}
        color="#ffffff"
        distance={20}
        castShadow
      />
      
    </>
  );
}

// Orbit Camera Component
function OrbitCamera() {
  const { camera } = useThree();
  const [rotation, setRotation] = useState(0);
  
  useFrame(() => {
    setRotation(r => r + 0.005);
    const radius = 20;
    camera.position.x = Math.sin(rotation) * radius;
    camera.position.z = Math.cos(rotation) * radius;
    camera.position.y = 10 + Math.sin(rotation * 0.5) * 2;
    camera.lookAt(0, 2, 0);
  });
  
  return null;
}

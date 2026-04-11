'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const GameRenderer = dynamic(() => import('@/components/GameRenderer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-black flex items-center justify-center text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Loading scene...</p>
      </div>
    </div>
  ),
});

interface SceneData {
  id: string;
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

export default function PlayScenePage() {
  const params = useParams();
  const id = params.id as string;
  
  const [scene, setScene] = useState<SceneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/get-scene?id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setScene(data);
        } else {
          setError(data.error || 'Failed to load scene');
        }
      })
      .catch(err => {
        setError(String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading scene...</p>
        </div>
      </div>
    );
  }

  if (error || !scene) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Scene Not Found</h1>
          <p className="text-gray-400">{error || 'This scene does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <GameRenderer 
      sceneData={scene.sceneData}
      audioFiles={scene.audioFiles}
      skyboxUrl={scene.skyboxUrl}
    />
  );
}

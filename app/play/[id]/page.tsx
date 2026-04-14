'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  prompt: string;
  createdAt: string;
  narrationUrl?: string;
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

interface SimilarScene {
  id: string;
  score: number;
  scene_name?: string;
  theme?: string;
  mood?: string;
}

export default function PlayScenePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [scene, setScene] = useState<SceneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similarScenes, setSimilarScenes] = useState<SimilarScene[]>([]);
  const [narrationUrl, setNarrationUrl] = useState<string | null>(null);
  const [narrationLoading, setNarrationLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetchScene();
  }, [id]);

  const fetchScene = async () => {
    try {
      const res = await fetch(`/api/get-scene?id=${id}`);
      const data = await res.json();
      
      if (data.success) {
        setScene(data);
        // Use pre-generated narration if available
        if (data.narrationUrl) {
          setNarrationUrl(data.narrationUrl);
        }
        // Fetch similar scenes
        fetchSimilarScenes(id);
      } else {
        setError(data.error || 'Failed to load scene');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilarScenes = async (sceneId: string) => {
    try {
      const res = await fetch(`/api/similar-scenes?id=${sceneId}`);
      const data = await res.json();
      
      if (data.success) {
        setSimilarScenes(data.similarScenes);
      }
    } catch (err) {
      console.error('Failed to load similar scenes:', err);
    }
  };

  const generateNarration = async () => {
    if (!scene) return;
    
    setNarrationLoading(true);
    try {
      const narrationText = `Welcome to ${scene.sceneData.scene_name}. ${scene.prompt}`;
      
      const res = await fetch('/api/generate-narration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: narrationText,
          sceneId: scene.id 
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setNarrationUrl(data.narrationUrl);
      } else {
        alert('Failed to generate narration: ' + data.error);
      }
    } catch (err) {
      alert('Error generating narration: ' + String(err));
    } finally {
      setNarrationLoading(false);
    }
  };

  const handleRemix = () => {
    if (!scene) return;
    
    // Store the prompt in localStorage and redirect to home
    localStorage.setItem('remixPrompt', scene.prompt);
    router.push('/');
  };

  const shareScene = async () => {
    const url = `${window.location.origin}/play/${id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: scene?.sceneData.scene_name || 'SceneForge AI Scene',
          text: scene?.prompt,
          url: url,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const exportScene = () => {
    if (!scene) return;
    
    // Trigger download
    const exportUrl = `/api/export-scene?id=${id}`;
    const link = document.createElement('a');
    link.href = exportUrl;
    link.download = `${scene.sceneData.scene_name.replace(/[^a-zA-Z0-9]/g, '_')}_${id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <p className="text-gray-400 mb-4">{error || 'This scene does not exist.'}</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <GameRenderer
        sceneData={scene.sceneData}
        audioFiles={scene.audioFiles}
        skyboxUrl={scene.skyboxUrl}
      />

      {/* Action toolbar — bottom-right, clear of GameRenderer's HUD positions */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={shareScene}
            className="text-xs bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
          >
            📤 Share
          </button>
          <button
            onClick={handleRemix}
            className="text-xs bg-purple-700/80 backdrop-blur-sm hover:bg-purple-600/80 text-white px-3 py-1.5 rounded-lg border border-purple-500/20 transition-colors"
          >
            🎨 Remix
          </button>
          <button
            onClick={exportScene}
            className="text-xs bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
          >
            ⬇️ Export
          </button>
        </div>

        {/* Narration */}
        <div className="pointer-events-auto">
          {!narrationUrl ? (
            <button
              onClick={generateNarration}
              disabled={narrationLoading}
              className="text-xs bg-black/70 backdrop-blur-sm hover:bg-black/90 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors flex items-center gap-1.5"
            >
              {narrationLoading ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating voice...
                </>
              ) : <>🎙️ Voice narration</>}
            </button>
          ) : (
            <audio src={narrationUrl} controls className="h-8 rounded-lg" />
          )}
        </div>
      </div>

      {/* Similar Scenes — top-right but below the compass (mt pushes it down) */}
      {similarScenes.length > 0 && (
        <div className="absolute top-28 right-4 pointer-events-auto">
          <div className="bg-black/70 backdrop-blur-sm text-white p-3 rounded-lg max-w-[180px] border border-white/10">
            <h3 className="text-xs font-semibold text-purple-400 mb-2">🔍 Similar</h3>
            <div className="space-y-1.5">
              {similarScenes.slice(0, 3).map((similar) => (
                <Link
                  key={similar.id}
                  href={`/play/${similar.id}`}
                  className="block text-[10px] bg-slate-800/80 hover:bg-slate-700 p-1.5 rounded transition-colors"
                >
                  <div className="font-medium truncate">{similar.scene_name || 'Untitled'}</div>
                  <div className="text-slate-400">{((1 - (similar.score || 0)) * 100).toFixed(0)}% match</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Back Link — bottom-left, but clear of GameRenderer's audio track (which is bottom-16 / bottom-20) */}
      <Link
        href="/"
        className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 text-xs rounded-lg hover:bg-black/80 transition-colors border border-white/10"
      >
        ← Generator
      </Link>

      <Link
        href="/gallery"
        className="absolute bottom-4 left-28 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 text-xs rounded-lg hover:bg-black/80 transition-colors border border-white/10"
      >
        🖼️ Gallery
      </Link>
    </div>
  );
}

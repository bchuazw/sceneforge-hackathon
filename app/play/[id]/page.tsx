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
  const [showJson, setShowJson] = useState(false);

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

  const copySceneJson = () => {
    if (!scene) return;
    
    const json = JSON.stringify({
      prompt: scene.prompt,
      sceneData: scene.sceneData,
    }, null, 2);
    
    navigator.clipboard.writeText(json);
    alert('Scene JSON copied to clipboard!');
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
      
      {/* Scene Info Panel */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-black/70 backdrop-blur-sm text-white p-4 rounded-lg pointer-events-auto max-w-sm">
          <h1 className="font-bold text-purple-400 text-lg">{scene.sceneData.scene_name}</h1>
          <p className="text-sm text-slate-300 mt-1">{scene.sceneData.theme} • {scene.sceneData.mood}</p>
          <p className="text-xs text-slate-400 mt-2 line-clamp-2">{scene.prompt}</p>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={shareScene}
              className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
            >
              📤 Share
            </button>
            <button
              onClick={handleRemix}
              className="text-xs bg-purple-700 hover:bg-purple-600 px-3 py-1.5 rounded transition-colors"
            >
              🎨 Remix
            </button>
            <button
              onClick={() => setShowJson(!showJson)}
              className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
            >
              {showJson ? '📋 Hide JSON' : '📋 Show JSON'}
            </button>
            <button
              onClick={exportScene}
              className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded transition-colors"
              title="Download as standalone HTML"
            >
              ⬇️ Export
            </button>
          </div>
          
          {/* Narration Button */}
          {!narrationUrl ? (
            <button
              onClick={generateNarration}
              disabled={narrationLoading}
              className="mt-3 w-full text-xs bg-green-700 hover:bg-green-600 disabled:bg-slate-700 px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-2"
            >
              {narrationLoading ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating Voice...
                </>
              ) : (
                <>🎙️ Add Voice Narration</>
              )}
            </button>
          ) : (
            <div className="mt-3">
              <audio src={narrationUrl} controls className="w-full h-8" />
            </div>
          )}
          
          {/* JSON Preview */}
          {showJson && (
            <div className="mt-3">
              <pre className="text-xs bg-slate-900 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify({ prompt: scene.prompt, sceneData: scene.sceneData }, null, 2)}
              </pre>
              <button
                onClick={copySceneJson}
                className="mt-2 text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors w-full"
              >
                📋 Copy JSON
              </button>
            </div>
          )}
        </div>
        
        {/* Similar Scenes */}
        {similarScenes.length > 0 && (
          <div className="bg-black/70 backdrop-blur-sm text-white p-4 rounded-lg pointer-events-auto max-w-xs">
            <h3 className="text-sm font-semibold text-purple-400 mb-2">🔍 Similar Scenes</h3>
            <div className="space-y-2">
              {similarScenes.map((similar) => (
                <Link
                  key={similar.id}
                  href={`/play/${similar.id}`}
                  className="block text-xs bg-slate-800 hover:bg-slate-700 p-2 rounded transition-colors"
                >
                  <div className="font-medium">{similar.scene_name || 'Untitled Scene'}</div>
                  <div className="text-slate-400">
                    {similar.theme} • {similar.mood}
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    Match: {((1 - (similar.score || 0)) * 100).toFixed(0)}%
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Back Link */}
      <Link 
        href="/"
        className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-black/80 transition-colors pointer-events-auto"
      >
        ← Back to Generator
      </Link>
      
      <Link 
        href="/gallery"
        className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-black/80 transition-colors pointer-events-auto"
      >
        🖼️ Gallery
      </Link>
    </div>
  );
}

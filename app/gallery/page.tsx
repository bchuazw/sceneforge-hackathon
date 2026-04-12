'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Scene {
  id: string;
  createdAt: string;
  prompt: string;
  sceneName: string;
  theme: string;
  mood: string;
  time: string;
  objectCount: number;
  hasSkybox: boolean;
  audioCount: number;
  url: string;
}

const themeEmojis: Record<string, string> = {
  adventure: '🏔️',
  horror: '👻',
  racing: '🏎️',
  scifi: '🚀',
  fantasy: '🐉',
  nature: '🌲',
  unknown: '🎮',
};

const moodEmojis: Record<string, string> = {
  exciting: '⚡',
  creepy: '🌑',
  peaceful: '😌',
  mysterious: '🔮',
  epic: '⚔️',
  unknown: '✨',
};

export default function GalleryPage() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');

  useEffect(() => {
    fetchScenes();
  }, []);

  const fetchScenes = async () => {
    try {
      const res = await fetch('/api/list-scenes');
      const data = await res.json();
      
      if (data.success) {
        setScenes(data.scenes);
      } else {
        setError(data.error || 'Failed to load scenes');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredScenes = selectedTheme === 'all' 
    ? scenes 
    : scenes.filter(s => s.theme === selectedTheme);

  const themes = ['all', ...Array.from(new Set(scenes.map(s => s.theme).filter(Boolean)))];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              ← Back
            </Link>
            <h1 className="text-3xl font-bold">Scene Gallery</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Scene Gallery
          </h1>
        </div>
        
        <p className="text-slate-400 mb-6">
          Explore {scenes.length} AI-generated game scenes
        </p>

        {/* Theme Filter */}
        {themes.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {themes.map(theme => (
              <button
                key={theme}
                onClick={() => setSelectedTheme(theme)}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  selectedTheme === theme
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                }`}
              >
                {theme === 'all' ? 'All Themes' : `${themeEmojis[theme] || '🎮'} ${theme}`}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 mb-6">
            Error: {error}
          </div>
        )}

        {filteredScenes.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/30 rounded-xl">
            <div className="text-4xl mb-4">🎮</div>
            <p className="text-slate-400">
              {scenes.length === 0 
                ? "No scenes yet. Generate your first scene!" 
                : "No scenes match this filter."}
            </p>
            {scenes.length === 0 && (
              <Link 
                href="/"
                className="inline-block mt-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-6 rounded-lg transition-all"
              >
                ✨ Generate Scene
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScenes.map(scene => (
              <div 
                key={scene.id}
                className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden hover:border-purple-500/50 transition-all group"
              >
                {/* Scene Thumbnail */}
                <div className="h-32 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden">
                  <div className="text-6xl opacity-50 group-hover:scale-110 transition-transform">
                    {themeEmojis[scene.theme] || '🎮'}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {scene.hasSkybox && (
                      <span className="text-xs bg-slate-900/70 px-2 py-1 rounded" title="Has skybox">
                        🖼️
                      </span>
                    )}
                    {scene.audioCount > 0 && (
                      <span className="text-xs bg-slate-900/70 px-2 py-1 rounded" title={`${scene.audioCount} audio files`}>
                        🎵
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent h-12" />
                </div>
                
                {/* Scene Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1 truncate" title={scene.sceneName}>
                    {scene.sceneName}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                    <span>{themeEmojis[scene.theme] || '🎮'} {scene.theme}</span>
                    <span>•</span>
                    <span>{moodEmojis[scene.mood] || '✨'} {scene.mood}</span>
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2" title={scene.prompt}>
                    {scene.prompt}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                    <span>{scene.objectCount} objects</span>
                    <span>{formatDate(scene.createdAt)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link
                      href={scene.url}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-center text-sm font-semibold py-2 rounded-lg transition-all"
                    >
                      🎮 Play
                    </Link>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${scene.url}`);
                        alert('Link copied!');
                      }}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg transition-all"
                      title="Copy link"
                    >
                      📋
                    </button>
                    <a
                      href={`/api/export-scene?id=${scene.id}`}
                      className="bg-green-700 hover:bg-green-600 text-white px-3 rounded-lg transition-all flex items-center"
                      title="Download as standalone HTML"
                      download
                    >
                      ⬇️
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

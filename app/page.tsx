'use client';

import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const generateScene = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/build-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to generate scene');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
          SceneForge AI
        </h1>
        <p className="text-slate-400 mb-8 text-lg">
          ElevenLabs × turbopuffer Hackathon
        </p>
        
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Describe your scene
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Dark forest at night with a creepy cabin and wolf howls..."
            className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
          />
          
          <button
            onClick={generateScene}
            disabled={loading || !prompt.trim()}
            className="mt-4 w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating Scene...
              </span>
            ) : (
              '✨ Generate Scene'
            )}
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            Error: {error}
          </div>
        )}
        
        {result && (
          <div className="mt-6 bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-green-400">✓ Scene Generated!</h2>
            
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-400">Scene ID:</span> {result.sceneId}</p>
              <p><span className="text-slate-400">Audio Files:</span> {result.generated.audioFiles}</p>
              <p><span className="text-slate-400">Skybox:</span> {result.generated.skybox ? '✓' : '✗'}</p>
            </div>
            
            {result.generated.note && (
              <p className="mt-3 text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded">
                ⚠ {result.generated.note}
              </p>
            )}
            
            <a
              href={result.url}
              className="mt-4 inline-block bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-6 rounded-lg transition-all"
            >
              🎮 Play Scene
            </a>
          </div>
        )}
        
        <div className="mt-12 grid grid-cols-3 gap-4 text-center text-sm text-slate-500">
          <div className="p-4 bg-slate-800/30 rounded-lg">
            <div className="text-2xl mb-1">🎵</div>
            ElevenLabs Audio
          </div>
          <div className="p-4 bg-slate-800/30 rounded-lg">
            <div className="text-2xl mb-1">🔍</div>
            turbopuffer Search
          </div>
          <div className="p-4 bg-slate-800/30 rounded-lg">
            <div className="text-2xl mb-1">🎮</div>
            Three.js Game
          </div>
        </div>
      </div>
    </main>
  );
}
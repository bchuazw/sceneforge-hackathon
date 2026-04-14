'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for remix prompt on mount
  useEffect(() => {
    const remixPrompt = localStorage.getItem('remixPrompt');
    if (remixPrompt) {
      setPrompt(remixPrompt + ' (remixed)');
      localStorage.removeItem('remixPrompt');
    }
  }, []);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const generateScene = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);
    
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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-4">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
              SceneForge AI
            </h1>
            <p className="text-slate-400 mb-6 sm:mb-8 text-base sm:text-lg">
              ElevenLabs × turbopuffer Hackathon
            </p>
          </div>
          <Link
            href="/gallery"
            className="w-full sm:w-auto bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 px-4 py-2 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
          >
            <span>🖼️</span>
            Gallery
          </Link>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700">
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Describe your scene
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Dark forest at night with a creepy cabin and wolf howls..."
            className="w-full h-28 sm:h-32 bg-slate-900 border border-slate-600 rounded-lg p-3 sm:p-4 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none text-sm sm:text-base"
          />
          
          <button
            onClick={generateScene}
            disabled={loading || !prompt.trim()}
            className="mt-4 w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all"
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
        
        {/* Loading State */}
        {loading && (
          <div className="mt-4 bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-purple-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-slate-300 animate-pulse">Building your world...</p>
              <div className="text-xs text-slate-500 space-y-1 text-left">
                <p>🧠 Parsing scene with GPT-4o...</p>
                <p>🔍 Searching similar scenes via turbopuffer...</p>
                <p>🎵 Composing music with ElevenLabs...</p>
                <p>🔊 Generating sound effects...</p>
                <p>🌄 Rendering skybox...</p>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            Error: {error}
          </div>
        )}
        
        {result && (
          <div className="mt-6 bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-green-400">✓ Scene Generated!</h2>
            
            <div className="space-y-2 text-sm">
              <p><span className="text-slate-400">Scene:</span> {result.sceneData?.scene_name}</p>
              <p><span className="text-slate-400">Theme:</span> {result.sceneData?.theme} • {result.sceneData?.mood}</p>
              <p>
                <span className="text-slate-400">Audio Files:</span>{' '}
                {result.generated.audioFiles}
                {result.generated.audioStatus === 'quota_exceeded' && (
                  <span className="ml-2 text-yellow-400 text-xs">⚠ ElevenLabs quota exhausted</span>
                )}
              </p>
              <p><span className="text-slate-400">Similar Scenes Found:</span> {result.generated.similarScenesFound}</p>
              <p><span className="text-slate-400">Skybox:</span> {result.generated.skybox ? '✓' : '✗'}</p>
            </div>
            
            {result.generated.note && (
              <p className="mt-3 text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded">
                ⚠ {result.generated.note}
              </p>
            )}
            
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <a
                href={result.url}
                className="w-full sm:w-auto text-center bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-6 rounded-lg transition-all"
              >
                🎮 Play Scene
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${result.url}`);
                  alert('Link copied to clipboard!');
                }}
                className="w-full sm:w-auto bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
              >
                📋 Copy Link
              </button>
            </div>
          </div>
        )}
        
        {/* Example Prompts */}
        <div className="mt-12">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Try these examples:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'NASCAR racing track at sunset with grandstands, pit crews, and racing cars',
              'Futuristic sci-fi shooter arena with cover barriers, energy weapons, and glowing floors',
              'Cyberpunk city street with neon signs, rain-soaked roads, and flying cars at night',
              'Ancient fantasy forest with mystical ruins, giant mushrooms, and wandering spirits',
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => setPrompt(example)}
                className="text-left text-xs bg-slate-800/30 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 p-3 rounded-lg transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center text-sm text-slate-500">
          <div className="p-3 sm:p-4 bg-slate-800/30 rounded-lg">
            <div className="text-2xl mb-1">🎵</div>
            ElevenLabs Audio
          </div>
          <div className="p-3 sm:p-4 bg-slate-800/30 rounded-lg">
            <div className="text-2xl mb-1">🔍</div>
            turbopuffer Search
          </div>
          <div className="p-3 sm:p-4 bg-slate-800/30 rounded-lg">
            <div className="text-2xl mb-1">🎮</div>
            Three.js Game
          </div>
        </div>
      </div>
    </main>
  );
}

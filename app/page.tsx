'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface GenerationStep {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

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
  const [steps, setSteps] = useState<GenerationStep[]>([
    { name: 'Parsing scene description', status: 'pending' },
    { name: 'Searching similar scenes', status: 'pending' },
    { name: 'Generating audio', status: 'pending' },
    { name: 'Creating skybox', status: 'pending' },
    { name: 'Finalizing scene', status: 'pending' },
  ]);
  const [currentStep, setCurrentStep] = useState(0);

  const updateStep = (index: number, status: GenerationStep['status']) => {
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], status };
      return newSteps;
    });
    if (status === 'active') {
      setCurrentStep(index);
    }
  };

  const resetSteps = () => {
    setSteps([
      { name: 'Parsing scene description', status: 'pending' },
      { name: 'Searching similar scenes', status: 'pending' },
      { name: 'Generating audio', status: 'pending' },
      { name: 'Creating skybox', status: 'pending' },
      { name: 'Finalizing scene', status: 'pending' },
    ]);
    setCurrentStep(0);
  };

  const generateScene = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);
    resetSteps();
    
    try {
      // Simulate step progression for better UX
      updateStep(0, 'active');
      
      const res = await fetch('/api/build-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Mark all steps as completed
        steps.forEach((_, i) => updateStep(i, 'completed'));
        setResult(data);
      } else {
        updateStep(currentStep, 'error');
        setError(data.error || 'Failed to generate scene');
      }
    } catch (err) {
      updateStep(currentStep, 'error');
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (status: GenerationStep['status']) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'active':
        return '●';
      case 'error':
        return '✗';
      default:
        return '○';
    }
  };

  const getStepColor = (status: GenerationStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'active':
        return 'text-purple-400 animate-pulse';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-slate-500';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
              SceneForge AI
            </h1>
            <p className="text-slate-400 mb-8 text-lg">
              ElevenLabs × turbopuffer Hackathon
            </p>
          </div>
          <Link 
            href="/gallery"
            className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 px-4 py-2 rounded-lg transition-all text-sm flex items-center gap-2"
          >
            <span>🖼️</span>
            Gallery
          </Link>
        </div>
        
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
        
        {/* Loading Progress */}
        {loading && (
          <div className="mt-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Generation Progress</h3>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className={`text-lg ${getStepColor(step.status)}`}>
                    {getStepIcon(step.status)}
                  </span>
                  <span className={`text-sm ${
                    step.status === 'active' ? 'text-white' : 
                    step.status === 'completed' ? 'text-slate-300' : 
                    step.status === 'error' ? 'text-red-300' :
                    'text-slate-500'
                  }`}>
                    {step.name}
                  </span>
                  {step.status === 'active' && (
                    <span className="ml-auto">
                      <svg className="animate-spin h-4 w-4 text-purple-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </span>
                  )}
                </div>
              ))}
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
              <p><span className="text-slate-400">Audio Files:</span> {result.generated.audioFiles}</p>
              <p><span className="text-slate-400">Similar Scenes Found:</span> {result.generated.similarScenesFound}</p>
              <p><span className="text-slate-400">Skybox:</span> {result.generated.skybox ? '✓' : '✗'}</p>
            </div>
            
            {result.generated.note && (
              <p className="mt-3 text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded">
                ⚠ {result.generated.note}
              </p>
            )}
            
            <div className="mt-4 flex gap-3">
              <a
                href={result.url}
                className="inline-block bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-6 rounded-lg transition-all"
              >
                🎮 Play Scene
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${result.url}`);
                  alert('Link copied to clipboard!');
                }}
                className="inline-block bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
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
              'A peaceful Japanese garden with cherry blossoms and a koi pond at sunset',
              'Cyberpunk city street with neon signs, rain, and flying cars at night',
              'Medieval castle courtyard with torches and knights preparing for battle',
              'Alien planet with purple crystals, floating rocks, and two moons',
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

'use client';

import { useState } from 'react';

interface AIInputProps {
  onSubmit: (prompt: string) => Promise<void>;
  loading: boolean;
}

export default function AIInput({ onSubmit, loading }: AIInputProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    const text = prompt.trim();
    setPrompt('');
    await onSubmit(text);
  };

  const setSuggestion = (text: string) => {
    setPrompt(text);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="ai-prompt-input" className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Ask LifeOS Assistant
        </label>
        
        <div className="relative flex items-center">
          <input
            id="ai-prompt-input"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            placeholder="What do you need to remember? (e.g., Dentist Friday at 3 PM, Buy groceries tomorrow...)"
            className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm md:text-base pr-32 transition shadow-inner disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="absolute right-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium text-xs md:text-sm text-white transition shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Thinking...
              </>
            ) : (
              'Ask LifeOS'
            )}
          </button>
        </div>
      </form>

      <div className="mt-3.5 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-500 font-medium">Try asking:</span>
        <button
          onClick={() => setSuggestion('Dentist appointment Friday at 3 PM. Remind me one hour before.')}
          className="text-[11px] px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
        >
          📅 Dentist Friday 3 PM
        </button>
        <button
          onClick={() => setSuggestion('Buy groceries tomorrow.')}
          className="text-[11px] px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
        >
          ✅ Buy groceries tomorrow
        </button>
        <button
          onClick={() => setSuggestion('My apartment WiFi password is XXXXX.')}
          className="text-[11px] px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
        >
          📝 WiFi password
        </button>
      </div>
    </div>
  );
}

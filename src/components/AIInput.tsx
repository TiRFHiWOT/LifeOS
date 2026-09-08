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
    <div className="relative group w-full">
      {/* Ambient background glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition duration-500"></div>

      <div className="relative glass-panel rounded-2xl p-5 sm:p-6 shadow-2xl overflow-hidden border border-white/10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <label htmlFor="ai-prompt-input" className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 ai-pulse-ring"></span>
              AI Command Terminal
            </label>
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              Powered by Gemini AI
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              id="ai-prompt-input"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              placeholder="Tell LifeOS what to do... (e.g. 'Dentist appointment Friday at 3 PM' or 'Remind me to call Mom tomorrow')"
              className="w-full px-4 sm:px-5 py-4 rounded-xl glass-input text-slate-100 placeholder-slate-400/80 text-sm sm:text-base pr-32 transition-all duration-200 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="absolute right-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 font-semibold text-xs sm:text-sm text-white transition-all duration-200 shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 border border-white/10"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Execute</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium">Quick Prompts:</span>
          <button
            type="button"
            onClick={() => setSuggestion('Dentist appointment Friday at 3 PM. Remind me one hour before.')}
            className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] hover:border-indigo-500/30 transition-all duration-200 flex items-center gap-1.5"
          >
            <span>📅</span> Dentist Friday 3 PM
          </button>
          <button
            type="button"
            onClick={() => setSuggestion('Buy groceries tomorrow.')}
            className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] hover:border-emerald-500/30 transition-all duration-200 flex items-center gap-1.5"
          >
            <span>✅</span> Buy groceries tomorrow
          </button>
          <button
            type="button"
            onClick={() => setSuggestion('My apartment WiFi password is GuestWifi2026.')}
            className="text-[11px] px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] hover:border-purple-500/30 transition-all duration-200 flex items-center gap-1.5"
          >
            <span>📝</span> WiFi password note
          </button>
        </div>
      </div>
    </div>
  );
}

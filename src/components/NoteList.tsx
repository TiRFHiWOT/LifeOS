'use client';

import { useState } from 'react';
import { NoteItem } from '@/types';

interface NoteListProps {
  notes: NoteItem[];
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function NoteList({ notes, onDelete, loading }: NoteListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 glass-panel rounded-xl animate-pulse border border-white/5"></div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl border border-white/5">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-300">No notes saved</p>
        <p className="text-xs text-slate-500 mt-1">Ask LifeOS to save information (e.g. &quot;My apartment WiFi password is GuestWifi2026&quot;).</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {notes.map((note) => (
        <div
          key={note.id}
          className="p-4 sm:p-5 rounded-xl glass-panel glass-panel-hover border border-white/10 hover:border-purple-500/30 transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                <h4 className="text-sm font-semibold text-slate-100 truncate">{note.title}</h4>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopy(note.id, note.content)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-200"
                  title="Copy note content"
                >
                  {copiedId === note.id ? (
                    <span className="text-[10px] text-emerald-400 font-bold px-1">Copied!</span>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(note.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  title="Delete Note"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-200 whitespace-pre-wrap font-mono bg-slate-950/70 p-3 rounded-lg border border-white/5 leading-relaxed">
              {note.content}
            </p>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 font-mono text-right flex items-center justify-end gap-1">
            <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Saved {new Date(note.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

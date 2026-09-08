'use client';

import { NoteItem } from '@/types';

interface NoteListProps {
  notes: NoteItem[];
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function NoteList({ notes, onDelete, loading }: NoteListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800"></div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
        <p className="text-sm text-slate-400">No notes saved.</p>
        <p className="text-xs text-slate-500 mt-1">Ask LifeOS to save information (e.g., &quot;My WiFi password is X&quot;).</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {notes.map((note) => (
        <div
          key={note.id}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="text-sm font-semibold text-slate-100 truncate">{note.title}</h4>
              <button
                onClick={() => onDelete(note.id)}
                className="text-xs text-slate-500 hover:text-red-400 transition"
                title="Delete Note"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-950/60 p-2.5 rounded-lg border border-slate-900 leading-relaxed">
              {note.content}
            </p>
          </div>
          <div className="mt-3 text-[10px] text-slate-500 text-right">
            Saved {new Date(note.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

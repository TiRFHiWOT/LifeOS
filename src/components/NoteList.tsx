'use client';

import { useState } from 'react';
import { NoteItem } from '@/types';
import { FileText, Copy, Trash2, Clock, Check } from 'lucide-react';

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
          <FileText className="w-5 h-5 text-purple-400" />
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
                <FileText className="w-4 h-4 text-purple-400" />
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
                    <span className="text-[10px] text-emerald-400 font-bold px-1 flex items-center gap-0.5">
                      <Check className="w-3 h-3" />
                      Copied!
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(note.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  title="Delete Note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-200 whitespace-pre-wrap font-mono bg-slate-950/70 p-3 rounded-lg border border-white/5 leading-relaxed">
              {note.content}
            </p>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 font-mono text-right flex items-center justify-end gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            Saved {new Date(note.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

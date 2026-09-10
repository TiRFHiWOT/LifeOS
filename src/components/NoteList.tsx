'use client';

import { useState } from 'react';
import { NoteItem } from '@/types';
import { FileText, Copy, Trash2, Clock, Check, X, Maximize2 } from 'lucide-react';

interface NoteListProps {
  notes: NoteItem[];
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function NoteList({ notes, onDelete, loading }: NoteListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  const handleCopy = (id: string, text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await onDelete(id);
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-52 glass-panel rounded-xl animate-pulse border border-white/5"></div>
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
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {notes.map((note) => {
          const isLongContent = note.content.length > 120 || note.content.includes('\n');

          return (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className="h-52 p-4 sm:p-5 rounded-xl glass-panel glass-panel-hover border border-white/10 hover:border-purple-500/30 transition-all duration-200 flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                    <h4 className="text-sm font-semibold text-slate-100 truncate">{note.title}</h4>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleCopy(note.id, note.content, e)}
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
                      onClick={(e) => handleDelete(note.id, e)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <p className="text-xs text-slate-300 font-mono bg-slate-950/70 p-3 rounded-lg border border-white/5 leading-relaxed line-clamp-3 overflow-hidden text-ellipsis max-h-[82px] whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
                {isLongContent ? (
                  <span className="text-purple-400 group-hover:underline flex items-center gap-1 font-sans text-[11px] font-medium">
                    Read full note
                    <Maximize2 className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Click to view</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedNote && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="max-w-2xl w-full max-h-[85vh] glass-panel bg-slate-900/95 border border-white/15 rounded-2xl p-5 sm:p-6 flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100 truncate">{selectedNote.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNote(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-all duration-200"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 flex-1 overflow-y-auto max-h-[55vh] custom-scrollbar">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 font-mono text-xs sm:text-sm leading-relaxed text-slate-200 whitespace-pre-wrap select-text">
                {selectedNote.content}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="text-slate-400 font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Saved on {new Date(selectedNote.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(selectedNote.id, selectedNote.content)}
                  className="px-3.5 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition-all duration-200 flex items-center gap-1.5 font-medium"
                >
                  {copiedId === selectedNote.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Note</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedNote.id)}
                  className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all duration-200 flex items-center gap-1.5 font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

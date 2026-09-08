'use client';

import { useState } from 'react';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export default function QuickCreateModal({ isOpen, onClose, onSuccess }: QuickCreateModalProps) {
  const [type, setType] = useState<'task' | 'event' | 'note'>('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (type === 'task') {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            due_at: dueAt ? new Date(dueAt).toISOString() : null,
            completed: false,
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create task');
      } else if (type === 'event') {
        if (!startAt || !endAt) throw new Error('Start time and end time are required');
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            start_at: new Date(startAt).toISOString(),
            end_at: new Date(endAt).toISOString(),
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create event');
      } else if (type === 'note') {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create note');
      }

      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16]/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative glass-panel rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 border border-white/10 overflow-hidden">
        {/* Glow backdrop accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Create Item Manually</h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 gap-1 rounded-xl bg-slate-950/60 border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setType('task')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              type === 'task' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Task
          </button>
          <button
            type="button"
            onClick={() => setType('event')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              type === 'event' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Event
          </button>
          <button
            type="button"
            onClick={() => setType('note')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              type === 'note' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Note
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${type} title...`}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-100 placeholder-slate-500 text-sm"
            />
          </div>

          {type === 'task' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Due Date & Time (Optional)</label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-100 text-sm"
              />
            </div>
          )}

          {type === 'event' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-slate-100 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-slate-100 text-xs sm:text-sm"
                />
              </div>
            </div>
          )}

          {type === 'note' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Note Content</label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note body here..."
                className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-100 placeholder-slate-500 text-sm font-mono"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Description (Optional)</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details..."
                className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-100 placeholder-slate-500 text-sm"
              />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-xs font-semibold text-white rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50 border border-white/10"
            >
              {loading ? 'Saving...' : `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

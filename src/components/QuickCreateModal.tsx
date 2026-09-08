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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">Quick Manual Add</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setType('task')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${type === 'task' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            Task
          </button>
          <button
            onClick={() => setType('event')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${type === 'event' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            Event
          </button>
          <button
            onClick={() => setType('note')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${type === 'note' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            Note
          </button>
        </div>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Title of ${type}`}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {type === 'task' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Due Date & Time (Optional)</label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {type === 'event' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {type === 'note' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Content</label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Note body content..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : `Create ${type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { TaskItem } from '@/types';

interface TaskListProps {
  tasks: TaskItem[];
  onToggleComplete: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export default function TaskList({ tasks, onToggleComplete, onDelete, loading }: TaskListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-900/60 rounded-xl animate-pulse border border-slate-800"></div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
        <p className="text-sm text-slate-400">No tasks yet.</p>
        <p className="text-xs text-slate-500 mt-1">Ask LifeOS to add a task (e.g., &quot;Buy groceries tomorrow&quot;).</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
            task.completed
              ? 'bg-slate-950/40 border-slate-900 text-slate-500'
              : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => onToggleComplete(task.id, !task.completed)}
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                task.completed
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-slate-700 hover:border-indigo-500'
              }`}
            >
              {task.completed && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium truncate ${task.completed ? 'line-through' : ''}`}>
                {task.title}
              </p>
              {task.dueAt && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Due: {new Date(task.dueAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => onDelete(task.id)}
            className="text-xs text-slate-500 hover:text-red-400 p-1 transition"
            title="Delete Task"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

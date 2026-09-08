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
          <div key={i} className="h-16 glass-panel rounded-xl animate-pulse border border-white/5"></div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl border border-white/5">
        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-300">No tasks found</p>
        <p className="text-xs text-slate-500 mt-1">Use the AI input above to create a task (e.g. &quot;Buy groceries tomorrow&quot;).</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {tasks.map((task) => {
        const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && !task.completed;

        return (
          <div
            key={task.id}
            className={`p-4 rounded-xl glass-panel glass-panel-hover border transition-all duration-200 flex items-center justify-between gap-4 ${
              task.completed
                ? 'opacity-65 bg-slate-900/40 border-white/5'
                : isOverdue
                ? 'border-red-500/30 bg-red-950/10'
                : 'border-white/10 hover:border-indigo-500/30'
            }`}
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onToggleComplete(task.id, !task.completed)}
                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 shadow-sm ${
                  task.completed
                    ? 'bg-emerald-500 border-emerald-400 text-slate-950 glow-text-emerald'
                    : 'border-white/20 hover:border-indigo-400 bg-slate-800/50'
                }`}
              >
                {task.completed && (
                  <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{task.description}</p>
                )}
                {task.dueAt && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1 border ${
                      isOverdue 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                        : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(task.dueAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              title="Delete Task"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import TaskList from '@/components/TaskList';
import { TaskItem } from '@/types';
import { Database } from '@/types/database';

type TaskRow = Database['public']['Tables']['tasks']['Row'];

export default function TaskListWrapper() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function fetchTasks() {
      setLoading(true);
      try {
        const res = await fetch('/api/tasks').then((r) => r.json());
        if (!ignore && res.tasks) {
          setTasks(
            res.tasks.map((t: TaskRow) => ({
              id: t.id,
              userId: t.user_id,
              title: t.title,
              description: t.description || undefined,
              dueAt: t.due_at || undefined,
              completed: t.completed,
              createdAt: t.created_at,
            }))
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchTasks();

    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed }),
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <TaskList
      tasks={tasks}
      onToggleComplete={handleToggleComplete}
      onDelete={handleDelete}
      loading={loading}
    />
  );
}

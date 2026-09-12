'use client';

import { useState, useEffect } from 'react';
import ReminderList from '@/components/ReminderList';
import { ReminderItem } from '@/types';
import { Database } from '@/types/database';

type ReminderRow = Database['public']['Tables']['reminders']['Row'];

export default function ReminderListWrapper() {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function fetchReminders() {
      setLoading(true);
      try {
        const res = await fetch('/api/reminders').then((r) => r.json());
        if (!ignore && res.reminders) {
          setReminders(
            res.reminders.map((r: any) => {
              const taskObj = Array.isArray(r.tasks) ? r.tasks[0] : r.tasks;
              const eventObj = Array.isArray(r.events) ? r.events[0] : r.events;
              const title = taskObj?.title || eventObj?.title || 'Scheduled Alert';
              const description = taskObj?.description || eventObj?.description || undefined;

              return {
                id: r.id,
                userId: r.user_id,
                taskId: r.task_id || undefined,
                eventId: r.event_id || undefined,
                remindAt: r.remind_at,
                status: r.status,
                createdAt: r.created_at,
                title,
                description,
              };
            })
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchReminders();

    return () => {
      ignore = true;
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return <ReminderList reminders={reminders} onDelete={handleDelete} loading={loading} />;
}

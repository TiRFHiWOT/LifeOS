'use client';

import { useState, useEffect } from 'react';
import EventList from '@/components/EventList';
import { EventItem } from '@/types';
import { Database } from '@/types/database';

type EventRow = Database['public']['Tables']['events']['Row'];

export default function EventListWrapper() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function fetchEvents() {
      setLoading(true);
      try {
        const res = await fetch('/api/events').then((r) => r.json());
        if (!ignore && res.events) {
          setEvents(
            res.events.map((e: EventRow) => ({
              id: e.id,
              userId: e.user_id,
              title: e.title,
              description: e.description || undefined,
              startAt: e.start_at,
              endAt: e.end_at,
              calendarEventId: e.calendar_event_id || undefined,
              createdAt: e.created_at,
            }))
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchEvents();

    return () => {
      ignore = true;
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return <EventList events={events} onDelete={handleDelete} loading={loading} />;
}

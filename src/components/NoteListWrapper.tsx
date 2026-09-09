'use client';

import { useState, useEffect } from 'react';
import NoteList from '@/components/NoteList';
import { NoteItem } from '@/types';
import { Database } from '@/types/database';

type NoteRow = Database['public']['Tables']['notes']['Row'];

export default function NoteListWrapper() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function fetchNotes() {
      setLoading(true);
      try {
        const res = await fetch('/api/notes').then((r) => r.json());
        if (!ignore && res.notes) {
          setNotes(
            res.notes.map((n: NoteRow) => ({
              id: n.id,
              userId: n.user_id,
              title: n.title,
              content: n.content,
              createdAt: n.created_at,
            }))
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchNotes();

    return () => {
      ignore = true;
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return <NoteList notes={notes} onDelete={handleDelete} loading={loading} />;
}

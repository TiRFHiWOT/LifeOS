import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type NoteRow = Database['public']['Tables']['notes']['Row'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];
type NoteUpdate = Database['public']['Tables']['notes']['Update'];

export async function getNotes(userId: string): Promise<NoteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch notes: ${error.message}`);
  return data || [];
}

export async function createNote(userId: string, note: Omit<NoteInsert, 'user_id'>): Promise<NoteRow> {
  if (!note.title || note.title.trim() === '') {
    throw new Error('Note title is required');
  }
  if (!note.content || note.content.trim() === '') {
    throw new Error('Note content is required');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notes')
    .insert({
      ...note,
      user_id: userId,
      title: note.title.trim(),
      content: note.content.trim(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create note: ${error.message}`);
  return data;
}

export async function updateNote(userId: string, noteId: string, updates: Omit<NoteUpdate, 'user_id' | 'id'>): Promise<NoteRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', noteId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update note: ${error.message}`);
  return data;
}

export async function deleteNote(userId: string, noteId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete note: ${error.message}`);
  return true;
}

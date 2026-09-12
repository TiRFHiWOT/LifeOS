import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export async function getTasks(userId: string): Promise<TaskRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) return data;
    return [];
  } catch {
    return [];
  }
}

export async function createTask(userId: string, task: Omit<TaskInsert, 'user_id'>): Promise<TaskRow> {
  if (!task.title || task.title.trim() === '') {
    throw new Error('Task title is required');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...task,
      user_id: userId,
      title: task.title.trim(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message || 'Database insert failed for task');
  return data;
}

export async function updateTask(userId: string, taskId: string, updates: Omit<TaskUpdate, 'user_id' | 'id'>): Promise<TaskRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);
  return data;
}

export async function completeTask(userId: string, taskId: string, completed: boolean): Promise<TaskRow> {
  return updateTask(userId, taskId, { completed });
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete task: ${error.message}`);
  return true;
}

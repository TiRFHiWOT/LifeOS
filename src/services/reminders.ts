import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type ReminderRow = Database['public']['Tables']['reminders']['Row'];
type ReminderInsert = Database['public']['Tables']['reminders']['Insert'];

export async function getReminders(userId: string): Promise<ReminderRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .order('remind_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch reminders: ${error.message}`);
  return data || [];
}

export async function createReminder(userId: string, reminder: Omit<ReminderInsert, 'user_id'>): Promise<ReminderRow> {
  if (!reminder.task_id && !reminder.event_id) {
    throw new Error('Reminder must be associated with either a task_id or an event_id');
  }
  if (!reminder.remind_at) {
    throw new Error('Reminder remind_at timestamp is required');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      ...reminder,
      user_id: userId,
      status: reminder.status || 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create reminder: ${error.message}`);
  return data;
}

export async function updateReminderStatus(userId: string, reminderId: string, status: 'pending' | 'sent' | 'failed'): Promise<ReminderRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reminders')
    .update({ status })
    .eq('id', reminderId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update reminder status: ${error.message}`);
  return data;
}

export async function deleteReminder(userId: string, reminderId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete reminder: ${error.message}`);
  return true;
}

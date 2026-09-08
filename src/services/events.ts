import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';
import { createGoogleCalendarEvent } from '@/services/googleCalendar';

type EventRow = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];

export async function getEvents(userId: string): Promise<EventRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('start_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch events: ${error.message}`);
  return data || [];
}

export async function createEvent(
  userId: string,
  event: Omit<EventInsert, 'user_id'>,
  googleAccessToken?: string
): Promise<EventRow> {
  if (!event.title || event.title.trim() === '') {
    throw new Error('Event title is required');
  }
  if (!event.start_at || !event.end_at) {
    throw new Error('Event start_at and end_at timestamps are required');
  }

  let calendarEventId = event.calendar_event_id || null;

  // Sync with Google Calendar if access token is available
  if (googleAccessToken) {
    const googleResult = await createGoogleCalendarEvent(googleAccessToken, {
      title: event.title.trim(),
      description: event.description,
      startAt: event.start_at,
      endAt: event.end_at,
    });

    if (googleResult.success && googleResult.googleEventId) {
      calendarEventId = googleResult.googleEventId;
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .insert({
      ...event,
      user_id: userId,
      title: event.title.trim(),
      calendar_event_id: calendarEventId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create event: ${error.message}`);
  return data;
}

export async function updateEvent(userId: string, eventId: string, updates: Omit<EventUpdate, 'user_id' | 'id'>): Promise<EventRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update event: ${error.message}`);
  return data;
}

export async function deleteEvent(userId: string, eventId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete event: ${error.message}`);
  return true;
}

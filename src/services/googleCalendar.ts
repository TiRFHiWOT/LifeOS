export interface GoogleCalendarEventInput {
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
}

export interface GoogleCalendarEventResult {
  success: boolean;
  googleEventId?: string;
  error?: string;
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: GoogleCalendarEventInput
): Promise<GoogleCalendarEventResult> {
  if (!accessToken) {
    return { success: false, error: 'No Google Calendar access token provided' };
  }

  try {
    const payload = {
      summary: event.title,
      description: event.description || undefined,
      start: {
        dateTime: new Date(event.startAt).toISOString(),
      },
      end: {
        dateTime: new Date(event.endAt).toISOString(),
      },
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('Google Calendar API creation failed:', errorData);
      return {
        success: false,
        error: errorData.error?.message || `Google Calendar API returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      googleEventId: data.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network failure calling Google Calendar API';
    console.error('Google Calendar event sync error:', err);
    return { success: false, error: message };
  }
}

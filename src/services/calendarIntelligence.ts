import { AIChoice, AIInterpretationResult } from '@/types/ai';

export interface TimeSlot {
  startAt: string;
  endAt: string;
  formattedTime: string;
}

export interface ExistingEventSummary {
  id?: string;
  title: string;
  startAt: string;
  endAt: string;
}

export function findAvailableTimeSlots(
  targetDate: Date,
  existingEvents: ExistingEventSummary[],
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'any' = 'afternoon',
  durationMinutes = 60
): TimeSlot[] {
  let startHour = 12;
  let endHour = 17;

  if (timeOfDay === 'morning') {
    startHour = 9;
    endHour = 12;
  } else if (timeOfDay === 'afternoon') {
    startHour = 12;
    endHour = 17;
  } else if (timeOfDay === 'evening') {
    startHour = 17;
    endHour = 21;
  } else {
    startHour = 9;
    endHour = 18;
  }

  // Generate candidate start times (e.g. 12:00, 13:00, 14:00, 15:30, 16:30)
  const candidateHours: { hour: number; minute: number }[] = [];
  for (let h = startHour; h < endHour; h++) {
    candidateHours.push({ hour: h, minute: 0 });
    if (h + 0.5 < endHour) {
      candidateHours.push({ hour: h, minute: 30 });
    }
  }

  const availableSlots: TimeSlot[] = [];

  for (const candidate of candidateHours) {
    const slotStart = new Date(targetDate);
    slotStart.setHours(candidate.hour, candidate.minute, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

    // Check collision with any existing event
    const isBusy = existingEvents.some((evt) => {
      const evtStart = new Date(evt.startAt).getTime();
      const evtEnd = new Date(evt.endAt).getTime();
      const candStart = slotStart.getTime();
      const candEnd = slotEnd.getTime();

      // Overlap check: candStart < evtEnd AND candEnd > evtStart
      return candStart < evtEnd && candEnd > evtStart;
    });

    if (!isBusy) {
      const formattedTime = slotStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      availableSlots.push({
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        formattedTime,
      });
    }

    if (availableSlots.length >= 3) break;
  }

  return availableSlots;
}

export function buildCalendarAvailabilityChoices(
  title: string,
  timeSlots: TimeSlot[]
): { question: string; choices: AIChoice[] } {
  if (timeSlots.length === 0) {
    return {
      question: `No open slots found for "${title}". What specific time would you prefer?`,
      choices: [],
    };
  }

  const timeStrings = timeSlots.map((s) => s.formattedTime);
  let timeListStr = timeStrings[0];
  if (timeStrings.length === 2) {
    timeListStr = `${timeStrings[0]} or ${timeStrings[1]}`;
  } else if (timeStrings.length > 2) {
    timeListStr = `${timeStrings.slice(0, -1).join(', ')}, or ${timeStrings[timeStrings.length - 1]}`;
  }

  const question = `You're free at ${timeListStr}. Which works best for "${title}"?`;

  const choices: AIChoice[] = timeSlots.map((slot) => ({
    label: `Schedule at ${slot.formattedTime}`,
    type: 'event',
    interpretation: {
      intent: 'create_event',
      confidence: 0.98,
      title,
      startAt: slot.startAt,
      endAt: slot.endAt,
      reasoning: `Selected available calendar slot at ${slot.formattedTime}`,
    },
  }));

  return { question, choices };
}

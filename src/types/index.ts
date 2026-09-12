export type ItemType = 'task' | 'event' | 'note' | 'reminder';

export interface BaseEntity {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TaskItem extends BaseEntity {
  title: string;
  description?: string;
  dueAt?: string;
  completed: boolean;
}

export interface EventItem extends BaseEntity {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  calendarEventId?: string;
}

export interface NoteItem extends BaseEntity {
  title: string;
  content: string;
}

export interface ReminderItem extends BaseEntity {
  taskId?: string;
  eventId?: string;
  remindAt: string;
  status: 'pending' | 'sent' | 'failed';
  title?: string;
  description?: string;
}

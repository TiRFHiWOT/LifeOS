# LifeOS Database & Data Model Documentation

This document describes the relational database structure, tables, indexes, triggers, and security policies for LifeOS built on Supabase/PostgreSQL.

---

## Entity Relationship Summary

- **Users** (`auth.users`): Managed by Supabase Auth. All entity rows reference `user_id` with `ON DELETE CASCADE`.
- **Tasks** (`public.tasks`): User tasks with completion state and optional due dates.
- **Events** (`public.events`): User scheduled events with start/end timestamps and optional external Google Calendar IDs.
- **Notes** (`public.notes`): Text notes and saved information.
- **Reminders** (`public.reminders`): Scheduled notifications linked to a `task_id` or `event_id`.

---

## Table Schemas

### 1. `tasks`
Stores user to-dos and action items.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique identifier |
| `user_id` | `UUID` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Owner user ID |
| `title` | `TEXT` | `NOT NULL` | Task title |
| `description` | `TEXT` | `NULLABLE` | Task details |
| `due_at` | `TIMESTAMPTZ` | `NULLABLE` | Optional due date and time |
| `completed` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Task completion status |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record update timestamp |

### 2. `events`
Stores user events and appointments.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique identifier |
| `user_id` | `UUID` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Owner user ID |
| `title` | `TEXT` | `NOT NULL` | Event title |
| `description` | `TEXT` | `NULLABLE` | Event details/location |
| `start_at` | `TIMESTAMPTZ` | `NOT NULL` | Start date and time |
| `end_at` | `TIMESTAMPTZ` | `NOT NULL` | End date and time |
| `calendar_event_id` | `TEXT` | `NULLABLE` | External Google Calendar event ID |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record update timestamp |

### 3. `notes`
Stores personal notes and information.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique identifier |
| `user_id` | `UUID` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Owner user ID |
| `title` | `TEXT` | `NOT NULL` | Note title |
| `content` | `TEXT` | `NOT NULL` | Note body content |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record update timestamp |

### 4. `reminders`
Stores scheduled alerts for tasks or events.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique identifier |
| `user_id` | `UUID` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Owner user ID |
| `task_id` | `UUID` | `NULLABLE REFERENCES public.tasks(id) ON DELETE CASCADE` | Linked task ID |
| `event_id` | `UUID` | `NULLABLE REFERENCES public.events(id) ON DELETE CASCADE` | Linked event ID |
| `remind_at` | `TIMESTAMPTZ` | `NOT NULL` | Scheduled trigger time |
| `status` | `TEXT` | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed'))` | Delivery status |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record creation timestamp |

---

## Row Level Security (RLS) & User Isolation

Row Level Security is strictly enabled on all tables:
- `tasks`: `auth.uid() = user_id`
- `events`: `auth.uid() = user_id`
- `notes`: `auth.uid() = user_id`
- `reminders`: `auth.uid() = user_id`

Users are completely isolated from one another. No cross-tenant reads or writes are allowed at the database engine level.

---

## Performance Indexes

- `idx_tasks_user_id` on `tasks(user_id)`
- `idx_tasks_due_at` on `tasks(due_at)`
- `idx_events_user_id` on `events(user_id)`
- `idx_events_start_at` on `events(start_at)`
- `idx_notes_user_id` on `notes(user_id)`
- `idx_reminders_user_id` on `reminders(user_id)`
- `idx_reminders_remind_at_status` on `reminders(remind_at, status)`

# LifeOS Solution Design & SRS Document

## 1. Executive Summary

**LifeOS** is a full-stack personal administrative assistant driven by Gemini AI. It transforms unstructured natural-language instructions (e.g. *"Dentist appointment Friday at 3 PM. Remind me one hour before."*) into structured, validated database records and synchronized external calendar events.

---

## 2. System Architecture

```text
User Interface (Next.js 16 App Router / React 19 / Tailwind CSS)
   ↓
Authentication Layer (Supabase Auth / Edge Middleware / Google OAuth)
   ↓
API Route Layer (/api/ai/execute, /api/tasks, /api/events, /api/notes, /api/reminders)
   ↓
Gemini AI Engine (@google/genai — gemini-2.5-flash with JSON Schema output)
   ↓
Action Orchestrator (Server-side validation & deterministic routing)
   ├── Supabase PostgreSQL Database (Tasks, Events, Notes, Reminders)
   ├── Google Calendar API Sync (/calendar/v3/calendars/primary/events)
   └── Reminder Engine (Nodemailer SMTP / Cron Scheduler)
```

---

## 3. Core Capabilities & Intent Pipeline

| User Intent | Handled Action | Target Tables | External Integrations |
|---|---|---|---|
| `create_event` | Schedules appointment with start/end timestamps | `events`, `reminders` | Google Calendar API |
| `create_task` | Creates actionable to-do with due date | `tasks`, `reminders` | — |
| `create_note` | Stores text facts, info, or reference notes | `notes` | — |
| `create_reminder` | Schedules alert for existing item or date | `reminders` | SMTP Email / Nodemailer |
| `missing_information` | Detects missing time/details & prompts user | — | Assistant Follow-Up |

---

## 4. Security & Data Isolation Model

- **Row Level Security**: All database tables enforce PostgreSQL RLS policies (`auth.uid() = user_id`).
- **Secret Isolation**: Server secrets (`GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `SMTP_PASS`) are never exposed to browser client bundles.
- **Deterministic Action Validation**: Gemini model outputs are validated server-side against TypeScript interfaces before database persistence.

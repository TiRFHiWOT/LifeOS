# LifeOS — Personal AI Administrative Assistant

LifeOS is a full-stack personal administrative assistant built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Supabase (PostgreSQL), and the Gemini API.

It allows users to write natural-language instructions (e.g. *"Dentist appointment Friday at 3 PM. Remind me one hour before."*), parses intent and structured parameters using Gemini AI, validates actions server-side, and manages tasks, notes, calendar events, and reminders.

---

## Features

- 🤖 **Gemini AI Intent Engine**: Natural language parsing into structured intents (`create_task`, `create_note`, `create_event`, `create_reminder`, `missing_information`).
- 📅 **Google Calendar Integration**: Direct two-way sync with Google Calendar API.
- 🔔 **Proactive Reminder Engine**: Automated background alerting via SMTP Email and Vercel Cron.
- 💬 **Conversational Follow-Up**: Intelligently prompts for missing information (e.g. asking for event times) without hallucinating dates.
- 🔐 **Multi-Tenant Security**: Enforces PostgreSQL Row Level Security (RLS) policies per user account.
- 📊 **Interactive Dashboard**: Modern dark-mode UI with summary metrics, live search filtering, and manual quick-add controls.

---

## Technical Architecture

```text
LifeOS Architecture
├── Frontend: Next.js 16 (App Router), React 19, Tailwind CSS
├── Database & Auth: Supabase (PostgreSQL with RLS), Edge Middleware
├── AI Engine: Gemini 2.5 Flash (@google/genai with JSON Schema)
├── Integrations: Google Calendar API, Nodemailer SMTP
└── Scheduler: Vercel Cron / Google Cloud Scheduler (/api/cron/reminders)
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v18.x` or higher (`v24.x` recommended)
- **npm**: `v10.x` or higher

### Local Setup

1. Clone the repository and enter the directory:
   ```bash
   cd LifeOS
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase, Gemini API, Google OAuth, and SMTP credentials in `.env.local`.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Documentation Links

- 📐 [Solution Design & SRS Document](file:///home/aaa/Public/LifeOS/docs/solution_design.md)
- 🗄️ [Database Schema & RLS Documentation](file:///home/aaa/Public/LifeOS/docs/schema.md)
- 🔒 [Security & Validation Review](file:///home/aaa/Public/LifeOS/docs/security.md)
- 🔔 [Reminder Engine & Cron Setup](file:///home/aaa/Public/LifeOS/docs/reminders.md)
- 🧪 [Testing & Demo Scenarios Guide](file:///home/aaa/Public/LifeOS/docs/testing.md)
- 🚀 [Production Deployment Guide](file:///home/aaa/Public/LifeOS/docs/deployment.md)
- 🎬 [Final Video Presentation & Demo Script](file:///home/aaa/Public/LifeOS/docs/demo_script.md)
- 📋 [Implementation Plan Roadmap](file:///home/aaa/Public/LifeOS/IMPLEMENTATION_PLAN.md)

---

## Execution Roadmap

- [x] **Step 0**: Project Baseline (Next.js, TypeScript, Tailwind, environment template)
- [x] **Step 1**: Database and Data Model (Supabase schema, tables, RLS)
- [x] **Step 2**: Authentication and User Context (Protected routes, auth session)
- [x] **Step 3**: Core CRUD Backend (Tasks, Notes, Events, Reminders APIs)
- [x] **Step 4**: Gemini AI Interpretation Layer (Natural language parsing)
- [x] **Step 5**: AI Action Orchestration (Validated intent routing)
- [x] **Step 6**: Google Calendar Integration (OAuth, event sync)
- [x] **Step 7**: Reminder Engine (Calculations, background delivery)
- [x] **Step 8**: Frontend Application Shell (Dashboard & Input UI)
- [x] **Step 9**: Connect Frontend to AI Agent (End-to-end integration)
- [x] **Step 10**: Missing Information & Follow-Up (Conversational context)
- [x] **Step 11**: Dashboard Data & Polish (Today/Upcoming views, UI polish)
- [x] **Step 12**: Security, Validation & Error Review
- [x] **Step 13**: Testing & Demo Scenarios
- [x] **Step 14**: Production / Deployment Preparation
- [x] **Step 15**: Documentation & Submission Preparation

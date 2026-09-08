# LifeOS — Implementation Plan

## Purpose

This document is the execution plan for building LifeOS as a complete, working full-stack AI personal administrative assistant.

The project must be built **step by step**. The IDE/AI coding agent must **never skip ahead**, silently combine steps, or begin the next step before the current step has been reviewed and explicitly approved.

The goal is to finish a working MVP on time while keeping the codebase clean enough to continue using LifeOS as a personal project even if the assignment is not approved.

---

# NON-NEGOTIABLE EXECUTION RULES

## Rule 1 — One step at a time

Work on **ONLY the current step**.

Do not implement features belonging to future steps.

Do not combine multiple steps into one implementation.

Do not say a step is complete merely because the code was generated.

A step is complete only when its acceptance criteria are satisfied.

## Rule 2 — Mandatory review gate

At the end of every step, the coding agent MUST:

1. Stop coding.
2. Run the relevant checks/tests.
3. Inspect the files changed.
4. Report exactly what was implemented.
5. Report any errors, warnings, TODOs, or known limitations.
6. Compare the implementation against the step's acceptance criteria.
7. Provide a short verification checklist.
8. Ask the user for approval to continue.

The agent MUST NOT start the next step automatically.

## Rule 3 — Explicit approval required

The only valid command to continue is an explicit user instruction such as:

- `APPROVED — continue`
- `Continue to Step X`
- `Go to the next step`

If the user has not explicitly approved the completed step, **STOP**.

Do not interpret messages such as "looks good", "nice", "okay", or unrelated instructions as permission to continue unless they clearly approve moving forward.

## Rule 4 — If review fails

If the step does not satisfy its acceptance criteria:

1. Do not move forward.
2. Identify the failure.
3. Fix only issues belonging to the current step.
4. Re-run verification.
5. Present the review again.
6. Ask for approval again.

## Rule 5 — Do not expand scope during implementation

Do not add "nice to have" features while implementing a step.

If a useful idea appears, record it under `Future Improvements` and continue with the current scope.

## Rule 6 — Preserve working code

Do not make unrelated refactors.

Do not replace working architecture without a clear reason.

Do not introduce dependencies unless they are needed for the current step.

Before major changes, inspect the existing project structure and conventions.

## Rule 7 — Never fake completion

Do not claim:

- tests passed when they were not run;
- an API integration works when it has not been tested;
- a feature is complete when only the UI exists;
- a backend action works when it has not been verified;
- authentication/security is complete without testing it.

If something cannot be verified, say so explicitly.

---

# PROJECT DEFINITION

## Product

**LifeOS**

## Role

Personal Administrative Assistant

## Domain

Personal productivity / everyday life management

## Core idea

A user should be able to write normal natural-language instructions such as:

> "Dentist appointment Friday at 3 PM. Remind me one hour before."

LifeOS should understand the request, determine what type of information/action it represents, and perform the appropriate action.

Examples:

- Appointment → Calendar event
- Todo → Task
- Personal information → Note
- Reminder request → Reminder attached to an event/task

The AI should ask for missing critical information instead of guessing.

---

# TARGET MVP

The MVP must demonstrate:

1. Natural-language input.
2. Gemini-powered intent and information extraction.
3. Structured AI output.
4. Backend validation.
5. Task creation.
6. Note creation.
7. Google Calendar event creation.
8. Reminder scheduling/processing.
9. Dashboard displaying today's and upcoming items.
10. Clear success/error states.
11. Basic authentication/user isolation.
12. At least two relevant third-party integrations/APIs where practical.
13. A usable, polished frontend.
14. A working backend.
15. A demonstrable end-to-end AI agent workflow.

---

# TECHNICAL DIRECTION

Use the following stack unless a technical reason requires a documented change:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- Gemini API
- Google Calendar API
- Email/notification integration
- Google Cloud services where useful for scheduled automation

Keep frontend and backend responsibilities clearly separated.

The AI must **not** directly control the database or external APIs.

Recommended flow:

```text
User
  ↓
Next.js UI
  ↓
Backend/API
  ↓
Gemini
  ↓
Structured intent/action
  ↓
Backend validation
  ↓
Action layer
  ├── Supabase/PostgreSQL
  ├── Google Calendar
  └── Notification service
```

---

# STEP 0 — PROJECT BASELINE

## Objective

Create or verify the project foundation before implementing LifeOS features.

## Tasks

- Inspect the existing repository.
- Confirm Node/package manager versions.
- Confirm Next.js/React/TypeScript setup.
- Configure Tailwind.
- Establish environment variable strategy.
- Establish basic project folders.
- Configure linting/type checking.
- Create a minimal application shell.
- Add `.env.example`.
- Add/update README with local setup instructions.
- Confirm the application starts successfully.

## Acceptance criteria

- Project installs successfully.
- Development server starts.
- Production build can run successfully, or any blocker is documented.
- TypeScript checks pass.
- Lint checks pass where configured.
- No secrets are committed.
- `.env.example` exists.
- Project structure is documented.

## Review gate

STOP after Step 0.

Report:

- files created/changed;
- commands run;
- results;
- errors/warnings;
- acceptance criteria status.

Ask:

> Step 0 is complete and ready for review. Approve Step 0 to continue to Step 1?

---

# STEP 1 — DATABASE AND DATA MODEL

## Objective

Create the database foundation for users, tasks, events, notes, and reminders.

## Core tables

### tasks

- id
- user_id
- title
- description
- due_at
- completed
- created_at
- updated_at

### events

- id
- user_id
- title
- description
- start_at
- end_at
- calendar_event_id
- created_at
- updated_at

### notes

- id
- user_id
- title
- content
- created_at
- updated_at

### reminders

- id
- user_id
- task_id
- event_id
- remind_at
- status
- created_at

## Tasks

- Create schema/migrations.
- Add relationships.
- Add indexes where appropriate.
- Add user ownership.
- Configure Row Level Security if using Supabase.
- Test CRUD/access behavior.
- Document the schema.

## Acceptance criteria

- Tables exist.
- Relationships work.
- User isolation is enforced.
- CRUD operations work.
- Unauthorized cross-user access is blocked.
- Schema is documented.

## Review gate

STOP and request approval before Step 2.

---

# STEP 2 — AUTHENTICATION AND USER CONTEXT

## Objective

Allow users to securely sign in and ensure all LifeOS data belongs to the authenticated user.

## Tasks

- Implement authentication using the selected auth mechanism.
- Create login/signup flow if required.
- Establish authenticated server/user context.
- Protect application routes.
- Connect authenticated user IDs to database operations.
- Handle unauthenticated users.
- Test user isolation.

## Acceptance criteria

- User can authenticate.
- Protected pages cannot be accessed anonymously.
- Backend knows the authenticated user.
- User A cannot access User B's data.
- Logout works.
- Authentication errors are handled cleanly.

## Review gate

STOP and request approval before Step 3.

---

# STEP 3 — CORE CRUD BACKEND

## Objective

Create reliable backend operations for tasks, notes, events, and reminders.

## Tasks

Implement validated server-side operations for:

- create task;
- list tasks;
- update task;
- complete task;
- delete task;
- create note;
- list notes;
- update note;
- delete note;
- create event;
- list events;
- update event;
- create reminder;
- list reminders.

Use consistent validation and error handling.

## Acceptance criteria

- CRUD operations work.
- Authentication is enforced.
- Input validation exists.
- Errors are handled consistently.
- User ownership is checked server-side.
- No database access relies on client-side trust.

## Review gate

STOP and request approval before Step 4.

---

# STEP 4 — GEMINI AI INTERPRETATION LAYER

## Objective

Make LifeOS understand natural-language user requests.

## Example input

> "Dentist appointment Friday at 3 PM. Remind me one hour before."

Expected structured output:

```json
{
  "intent": "create_event",
  "title": "Dentist appointment",
  "date": "2026-09-11",
  "startTime": "15:00",
  "reminderMinutes": 60
}
```

Other possible intents:

```text
create_task
create_note
create_event
create_reminder
missing_information
unknown
```

## Tasks

- Integrate Gemini.
- Define a strict structured response schema.
- Create system instructions.
- Validate model output.
- Normalize dates/times.
- Handle malformed responses.
- Handle missing required information.
- Never allow Gemini output to bypass backend validation.

## Critical behavior

If the user says:

> "Meeting with Sarah tomorrow."

and time is required, the system should ask:

> "What time is the meeting?"

It must not invent a time.

## Acceptance criteria

- Gemini integration works.
- Natural-language input produces structured intent.
- Output is validated.
- Missing critical information is detected.
- Invalid model output is rejected safely.
- No hallucinated actions are executed.

## Review gate

STOP and request approval before Step 5.

---

# STEP 5 — AI ACTION ORCHESTRATION

## Objective

Turn Gemini's validated intent into real application actions.

## Tasks

Create an action/orchestration layer:

```text
AI Intent
   ↓
Validation
   ↓
Action Router
   ├── Task Service
   ├── Note Service
   ├── Event Service
   └── Reminder Service
```

Examples:

```text
create_task → createTask()
create_note → createNote()
create_event → createEvent()
create_reminder → createReminder()
```

## Acceptance criteria

- AI requests result in real backend actions.
- Actions are deterministic.
- User authorization is enforced.
- Failed actions return useful errors.
- The AI cannot directly execute arbitrary code or database queries.

## Review gate

STOP and request approval before Step 6.

---

# STEP 6 — GOOGLE CALENDAR INTEGRATION

## Objective

Allow LifeOS to create and manage real calendar events.

## Tasks

- Configure Google OAuth/API credentials.
- Request only required permissions.
- Connect authenticated user to Google Calendar.
- Create calendar events.
- Store external calendar event IDs.
- Handle duplicate/failed requests.
- Handle token/API errors.

## Acceptance criteria

Given:

> "Dentist Friday at 3 PM."

LifeOS can create the event in the user's Google Calendar.

The database stores the relationship between the LifeOS event and the external Calendar event.

## Review gate

STOP and request approval before Step 7.

---

# STEP 7 — REMINDER ENGINE

## Objective

Make LifeOS proactively remind users about upcoming tasks/events.

## Tasks

- Calculate reminder times.
- Store reminder records.
- Implement due-reminder processing.
- Add notification/email delivery.
- Prevent duplicate notifications.
- Mark reminders as processed.
- Prepare scheduled execution using a suitable cloud scheduler/cron mechanism.

## Acceptance criteria

- Reminder time is calculated correctly.
- Due reminders can be detected.
- Notification is sent successfully.
- A reminder cannot repeatedly send the same notification.
- Failed notifications are handled safely.
- Scheduled execution path is documented.

## Review gate

STOP and request approval before Step 8.

---

# STEP 8 — FRONTEND APPLICATION SHELL

## Objective

Build the main LifeOS user interface.

## Screens/components

- Login/auth UI
- Main dashboard
- Natural-language input
- Today section
- Upcoming section
- Tasks section
- Notes section
- Calendar/events section
- Reminder status
- Loading states
- Empty states
- Error states
- Success confirmations

## Design principle

The primary interaction should be extremely simple:

```text
"What do you need to remember?"
[ Type something...                         ]
[ Add / Ask LifeOS ]
```

## Acceptance criteria

- Responsive UI.
- Clear navigation.
- Natural-language input is prominent.
- Dashboard is understandable without explanation.
- Loading/error/success states exist.
- No fake data in production flow.

## Review gate

STOP and request approval before Step 9.

---

# STEP 9 — CONNECT FRONTEND TO AI AGENT

## Objective

Connect the UI to the complete AI workflow.

## End-to-end flow

```text
User types request
       ↓
Frontend
       ↓
Backend
       ↓
Gemini
       ↓
Structured intent
       ↓
Validation
       ↓
Action
       ↓
Database / Calendar / Reminder
       ↓
Frontend updates
```

## Example

User:

> "Buy groceries tomorrow."

System:

```text
AI → create_task
Backend → validates
Database → saves task
UI → shows task
```

## Acceptance criteria

- Real user input reaches Gemini.
- Gemini output reaches backend validation.
- Correct action executes.
- UI reflects the result.
- Errors are visible to the user.
- End-to-end workflow works without manual database edits.

## Review gate

STOP and request approval before Step 10.

---

# STEP 10 — MISSING INFORMATION AND CONVERSATIONAL FOLLOW-UP

## Objective

Make the agent handle incomplete requests intelligently.

## Examples

Input:

> "Meeting with Sarah tomorrow."

Response:

> "What time is the meeting?"

Input:

> "Remind me about the dentist."

Response:

> "When is the dentist appointment?"

The system should preserve enough context to complete the pending action.

## Acceptance criteria

- Missing required fields are detected.
- Agent asks a focused question.
- User's answer completes the pending action.
- The system does not guess critical information.
- Conversation state does not leak between users.

## Review gate

STOP and request approval before Step 11.

---

# STEP 11 — DASHBOARD DATA AND POLISH

## Objective

Make the MVP feel like a finished product rather than a technical demo.

## Tasks

- Today view.
- Upcoming items.
- Task completion.
- Event display.
- Notes display.
- Reminder status.
- Date/time formatting.
- Responsive behavior.
- Empty states.
- Error handling.
- Loading states.
- Accessibility basics.
- Remove obvious UI rough edges.

## Acceptance criteria

- Main user journey is clear.
- Data is correctly displayed.
- Mobile and desktop layouts work.
- No obvious broken states.
- UI is presentation-ready for the demo.

## Review gate

STOP and request approval before Step 12.

---

# STEP 12 — SECURITY, VALIDATION AND ERROR REVIEW

## Objective

Perform a focused security and reliability pass.

## Check

- Authentication.
- Authorization.
- Row Level Security.
- Server-side validation.
- Environment variables.
- API keys.
- OAuth tokens.
- User data isolation.
- Prompt injection considerations.
- Gemini output validation.
- External API failures.
- Rate-limit handling.
- Duplicate actions.
- Error messages.
- Logging.

## Acceptance criteria

No known critical security issue remains in the MVP.

Secrets are not exposed to the browser or repository.

External API failures fail safely.

## Review gate

STOP and request approval before Step 13.

---

# STEP 13 — TESTING AND DEMO SCENARIOS

## Objective

Prove that the complete system works.

## Required demo scenarios

### Scenario 1 — Calendar

Input:

> "Dentist appointment Friday at 3 PM. Remind me one hour before."

Expected:

- AI identifies event.
- Calendar event created.
- Reminder created.
- Dashboard updates.

### Scenario 2 — Task

Input:

> "Buy groceries tomorrow."

Expected:

- AI identifies task.
- Task saved.
- Dashboard shows task.

### Scenario 3 — Missing information

Input:

> "Meeting with Sarah tomorrow."

Expected:

- AI asks for time.
- User supplies time.
- Event is created.

### Scenario 4 — Note

Input:

> "My apartment WiFi password is XXXXX."

Expected:

- AI identifies note.
- Note saved.
- Note appears in the dashboard.

## Testing

Run:

- type checks;
- lint;
- build;
- unit tests where available;
- integration tests for critical flows;
- manual end-to-end tests.

## Acceptance criteria

All required demo scenarios work.

No known blocker prevents the MVP demo.

## Review gate

STOP and request approval before Step 14.

---

# STEP 14 — PRODUCTION/DEPLOYMENT PREPARATION

## Objective

Prepare the application for a real demo.

## Tasks

- Configure production environment variables.
- Deploy frontend/backend.
- Configure database production settings.
- Configure OAuth redirect URLs.
- Configure scheduler/cron.
- Verify external APIs.
- Test deployed application.
- Confirm no development-only configuration remains.

## Acceptance criteria

- Deployed application works.
- Authentication works in production.
- AI works in production.
- Calendar integration works.
- Reminder processing works.
- Critical demo flows work remotely.

## Review gate

STOP and request approval before Step 15.

---

# STEP 15 — DOCUMENTATION AND SUBMISSION PREPARATION

## Objective

Prepare the finished project for evaluation and future personal use.

## Required files

```text
README.md
SRS / Solution Design
IMPLEMENTATION_PLAN.md
.env.example
source code
```

README should include:

- Product overview.
- Features.
- Architecture.
- Tech stack.
- Local setup.
- Environment variables.
- Database setup.
- OAuth setup.
- AI setup.
- Deployment instructions.
- Known limitations.
- Future improvements.

## Final video structure

1. Problem
2. Role/domain research
3. Solution
4. Architecture
5. AI agent design
6. Live demo
7. Frontend walkthrough
8. Backend walkthrough
9. Integrations
10. Challenges/decisions
11. Future improvements

## Acceptance criteria

- Documentation is complete.
- Repository is clean.
- Demo is repeatable.
- Video script is ready.
- Submission package is ready.

## FINAL REVIEW GATE

STOP.

Do not submit automatically.

Ask the user to perform the final review and explicitly approve submission.

---

# DEFINITION OF DONE

LifeOS is considered complete only when:

- [ ] Authentication works.
- [ ] User data is isolated.
- [ ] Tasks work.
- [ ] Notes work.
- [ ] Events work.
- [ ] Google Calendar integration works.
- [ ] Reminders work.
- [ ] Gemini understands natural language.
- [ ] Missing information is handled.
- [ ] Frontend and backend are connected.
- [ ] Critical demo scenarios pass.
- [ ] Security/reliability review is complete.
- [ ] Production deployment works.
- [ ] README is complete.
- [ ] SRS/solution design exists.
- [ ] Implementation plan exists.
- [ ] Demo video is ready.

---

# EMERGENCY TIME-BOX RULE

If the deadline is approaching, **do not sacrifice the core working product by adding features**.

Priority order:

1. Natural-language AI input
2. Gemini interpretation
3. Backend action orchestration
4. Tasks
5. Calendar events
6. Reminders
7. Dashboard
8. Authentication/security
9. Testing
10. Deployment
11. Polish
12. Optional features

If time runs short, cut P1/P2 features before compromising the P0 workflow.

---

# OPTIONAL FEATURES — ONLY AFTER MVP

Do not implement these until the MVP is working:

- Recurring reminders
- Daily AI summary
- Gmail integration
- More notification channels
- Voice input
- Multiple calendar providers
- Advanced note search
- Analytics
- Mobile app
- Multi-agent workflows
- AI-generated daily planning

These belong in future improvements unless the core MVP is already complete.

---

# CODING AGENT STARTUP INSTRUCTION

When this document is given to the coding agent, it must begin by reading the entire implementation plan.

Then it must:

1. Identify the current step.
2. Inspect the repository.
3. State what it plans to do for that step.
4. Implement ONLY that step.
5. Run verification.
6. Review its own work against the acceptance criteria.
7. STOP.
8. Ask the user for explicit approval.

The agent must never automatically continue to another step.

Use this exact final checkpoint format:

```text
STEP REVIEW — Step X

Implemented:
- ...

Files changed:
- ...

Verification:
- ...

Acceptance criteria:
- [x] ...
- [x] ...
- [ ] ... (if applicable)

Known issues:
- ...

Status:
READY FOR USER REVIEW

I will NOT start Step X+1 until you explicitly approve this step.

Approve this step and I will continue to Step X+1.
```

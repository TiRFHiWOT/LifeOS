# LifeOS Security, Validation & Reliability Review

This document outlines the security architecture, data isolation guarantees, input validation rules, and error handling mechanisms implemented in LifeOS.

---

## 1. Authentication & Route Protection

- **Session Verification**: All protected API endpoints (`/api/tasks`, `/api/events`, `/api/notes`, `/api/reminders`, `/api/ai/interpret`, `/api/ai/execute`) verify session identity via `getUser()` on the server side before executing any action.
- **Middleware Guard**: Next.js Edge Middleware ([`src/middleware.ts`](file:///home/aaa/Public/LifeOS/src/middleware.ts)) automatically redirects unauthenticated browser requests targeting application pages to `/login`.
- **OAuth State**: Google OAuth authorization exchange verifies server-side `code` and issues `HttpOnly`, `SameSite=Lax` cookies for access token management.

---

## 2. Row Level Security (RLS) & Multi-Tenant Data Isolation

- **PostgreSQL Engine Policies**: RLS is strictly enabled on all core tables:
  ```sql
  CREATE POLICY "Users can manage their own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY "Users can manage their own events" ON public.events FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY "Users can manage their own reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id);
  ```
- **Filter Enforcements**: All server service queries explicitly include `.eq('user_id', userId)` matching the authenticated session user ID. User A cannot read, mutate, or delete User B's records under any circumstances.

---

## 3. Environment Variable & Secret Protection

- **Public vs Private Isolation**:
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe for client-side bundle embedding.
  - Sensitive secrets (`GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_PASS`, `CRON_SECRET`) are strictly read in server-side functions and API routes. They are NEVER sent to the client browser.

---

## 4. Prompt Injection & AI Validation Security

- **Strict Structured JSON Schema**: The Gemini API interaction ([`src/services/ai.ts`](file:///home/aaa/Public/LifeOS/src/services/ai.ts)) uses `responseMimeType: "application/json"` with an explicit JSON Schema definition (`Type.OBJECT`).
- **No Direct Code Execution**: The AI engine has zero direct database or API execution capability. It generates structured intent objects which pass through strict server-side typescript validation ([`src/services/orchestrator.ts`](file:///home/aaa/Public/LifeOS/src/services/orchestrator.ts)) before any database write occurs.
- **Missing Information Enforcement**: Prompts missing required parameters (e.g. appointment times) are rejected from action execution and returned as `missing_information` questions.

---

## 5. Resilience to External API Failures

- **Google Calendar API**: If Google OAuth credentials expire or the Google Calendar API returns an HTTP error, LifeOS logs the warning, saves the event locally in Supabase, and returns a clear status message without crashing the transaction.
- **Reminder Engine SMTP**: If SMTP email delivery fails during background cron processing, the reminder status is atomically marked as `'failed'` in PostgreSQL, preventing unhandled exceptions from terminating the processing loop.

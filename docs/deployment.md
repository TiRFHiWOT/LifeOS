# LifeOS Production Deployment Guide

This guide provides step-by-step instructions for deploying LifeOS to production using Vercel, Supabase, and Google Cloud Console.

---

## 1. Database & Supabase Production Setup

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new production project.
3. Open the **SQL Editor** in Supabase and run the schema migration located at [`supabase/migrations/20260908000000_initial_schema.sql`](file:///home/aaa/Public/LifeOS/supabase/migrations/20260908000000_initial_schema.sql).
4. Copy the **Project URL**, **Anon Key**, and **Service Role Key** from **Project Settings -> API**.

---

## 2. Google OAuth & Calendar API Setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named **LifeOS**.
3. Enable the **Google Calendar API**.
4. Configure the **OAuth Consent Screen** and add the scope: `https://www.googleapis.com/auth/calendar.events`.
5. Create an **OAuth 2.0 Client ID** (Web Application).
6. Add Authorized Redirect URIs:
   - Development: `http://localhost:3000/api/google/callback`
   - Production: `https://your-production-app.vercel.app/api/google/callback`
7. Copy your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

## 3. Vercel Deployment

1. Push your LifeOS repository to GitHub/GitLab.
2. Import the project into [Vercel](https://vercel.com/new).
3. Configure Environment Variables in Vercel Project Settings:

| Key | Example / Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` |
| `GEMINI_API_KEY` | `AIzaSy...` |
| `GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | `https://your-app.vercel.app/api/google/callback` |
| `CRON_SECRET` | `your-secure-random-token` |
| `SMTP_HOST` | `smtp.provider.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-smtp-user` |
| `SMTP_PASS` | `your-smtp-password` |

4. Deploy! Vercel will build the Next.js app and automatically register the cron job defined in [`vercel.json`](file:///home/aaa/Public/LifeOS/vercel.json).

---

## 4. Verification Checklist Post-Deployment

- [ ] Sign in / Register with a test user.
- [ ] Connect Google Calendar via the top navigation link.
- [ ] Submit natural-language inputs ("Dentist appointment Friday at 3 PM", "Buy groceries tomorrow").
- [ ] Verify items appear in Dashboard and Google Calendar.
- [ ] Trigger cron worker via GET request to `/api/cron/reminders` with `Authorization: Bearer <CRON_SECRET>`.

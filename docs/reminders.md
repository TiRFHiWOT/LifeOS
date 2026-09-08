# LifeOS Reminder Engine Documentation

The **LifeOS Reminder Engine** provides proactive alert processing for tasks and scheduled calendar events.

---

## Architecture Overview

1. **Trigger Calculation**:
   When a user creates a task with a due date or an event with relative reminder rules (e.g. *"Remind me 1 hour before"*), LifeOS calculates the exact `remind_at` timestamp and stores a row in `public.reminders` with `status = 'pending'`.

2. **Due Item Discovery**:
   The engine queries:
   ```sql
   SELECT * FROM public.reminders
   WHERE status = 'pending' AND remind_at <= NOW();
   ```

3. **Atomic Delivery Guard**:
   To prevent duplicate email/notification sends across parallel workers:
   - The status is immediately updated to `'sent'` before attempting delivery.
   - If sending fails, the status is reverted to `'failed'`.

4. **Delivery Transport**:
   - **SMTP / Email**: If `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` are configured in `.env.local`, notifications are delivered directly to the user's registered email address using `nodemailer`.
   - **Console / Local Log Fallback**: In development or demo mode without active SMTP credentials, notifications are logged securely with structured details.

---

## Scheduled Execution Options

### Option 1: Vercel Cron
Add `vercel.json` to the project root:
```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "* * * * *"
    }
  ]
}
```

### Option 2: Google Cloud Scheduler
Set up a HTTP target job pointing to `https://your-domain.com/api/cron/reminders` with header:
```text
Authorization: Bearer <CRON_SECRET>
```

### Option 3: Local Crontab / Systemd
Add a system crontab entry running every minute:
```bash
* * * * * curl -s http://localhost:3000/api/cron/reminders > /dev/null
```

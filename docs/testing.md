# LifeOS Testing & Demo Scenarios

This document outlines the mandatory MVP demo scenarios and automated verification results for LifeOS.

---

## Required Demo Scenarios

### Scenario 1 — Calendar & Reminder Sync
- **User Input**: *"Dentist appointment Friday at 3 PM. Remind me one hour before."*
- **Expected Behavior**:
  - Intent identified as `create_event`.
  - Event title set to *"Dentist appointment"*.
  - Event start time set to Friday at 15:00.
  - Linked reminder created for 60 minutes before (Friday at 14:00).
  - Synced to Google Calendar if access token is available.
  - Appears in Dashboard under **Events** & **Reminders**.

### Scenario 2 — Task Creation
- **User Input**: *"Buy groceries tomorrow."*
- **Expected Behavior**:
  - Intent identified as `create_task`.
  - Task title set to *"Buy groceries"*.
  - Due timestamp calculated for tomorrow.
  - Saved to Supabase database.
  - Appears in Dashboard under **Tasks**.

### Scenario 3 — Missing Information & Conversational Follow-Up
- **User Input (Turn 1)**: *"Meeting with Sarah tomorrow."*
- **Expected Behavior**:
  - AI identifies missing parameter (`startTime`).
  - Intent set to `missing_information`.
  - Assistant responds with follow-up question: *"What time is the meeting?"*.
- **User Input (Turn 2)**: *"At 2 PM."*
- **Expected Behavior**:
  - Gemini merges previous intent context (*Meeting with Sarah tomorrow*) with follow-up time (*2 PM*).
  - Event created for tomorrow at 14:00.
  - Appears in Dashboard under **Events**.

### Scenario 4 — Note Saving
- **User Input**: *"My apartment WiFi password is XXXXX."*
- **Expected Behavior**:
  - Intent identified as `create_note`.
  - Note title set to *"WiFi Password"*.
  - Note content saved as *"My apartment WiFi password is XXXXX."*.
  - Appears in Dashboard under **Notes**.

---

## Verification Test Runner

Run programmatic scenario verification via API endpoint:
```bash
curl -s http://localhost:3000/api/test/scenarios
```

Or run automated codebase verification suite:
```bash
npx tsc --noEmit && npm run lint && npm run build
```

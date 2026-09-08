# LifeOS Final Video Presentation & Demo Script

This script outlines the structure for presenting and demonstrating LifeOS.

---

## Video Outline (11 Sections)

1. **Problem Statement**:
   - Everyday life management requires juggling tasks, calendar events, passwords/notes, and reminders across fragmented apps.
   - LifeOS solves this by accepting natural language input and executing appropriate administrative actions automatically.

2. **Role & Domain Context**:
   - Domain: Personal Productivity / Administrative Assistant.
   - Target: Individuals seeking effortless time management without manual form entry.

3. **Solution Overview**:
   - Demonstrate LifeOS dashboard with natural-language prompt box, real-time KPI metrics, and structured tabs.

4. **Architecture & Tech Stack**:
   - Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Supabase PostgreSQL, Gemini API, Google Calendar API, Nodemailer SMTP.

5. **AI Agent Design**:
   - Show how Gemini parses natural language instructions into structured JSON intents (`create_event`, `create_task`, `create_note`, `create_reminder`, `missing_information`).

6. **Live Demo — Scenario 1 (Calendar & Reminder Sync)**:
   - Type: *"Dentist appointment Friday at 3 PM. Remind me one hour before."*
   - Show event created in Dashboard and synced to Google Calendar with reminder set for 14:00.

7. **Live Demo — Scenario 2 (Task Creation)**:
   - Type: *"Buy groceries tomorrow."*
   - Show task created with due date tomorrow and check completion toggle.

8. **Live Demo — Scenario 3 (Missing Information & Follow-Up)**:
   - Type: *"Meeting with Sarah tomorrow."*
   - Show assistant follow-up question: *"What time is the meeting?"*.
   - Type: *"At 2 PM."*
   - Show merged event created for 14:00 tomorrow.

9. **Live Demo — Scenario 4 (Note Saving)**:
   - Type: *"My apartment WiFi password is XXXXX."*
   - Show note saved in Notes grid.

10. **Challenges & Key Decisions**:
    - Preventing AI hallucination of timestamps via reference context injection.
    - Guaranteeing data isolation via Supabase Row Level Security (RLS).

11. **Future Improvements & Conclusion**:
    - Voice input integration, Gmail action triggers, multi-calendar support.

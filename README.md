# Coach Hub

A lightweight internal tool built to solve a real bottleneck in learning coaching: keeping up with 18+ students across different sprints, progress levels, and engagement states — without letting anyone fall through the cracks.

---

## The Problem

As a Learning Coach at TripleTen, the daily workflow involves monitoring each student's progress, identifying who needs a check-in, drafting a personalized message, and logging that it was sent. Done manually across a large cohort, this takes significant time and introduces inconsistency — the students who seem fine often get less attention than they need.

Coach Hub turns that process into a repeatable, data-driven system.

---

## What It Does

- Loads a student roster from a CSV/Excel export (LMS data)
- Calculates engagement status per student based on days since last lesson and last project submission
- Automatically classifies each student into a message category:
  - **Weekly Check-in** — active student, standard cadence
  - **Re-engagement** — 3+ days without a lesson or 7+ days without a project
  - **Close to Deadline** — 4+ days without a project submission
  - **Missed Deadline** — for students past their sprint deadline
  - **Sprint Resources** — when a student needs targeted help for their current module
- Generates a personalized SMS message using Gemini AI, with full context from the student's record (name, sprint, progress %, inactivity days, cohort start date)
- Lets the coach edit the message before sending, copy it to clipboard for Aircall, and log it to the student's history
- Persists notes and message history per student in the browser

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| AI | Google Gemini API (`gemini-3-flash`) |
| Data parsing | PapaParse + SheetJS |
| Icons | Lucide React |
| Persistence | localStorage |
| API server | Express (proxies Gemini calls so the API key never reaches the browser) |

---

## Business Logic

The core classification engine lives in `src/components/MainPanel.tsx`:

```ts
const autoCategory = (s: Student) => {
  const dl = s.daysSinceLesson < 0 ? 0 : s.daysSinceLesson;
  if (dl >= 3 || s.daysSinceProject >= 7) return 'engagement';
  if (s.daysSinceProject >= 4) return 'deadline';
  return 'regular';
};
```

Thresholds were defined based on actual coaching experience — 3 days without a lesson is typically the point where a student starts to disengage, not just take a day off. 7 days without a project submission usually signals a real blocker.

The AI prompt includes the student's name, current sprint, progress percentage, and inactivity metrics so the output reads like a message from someone who actually knows the student, not a generic template.

---

## Run Locally

**Prerequisites:** Node.js 18+

```bash
npm install
```

Create a `.env.local` file at the root:

```
GEMINI_API_KEY=your_key_here
```

```bash
npm run dev
```

This starts the Vite dev server (`:3000`) and the Express API server (`:3001`) together. The frontend never sees `GEMINI_API_KEY` — all Gemini calls go through `POST /api/generate-message` on the Express server, which is the only place the key is read.

App runs at `http://localhost:3000`.

For a production-style run: `npm run build` then `npm start` (Express serves the built frontend and the API from a single process).

---

## Data Format

Upload a CSV or Excel file exported from the LMS. Required columns:

`id`, `firstName`, `lastName`, `email`, `phone`, `sprint`, `progress`, `daysSinceProject`, `daysSinceLesson`, `lastLesson`, `lastProject`, `cohortStart`, `lmsLink`, `lcNotes`, `deadline`, `daysUntilDeadline`, `mbgStatus`, `extraWeeks`

---

## Why This Exists

This was built to reduce the mental load of context-switching between students during a coaching session. The goal was not to automate coaching — it was to eliminate the parts that don't require a human, so the human can focus on the parts that do.

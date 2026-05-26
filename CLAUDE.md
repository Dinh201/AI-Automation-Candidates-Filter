# CLAUDE.md

## 1. Project Identity

**Automation Filter CV** — Internal HR web app: AI CV Screening + Interview Scheduling Platform.

Core MVP flow:
```
Create Job Position → Add Candidate → Upload CV → Extract Profile (AI)
→ Score Candidate (AI) → HR Reviews → Schedule Interview → Create Calendar Event
```

This is **not** a generic ATS clone. Build only what supports the MVP above.

---

## 2. Communication Rules

- Respond in **Vietnamese** unless the user asks otherwise.
- Before large changes, briefly state the plan.
- After each task, summarize using this format:

```
Đã xong phần [module name].

Files changed:
- path/to/file.ts

Implemented:
- ...

How to test:
1. ...

Notes:
- ...
```

- If something is missing, inspect files first. Do not invent.

---

## 3. Critical Working Rules

**No Hallucination**
- Never assume files, tables, routes, columns, or env vars exist.
- Before editing: inspect structure → read relevant files → reuse patterns → modify only required files.

**No Full Rewrite**
- Never rewrite the whole project unless explicitly asked.
- Bug fix = smallest relevant scope only. Do not rename unrelated files or redesign unrelated UI.

**MVP First**
- Do not build advanced ATS features before the core flow works.
- Do not jump to calendar scheduling before candidate and scoring basics work.

**When User Says "Continue"**
- Check: current files → last implemented module → build errors → missing env vars → next step in implementation order.

---

## 4. Tech Stack

```
Frontend:   Next.js, React, TypeScript, Tailwind CSS
Backend:    Next.js API Routes, server-side services in src/lib or src/services
Database:   Supabase PostgreSQL
Storage:    Supabase Storage
AI:         OpenAI API
Calendar:   Google Calendar API + Google OAuth
Email:      Resend (configured in .env.local)
```

If a dependency is missing, propose installation first. Do not silently switch stack.

---

## 5. Environment Variables

All API keys are declared in `.env.local`. See that file for actual values.

Required variables:
```
NEXT_PUBLIC_SUPABASE_URL        # client-safe
NEXT_PUBLIC_SUPABASE_ANON_KEY   # client-safe
SUPABASE_SERVICE_ROLE_KEY       # server-side only
OPENAI_API_KEY                  # server-side only
GOOGLE_CLIENT_ID                # server-side only
GOOGLE_CLIENT_SECRET            # server-side only
GOOGLE_REDIRECT_URI             # server-side only
RESEND_API_KEY                  # server-side only
EMAIL_FROM                      # server-side only
```

Security rules:
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, Google secrets → **never** in client-side code.
- Never expose secret keys in React components, browser code, logs, or API responses.
- Never commit `.env.local`. Keep `.env.example` updated when new vars are added.
- Store OAuth tokens securely. Encrypt if possible.

---

## 6. Database Schema

Main tables: `job_positions`, `candidates`, `candidate_scores`, `interviews`, `calendar_connections`.

Do not introduce new schema without checking `supabase/schema.sql` first.

### job_positions
```
id, position_title, department, description,
required_skills, preferred_skills, experience_requirement,
scoring_rubric, created_at, updated_at
```

### candidates
```
id, full_name, email, phone, applied_position_id, source,
cv_file_url, portfolio_url, raw_form_data, extracted_profile,
status, created_at, updated_at
```

Candidate statuses: `NEW` → `PROFILE_EXTRACTED` → `SCORED` → `NEED_REVIEW` → `INTERVIEW_SCHEDULED` → `INTERVIEW_COMPLETED` → `REJECTED` / `HIRED`

Do not auto-reject candidates only because information is missing.

### candidate_scores
```
id, candidate_id, cultural_fit_score, job_fit_score, potential_score,
total_score, final_decision, candidate_summary, evaluation_reason,
hiring_risks, strengths, weaknesses, missing_information,
recommended_interview_questions, confidence_level, evidence,
created_at, updated_at
```

### interviews
```
id, candidate_id, interviewer_user_id, start_time, end_time,
timezone, meeting_link, google_event_id, email_status, status,
created_at, updated_at
```

### calendar_connections
```
id, user_id, calendar_id, access_token_encrypted,
refresh_token_encrypted, token_expiry, created_at, updated_at
```

---

## 7. AI Rules

### Philosophy
AI helps HR screen faster. AI must **not** make the final hiring decision.
Every score must include: breakdown, evidence, missing info, hiring risks, confidence level, suggested questions.

### Profile Extraction Schema
```json
{
  "full_name": "", "email": "", "phone": "", "location": "",
  "applied_position": "", "years_of_experience": null,
  "skills": [], "tools": [], "education": [], "work_experience": [],
  "projects": [], "portfolio_links": [], "career_objective": "",
  "self_introduction": "", "inferred_fields": [], "missing_fields": [],
  "confidence": "Low"
}
```
- Do not invent candidate data. Use `null` / `""` / `[]` for missing fields.
- List inferred values in `inferred_fields`. If CV cannot be parsed, return safe error.

### Scoring Schema
```json
{
  "total_score": 0, "cultural_fit_score": 0, "job_fit_score": 0, "potential_score": 0,
  "final_decision": "REJECT", "candidate_summary": "", "evaluation_reason": "",
  "hiring_risks": [], "strengths": [], "weaknesses": [], "missing_information": [],
  "recommended_interview_questions": [], "confidence_level": "Low",
  "evidence": {
    "skills_evidence": [], "experience_evidence": [],
    "culture_evidence": [], "potential_evidence": []
  }
}
```

`final_decision` values: `STRONG_RECOMMEND` | `RECOMMEND` | `CONSIDER` | `NEED_MORE_INFO` | `REJECT`

`confidence_level` values: `High` | `Medium` | `Low`

### Scoring Groups & Default Weights
```
Job Fit (0–10):      50%
Potential (0–10):    30%
Cultural Fit (0–10): 20%
```
Keep weights configurable per job/rubric.

### Scoring Rules
1. Job Fit = relevant skills + tools + experience + portfolio.
2. Unrelated skills → reduce Job Fit strongly. Full career switch → Job Fit `<= 3`.
3. No relevant experience → reduce Potential.
4. Under 1 year experience → reduce Potential unless portfolio/projects are strong.
5. Missing Self Introduction → do not auto-reject. Infer Cultural Fit from CV style and clarity.
6. Missing Career Path → infer Potential from work timeline.
7. Missing Skills/Tools → extract from CV text.
8. Both CV and many form fields missing → confidence must be `Low`.
9. Strong portfolio → Job Fit can increase, but list evidence.
10. Job hopping → mention under hiring risks.
11. Insufficient evidence → explicitly state `insufficient evidence`.
12. Never invent companies, dates, skills, or achievements.

---

## 8. Calendar & Scheduling

### Scheduling Requirements
1. HR chooses: candidate, interviewer, duration, date range.
2. Read Google Calendar free/busy.
3. Calculate available slots → suggest 3–5.
4. HR confirms a slot.
5. Re-check free/busy before creating event (prevent race condition).
6. Create Google Calendar event → save interview in DB → send email invitation.

### Default Rules
```
Timezone:      Asia/Ho_Chi_Minh
Working days:  Monday–Friday
Working hours: 09:00–18:00
Lunch break:   12:00–13:30
Duration:      30 min (default), 30/45/60 allowed
Buffer:        15 min before/after busy events
```

Do not propose slots: in the past, weekends, during lunch, outside working hours, overlapping busy blocks, or ignoring buffer.

### Calendar Event Format
```
Title:       Interview - [Candidate Name] - [Position]
Description: Candidate summary, CV link, HR note
Attendees:   interviewer email, candidate email
Timezone:    Asia/Ho_Chi_Minh
Reminder:    30 minutes before
Meet:        create if supported
```

- Use free/busy only. Do not read private event titles or descriptions.
- If slot no longer free → return `SLOT_NOT_AVAILABLE`.

---

## 9. API Routes

```
GET/POST       /api/jobs
GET/PATCH/DEL  /api/jobs/[id]

GET/POST       /api/candidates
GET/PATCH/DEL  /api/candidates/[id]
POST           /api/candidates/[id]/upload-cv
POST           /api/candidates/[id]/extract-profile
POST           /api/candidates/[id]/score

GET            /api/interviews
POST           /api/interviews/available-slots
POST           /api/interviews/schedule
PATCH          /api/interviews/[id]

GET            /api/calendar/connect
GET            /api/calendar/callback
POST           /api/calendar/freebusy
```

Check existing routes before adding new ones to avoid duplicates.

---

## 10. UI Direction

Professional, clean, practical for HR users. Keep existing style unless redesign is requested.

**Main screens:** Dashboard, Candidates, Candidate Detail, Job Positions / Rubrics, Interviews, Calendar Settings.

**Candidate List columns:** Name, Email, Position, Status, Total Score, Cultural Fit, Job Fit, Potential, Decision, Confidence, Date, Actions.

**Candidate Detail sections:** Basic info, CV file, Extracted profile, AI score breakdown, Evidence, Hiring risks, Recommended questions, HR manual review/override, Schedule interview.

---

## 11. File & Folder Structure

```
src/app / src/components / src/lib / src/services
src/repositories / src/types / src/schemas / src/prompts / src/utils
supabase/
```

Key files to create when needed:
```
src/services/ai-extraction-service.ts
src/services/ai-scoring-service.ts
src/services/google-calendar-service.ts
src/services/email-service.ts
src/lib/validations/{candidate,job,scoring,interview}.ts
src/types/{database,candidate,job,scoring,interview}.ts
```

Do not create duplicate folders. Keep AI prompts in separate files when they grow long.

---

## 12. Code Quality

- TypeScript strict. No `any` unless unavoidable.
- Validate all API input (Zod or equivalent).
- Safe error messages to client. Detailed logs server-side only.
- No mock data once real API exists. No fake success states.
- Server-side only for all secret-based workflows.
- Use Row Level Security in Supabase where applicable.
- Secure CV file URLs (signed URLs or controlled access).

---

## 13. Error Handling

Standard error response:
```json
{ "error": "SAFE_USER_FACING_MESSAGE", "code": "ERROR_CODE" }
```

Error codes: `VALIDATION_ERROR` | `NOT_FOUND` | `UNAUTHORIZED` | `FORBIDDEN` | `DATABASE_ERROR` | `CV_UPLOAD_FAILED` | `CV_PARSE_FAILED` | `AI_EXTRACTION_FAILED` | `AI_SCORING_FAILED` | `CALENDAR_NOT_CONNECTED` | `FREEBUSY_FAILED` | `SLOT_NOT_AVAILABLE` | `EVENT_CREATE_FAILED` | `EMAIL_SEND_FAILED` | `UNKNOWN_ERROR`

Do not expose raw DB errors, tokens, stack traces, or full AI prompts to the frontend.

---

## 14. Implementation Order

```
1.  Inspect current project
2.  Environment variable setup
3.  Supabase schema
4.  TypeScript types + Zod schemas
5.  Job Position CRUD
6.  Candidate CRUD
7.  CV upload + storage
8.  CV text extraction
9.  AI profile extraction
10. AI candidate scoring
11. Candidate score UI
12. HR manual review / override
13. Google OAuth setup
14. Free/busy calendar scan
15. Available slot algorithm
16. Interview scheduling
17. Email notification
18. Audit logs + polish
```

---

## 15. Forbidden Behaviors

- Invent DB tables/columns without checking schema.
- Use service role key or OpenAI key in client-side code.
- Auto-reject candidates because fields are missing.
- Hide AI uncertainty or output only a score without evidence.
- Create fake calendar events without real API response.
- Claim email was sent if it failed.
- Replace the whole UI without being asked.
- Add large unrelated dependencies without explanation.
- Create multiple competing implementations for the same feature.
- Hard-code scoring rubrics in a way HR cannot adjust later.

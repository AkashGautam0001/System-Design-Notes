# Episode 3: Quiz Game Core

## What We Build
- Server-side API routes for quiz generation and score saving
- `useQuiz` hook (state machine)
- TopicSelector component
- Quiz components: LoadingQuiz, QuizCard, QuizProgress, ScoreDisplay
- Solo quiz page orchestrating the full flow

## Pre-Recording Checklist
- [ ] Episodes 1-2 complete — auth working
- [ ] InsForge AI configured with OpenRouter key
- [ ] Can sign in and reach dashboard
- [ ] `quiz_scores` table created in InsForge (from Episode 1)

---

## Step 1: API Route — Quiz Generation

**Create `src/app/api/quiz/generate/route.ts`:**

- Uses **server-side** `insforgeServer` (keeps API key private)
- System prompt instructs AI to return JSON with exactly 10 questions
- Each question: `id`, `question`, `options` (4), `correctAnswer` (0-based index)
- Streams the response via `ReadableStream` for real-time UI feedback

```
POST /api/quiz/generate
Body: { "topic": "javascript" }
Response: Streamed text containing JSON
```

> **Key point:** We use `insforgeServer` from `src/lib/insforge-server.ts` in all API routes. This keeps the InsForge API key server-side.

---

## Step 2: API Route — Save Score

**Create `src/app/api/quiz/save-score/route.ts`:**

- Uses `insforgeServer.database.from("quiz_scores").insert({...})`
- Receives: `user_id`, `user_name`, `topic`, `score`, `total`
- Validates required fields, returns success/error

```
POST /api/quiz/save-score
Body: { "user_id": "...", "user_name": "...", "topic": "javascript", "score": 8, "total": 10 }
```

> **Key point:** All database operations go through server-side API routes — the client SDK does NOT have direct DB access. This is because the InsForge API key must stay server-side.

---

## Step 3: API Route — Fetch Scores

**Create `src/app/api/scores/route.ts`:**

- Uses `insforgeServer.database.from("quiz_scores").select("*")`
- Supports `topic` and `limit` query parameters
- Orders by score descending

```
GET /api/scores?topic=javascript&limit=50
```

---

## Step 4: TopicSelector Component

**Create `src/components/TopicSelector.tsx`:**

- Grid of topic cards (from `TOPICS` constant)
- Each card shows icon + label, uses `bg-default-100 border border-default-200 hover:border-primary`
- Custom topic input in a Card at the bottom
- Start Quiz button uses HeroUI `Button` with `variant="shadow"`

---

## Step 5: Update Dashboard

**Update `src/app/(protected)/dashboard/page.tsx`:**

- Import `TopicSelector`
- Solo tab: render `TopicSelector` with `onSelect` handler
- On select: generate UUID for session, navigate to `/quiz/{uuid}?topic={topic}`
- Multiplayer tab: card with `Button variant="shadow"` using `router.push("/multiplayer")`

---

## Step 6: useQuiz Hook

**Create `src/hooks/useQuiz.ts`:**

State machine with phases: `loading` → `playing` → `finished`

Methods:
- `generateQuiz()` — fetches `/api/quiz/generate`, reads stream, parses JSON, sets questions
- `answerQuestion(index)` — records answer, updates score
- `nextQuestion()` — advances index, or sets status to "finished"
- `saveScore(userId, userName)` — calls `/api/quiz/save-score` API route (NOT direct DB)

Returns: `{ session, streamedText, generateQuiz, answerQuestion, nextQuestion, saveScore }`

---

## Step 7: Loading Component

**Create `src/components/LoadingQuiz.tsx`:**

- Shows `Spinner` + "Generating your quiz..."
- Displays streamed AI text in a `<pre>` block (monospace, scrollable)
- Users see the JSON being built in real-time

---

## Step 8: QuizCard Component

**Create `src/components/QuizCard.tsx`:**

- Question text at the top in a Card
- 4 option buttons using HeroUI `Button` components (`variant="bordered"` by default)
- "Submit Answer" button with `className="px-8"` for padding
- After submit: correct option gets `color="success"` with `variant="flat"`, wrong gets `color="danger"`
- Custom SVG checkbox icon on selected option
- "Next Question" / "See Results" button

> **Important:** Use HeroUI `Button` for options instead of `RadioGroup` or `Checkbox` — they look better and align properly.

---

## Step 9: QuizProgress Component

**Create `src/components/QuizProgress.tsx`:**

- HeroUI `Progress` bar
- "Question X of Y" label + percentage

---

## Step 10: ScoreDisplay Component

**Create `src/components/ScoreDisplay.tsx`:**

- Big score number (e.g., "7 / 10")
- Grade label (Excellent/Great/Good/Keep Practicing)
- Color-coded based on percentage
- Buttons: Play Again, Explain Wrong Answers, View Leaderboard

---

## Step 11: Solo Quiz Page

**Create `src/app/(protected)/quiz/[sessionId]/page.tsx`:**

Orchestrates the full flow:
1. On mount: calls `generateQuiz()`
2. While loading: shows `LoadingQuiz` with streamed text
3. While playing: shows `QuizProgress` + `QuizCard`
4. When finished: shows `ScoreDisplay`, auto-saves score via API route
5. Score save errors are caught gracefully (`.catch()` sets `scoreSaved=true` to prevent retries)

---

## Step 12: Demo

1. Sign in → Dashboard
2. Pick "JavaScript" topic
3. Watch AI stream the quiz JSON in real-time
4. Answer 10 questions — see green/red feedback
5. Final score displayed
6. Navigate to Leaderboard — score appears

> **Recording tip:** Intentionally get some wrong to show the red feedback. Speed through a couple questions to keep the video moving.

# Episode 5: Leaderboard & Polish

## What We Build
- LeaderboardTable component
- Leaderboard page with pill-style topic filters
- API route for AI answer explanations
- ExplanationModal component
- Polish: color feedback on answers, navbar active states, landing page features

## Pre-Recording Checklist
- [ ] Episodes 1-4 complete — solo + multiplayer working
- [ ] Some quiz scores saved in DB (play a few rounds first)

---

## Step 1: LeaderboardTable Component

**Create `src/components/LeaderboardTable.tsx`:**

- HeroUI `Table` with striped rows
- Columns: Rank, Player, Topic, Score, Date
- Rank 1-3 get medal emojis (gold/silver/bronze)
- Topic shown as a `Chip` component (with `capitalize` for display)
- Score in monospace font (e.g., "8/10")
- Empty state: "No scores yet. Be the first!"

---

## Step 2: Leaderboard Page

**Create `src/app/(protected)/leaderboard/page.tsx`:**

- Title "Leaderboard" with subtitle
- **Pill-style topic filters** using HeroUI `Chip` components in a `flex flex-wrap gap-2` layout
  - "All Topics" + each topic from constants with their icons
  - Selected chip: `variant="solid" color="primary"`
  - Unselected chips: `variant="bordered" color="default"`
  - `onClick` handler switches the selected topic
- Fetches scores from `/api/scores?topic=X&limit=50`
- Re-fetches when topic filter changes
- Loading spinner while fetching

> **Key point:** We use Chips instead of Tabs for topic filtering — HeroUI Tabs render vertically with many items, while Chips wrap horizontally and look better.

---

## Step 3: API Route — Answer Explanation

**Create `src/app/api/quiz/explain/route.ts`:**

- Uses `insforgeServer.ai` for server-side AI calls
- Receives: question text, user's answer, correct answer
- System prompt: "You are a helpful tutor. Explain concisely why the correct answer is right."
- Streams the response for real-time display
- 2-3 sentences max per explanation

---

## Step 4: ExplanationModal Component

**Create `src/components/ExplanationModal.tsx`:**

- HeroUI `Modal` (large, scrollable)
- Lists each wrong answer with:
  - Question text
  - User's answer (red)
  - Correct answer (green)
  - AI explanation
- Fetches all explanations on open (sequentially to avoid rate limits)
- Loading state with spinner

---

## Step 5: Update ScoreDisplay

Add buttons:
- "Explain Wrong Answers" → opens ExplanationModal (only if there are wrong answers)
- "View Leaderboard" → links to `/leaderboard`

---

## Step 6: Polish QuizCard

- After answering: correct option gets `color="success"` with `variant="flat"`, wrong selection gets `color="danger"`
- Options disabled after answering
- Visual feedback using HeroUI `Button` color props

---

## Step 7: Update Navbar

- Leaderboard link added (already in place)
- Active link gets `text-primary` color
- Mobile-friendly (hidden on small screens, visible on sm+)

---

## Step 8: Polish Landing Page

- Feature cards already in grid layout
- 4 features: AI-Powered Quizzes, Real-Time Battles, Smart Explanations, Leaderboard
- Each with icon, title, description

---

## Step 9: Final Full Demo

1. **Start fresh:** Open app → Landing page → "Get Started"
2. **Sign up** with a new account → Verify email with OTP
3. **Solo quiz:** Pick JavaScript → watch AI stream → answer 10 questions → see score
4. **Explanations:** Click "Explain Wrong Answers" → see AI explanations
5. **Multiplayer:** Open second tab → sign in as different user → Create room → Join from first tab → Race → See live scores
6. **Leaderboard:** Navigate to leaderboard → filter by topic pills → see all scores

> **Recording tip:** This is the finale — show everything working end-to-end. Keep energy high and summarize what was built across all 5 episodes.

---

## Series Wrap-Up

### What We Built
- Full-stack AI quiz app with zero backend code
- InsForge handled: Auth (with email verification), Database (PostgreSQL via Admin API), AI (via OpenRouter), Realtime WebSockets
- HeroUI gave us beautiful, accessible components with minimal code
- Next.js 15 App Router for clean routing and server-side API routes

### Architecture Recap
- **2 SDK instances** — client (auth + realtime) and server (DB + AI)
- **5 API routes** — quiz/generate, quiz/save-score, quiz/explain, rooms, scores
- **3 custom hooks** — useAuth, useQuiz, useRealtime encapsulate all InsForge SDK calls
- **Route handlers** keep AI credentials and DB access server-side
- **Route groups** — `(auth)` for public pages, `(protected)` for auth-guarded pages
- **JSONB column** ensures both players get identical questions
- **WebSocket pub/sub** with `room:%` channel pattern enables real-time score sync
- **DB polling fallback** ensures multiplayer works even if a realtime event is missed

### Key Lessons Learned
- InsForge tables are created via Admin API (`POST /api/database/tables`), not dashboard UI
- Realtime channel patterns must be pre-registered (`POST /api/realtime/channels`)
- InsForge SDK database endpoint is `/api/database/records/{table}` (not `/rest/v1/`)
- Email verification is required after signup (OTP flow)
- Client SDK needs `anonKey` for realtime WebSocket authentication

### Possible Extensions
- Timer per question
- Different difficulty modes
- Team battles (2v2)
- Question categories within topics
- Achievement badges
- Social sharing of scores

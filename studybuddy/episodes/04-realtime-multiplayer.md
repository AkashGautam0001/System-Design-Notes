# Episode 4: Real-Time Multiplayer

## What We Build
- API route for room management (CRUD)
- `useRealtime` hook for WebSocket pub/sub
- RoomCreator component
- RoomJoiner component
- MultiplayerScoreboard component
- Multiplayer lobby page (create/join tabs)
- Multiplayer battle page (the complex one)

## Pre-Recording Checklist
- [ ] Episodes 1-3 complete — solo quiz working
- [ ] `quiz_rooms` table created in InsForge (from Episode 1)
- [ ] `room:%` realtime channel pattern created (from Episode 1)
- [ ] Two browser windows ready for demo
- [ ] Two separate InsForge accounts (same name is OK, but different emails)

> **Critical:** The realtime channel pattern `room:%` MUST be created before multiplayer will work. Without it, WebSocket subscribe succeeds silently but events are never delivered.

---

## Step 1: API Route — Room Management

**Create `src/app/api/rooms/route.ts`:**

Three methods using `insforgeServer`:
- `GET /api/rooms?code=ABC123` — fetch room by code
- `POST /api/rooms` — create a new room
- `PATCH /api/rooms` — update room (requires `room_code` in body)

> **Key point:** All DB operations go through server-side API routes, not the client SDK.

---

## Step 2: useRealtime Hook

**Create `src/hooks/useRealtime.ts`:**

Wraps InsForge WebSocket using the **client-side** `insforge` SDK:
- Connects and subscribes to `room:{code}` channel on mount
- Exposes a `ready` boolean — components should wait for this before publishing
- `on(event, handler)` — listens for events, unwraps server message payload, returns cleanup function
- `publish(event, data)` — waits for connection to be ready, then sends events to channel
- Auto-cleanup on unmount (unsubscribe)
- Returns `{ on, publish, ready }`

Events used:
- `player_joined` — guest joined the room
- `game_start` — host starts the game
- `score_update` — player answered a question
- `game_complete` — player finished all questions

> **Important:** The `publish()` method internally awaits the connection promise before sending. This prevents "Not connected" errors when components try to publish before the WebSocket handshake completes.

> **Important:** The `on()` handler unwraps the server message — InsForge sends `{ channel, event, payload, senderId, ... }`, so we extract `message.payload` for the actual data.

> **Important:** Event listeners should only be registered after `ready` is `true`. Add `if (!ready) return;` at the top of the useEffect that sets up listeners.

---

## Step 3: RoomCreator Component

**Create `src/components/RoomCreator.tsx`:**

Flow:
1. Show `TopicSelector`
2. On topic select → generate 6-char room code → create room via `POST /api/rooms`
3. Show code in `Snippet` component (copyable)
4. Generate quiz via `/api/quiz/generate` → store questions in room via `PATCH /api/rooms`
5. "Enter Room" button → navigate to `/multiplayer/{code}`

States: topic selection → creating → showing code (+ generating quiz) → ready

---

## Step 4: RoomJoiner Component

**Create `src/components/RoomJoiner.tsx`:**

- Input field for 6-character room code (auto-uppercase)
- "Join Room" button
- On join: fetch room via `GET /api/rooms?code=XXX` → validate (exists, not full) → update guest fields via `PATCH /api/rooms` → navigate to `/multiplayer/{code}`
- Error handling: room not found, room full

---

## Step 5: Multiplayer Lobby Page

**Create `src/app/(protected)/multiplayer/page.tsx`:**

- Title "Multiplayer Battle"
- Tabs: "Create Room" → RoomCreator, "Join Room" → RoomJoiner

---

## Step 6: MultiplayerScoreboard Component

**Create `src/components/MultiplayerScoreboard.tsx`:**

- Card showing both players' scores
- Each player: name, score/total, progress bar
- Checkmark when finished
- Updates in real-time via parent state

---

## Step 7: Battle Page (The Complex One)

**Create `src/app/(protected)/multiplayer/[roomCode]/page.tsx`:**

Game phases: `waiting` → `playing` → `finished`

### Key Implementation Details

**Room polling:** Fetch room data from `/api/rooms` every 2 seconds. This serves as a fallback for realtime — if a WebSocket event is missed, the DB poll catches it.

**Detecting game start (dual approach):**
1. Via realtime `game_start` event (instant)
2. Via DB polling — when `room.status === "playing"`, transition to playing phase

**Player initialization:** Use a `useRef` guard to initialize players only once. Without this, the room polling creates a new room object every 2 seconds, which would reset player scores.

**Questions:** Both players load questions from `room.questions` (JSONB column). The host stores them when creating the room. Handle both parsed JSON and string format: `typeof questions === "string" ? JSON.parse(questions) : questions`.

### Waiting Phase
- Fetch room from DB, determine if user is host (`room.host_id === user.id`)
- Host: see "Waiting for opponent..." until guest joins → "Start Game" button (disabled until `ready` and questions loaded)
- Guest: see "Waiting for host to start..."
- Guest publishes `player_joined` event on entry (only after `ready` is true)

### Host Starts Game
When host clicks "Start Game":
1. Update room status to `"playing"` in DB via `PATCH /api/rooms`
2. Publish `game_start` event via realtime
3. Set local phase to "playing"

> **Key point:** Updating the DB status is critical — it allows the guest to detect game start via polling even if the realtime event is missed.

### Playing Phase
- Both players get same questions (from room JSONB)
- Reuse `QuizCard` and `QuizProgress` components
- After each answer, publish `score_update` with `{ userId, score, currentIndex }`
- Sidebar shows `MultiplayerScoreboard` with live opponent progress

### Finished Phase
- Publish `game_complete` with `{ userId, finalScore }`
- Save score via `/api/quiz/save-score`
- Show comparison: winner declared, both scores displayed
- If opponent hasn't finished, show "Waiting for opponent..."

---

## Step 8: Update Dashboard

Update multiplayer tab to link to `/multiplayer` lobby page.

---

## Step 9: Demo (Two Browser Tabs)

1. **Tab 1:** Sign in as User A → Dashboard → Multiplayer → Create Room → pick topic
2. Wait for quiz to generate, copy room code
3. **Tab 2:** Sign in as User B → Multiplayer → Join Room → paste code
4. **Tab 1:** See "Player joined" → click Start Game
5. **Both tabs:** Race through questions, see opponent's progress update in real-time
6. **Winner:** See "You win!" comparison screen

> **Recording tip:** Position both browser windows side by side. Use two different accounts (can have the same display name, just different emails). Narrate the real-time events as they happen.

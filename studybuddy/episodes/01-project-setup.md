# Episode 1: Project Setup

## What We Build
- Scaffold the Next.js 15 app with TypeScript + Tailwind v4
- Configure HeroUI (dark theme)
- Set up InsForge SDK (client + server)
- Create database tables via InsForge Admin API
- Create realtime channel pattern
- Create shared types and constants
- Build the landing page

## Pre-Recording Checklist
- [ ] InsForge dashboard open (insforge.dev)
- [ ] OpenRouter API key ready
- [ ] Terminal open in Desktop/mongodb/

---

## Step 1: InsForge Dashboard Setup (Show on screen)

1. Go to **insforge.dev** → Create new project "StudyBuddy"
2. Go to **AI Configuration** → paste OpenRouter API key
3. Go to **Settings** → copy **Project URL** and **API Key**

> **Important:** InsForge provides only two credentials — a Project URL (public) and a single API Key (`ik_...`). The API key is used server-side for DB/AI operations, and also passed as `anonKey` to the client SDK for auth and realtime.

---

## Step 2: Create Database Tables via Admin API

InsForge auto-generates `id`, `created_at`, and `updated_at` fields for all tables — you only define your custom columns.

**Create `quiz_scores` table:**

```bash
curl -X POST "https://YOUR_PROJECT_URL/api/database/tables" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "quiz_scores",
    "columns": [
      {"columnName": "user_id", "type": "string", "isNullable": false, "isUnique": false},
      {"columnName": "user_name", "type": "string", "isNullable": false, "isUnique": false},
      {"columnName": "topic", "type": "string", "isNullable": false, "isUnique": false},
      {"columnName": "score", "type": "integer", "isNullable": false, "isUnique": false},
      {"columnName": "total", "type": "integer", "isNullable": false, "isUnique": false, "defaultValue": "10"}
    ]
  }'
```

**Create `quiz_rooms` table:**

```bash
curl -X POST "https://YOUR_PROJECT_URL/api/database/tables" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "quiz_rooms",
    "columns": [
      {"columnName": "room_code", "type": "string", "isNullable": false, "isUnique": true},
      {"columnName": "host_id", "type": "string", "isNullable": false, "isUnique": false},
      {"columnName": "host_name", "type": "string", "isNullable": false, "isUnique": false},
      {"columnName": "guest_id", "type": "string", "isNullable": true, "isUnique": false},
      {"columnName": "guest_name", "type": "string", "isNullable": true, "isUnique": false},
      {"columnName": "topic", "type": "string", "isNullable": false, "isUnique": false},
      {"columnName": "status", "type": "string", "isNullable": false, "isUnique": false, "defaultValue": "waiting"},
      {"columnName": "questions", "type": "json", "isNullable": true, "isUnique": false}
    ]
  }'
```

**Create realtime channel pattern for multiplayer:**

```bash
curl -X POST "https://YOUR_PROJECT_URL/api/realtime/channels" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "room:%",
    "description": "Quiz battle room channels",
    "enabled": true
  }'
```

> **Key point:** InsForge requires channel patterns to be registered before clients can subscribe. `room:%` matches any `room:XXXX` channel.

> **Recording tip:** Show the curl commands running in terminal and the success responses.

---

## Step 3: Scaffold Next.js App

```bash
npx create-next-app@latest studybuddy --typescript --tailwind --eslint --app --src-dir --no-import-alias --turbopack
cd studybuddy
```

Install dependencies:

```bash
npm install @heroui/react framer-motion @insforge/sdk uuid
```

---

## Step 4: Configure HeroUI with Tailwind v4

**Create `hero.ts`** in project root:

```ts
import { heroui } from "@heroui/react";
export default heroui();
```

**Update `src/app/globals.css`:**

```css
@import "tailwindcss";
@plugin "../../hero.ts";
@source "../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}";
@custom-variant dark (&:is(.dark *));

:root {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  font-family: var(--font-sans), system-ui, sans-serif;
}
```

> **Important:** The `@source` path is relative from `src/app/globals.css` — two levels up (`../../`) reaches the project root where `node_modules` lives. Getting this wrong means HeroUI component styles won't generate.

---

## Step 5: Create Providers

**Create `src/app/providers.tsx`:**

```tsx
"use client";

import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <HeroUIProvider navigate={router.push}>
      {children}
    </HeroUIProvider>
  );
}
```

**Update `src/app/layout.tsx`** to wrap with Providers and add `className="dark"` to `<html>`.

---

## Step 6: InsForge Clients (Client + Server)

InsForge uses a single API key. We create two SDK instances:

**Create `src/lib/insforge.ts`** (client-side — for auth + realtime):

```ts
import { createClient } from "@insforge/sdk";

// Client-side SDK — anonKey needed for auth and realtime WebSocket
export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});
```

**Create `src/lib/insforge-server.ts`** (server-side — for DB + AI):

```ts
import { createClient } from "@insforge/sdk";

// Server-side SDK — uses API key for DB, AI, and privileged operations
export const insforgeServer = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.INSFORGE_API_KEY!,
  headers: {
    "x-api-key": process.env.INSFORGE_API_KEY!,
  },
});
```

**Create `.env.local`:**

```env
NEXT_PUBLIC_INSFORGE_URL=https://your-project.ap-southeast.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=ik_your_api_key_here
INSFORGE_API_KEY=ik_your_api_key_here
```

> **Key point:** Both env vars use the same API key. `NEXT_PUBLIC_` prefix makes it available in the browser (needed for auth cookies + realtime WebSocket). `INSFORGE_API_KEY` (no prefix) stays server-side only for privileged DB/AI operations in API routes.

---

## Step 7: Constants & Types

**Create `src/lib/constants.ts`** — 12 topics with icons/labels/values, `AI_MODEL = "openai/gpt-4o-mini"`, `QUIZ_CONFIG` with 10 questions and 6-char room codes

**Create `src/types/index.ts`** — QuizQuestion, QuizSession, QuizScore, QuizRoom, PlayerScore interfaces

---

## Step 8: Landing Page

**Update `src/app/page.tsx`:**
- Gradient title "StudyBuddy"
- Subtitle text
- "Get Started" (primary button → /signup) and "Sign In" (bordered button → /login)
- 4 feature cards in a grid

---

## Step 9: Verify

```bash
npm run dev
```

Open http://localhost:3001 — you should see the styled landing page with dark theme and HeroUI components.

> **Note:** If port 3000 is occupied (e.g., by InsForge Docker), Next.js auto-uses port 3001.

> **Recording tip:** End with a quick scroll through the landing page to show the gradient, buttons, and feature cards.

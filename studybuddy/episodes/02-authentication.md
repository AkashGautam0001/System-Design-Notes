# Episode 2: Authentication

## What We Build
- `useAuth` hook wrapping InsForge auth SDK
- Sign Up page
- Email Verification page (OTP flow)
- Login page
- Protected route layout (auth guard)
- Navbar with user info + logout
- Dashboard page (stub with tabs)

## Pre-Recording Checklist
- [ ] Episode 1 complete — app running with landing page
- [ ] InsForge project credentials in `.env.local`
- [ ] Two email addresses ready for testing (for multiplayer later)

---

## Step 1: Create the useAuth Hook

**Create `src/hooks/useAuth.ts`:**

This hook wraps all InsForge auth operations using the **client-side** `insforge` SDK:
- `checkSession()` — calls `insforge.auth.getCurrentUser()`, sets user state
- `signUp(email, password, name)` — calls `insforge.auth.signUp()` — does NOT auto-sign in (email verification required first)
- `verifyEmail(email, code)` — calls `insforge.auth.verifyEmail({ email, otp: code })` to verify with OTP
- `resendVerification(email)` — calls `insforge.auth.resendVerificationEmail({ email })`
- `signIn(email, password)` — calls `insforge.auth.signInWithPassword()`
- `signOut()` — calls `insforge.auth.signOut()`
- Returns `{ user, loading, signUp, verifyEmail, resendVerification, signIn, signOut, checkSession }`

> **Key point:** InsForge requires email verification after signup. The user profile name is at `data.user.profile?.name` (not `displayName`). The verify method uses `otp` parameter (not `code`).

> **Key point:** Components never call `insforge.auth` directly — only through this hook.

---

## Step 2: Build the Signup Page

**Create `src/app/(auth)/signup/page.tsx`:**

- HeroUI `Card` with `CardHeader` + `CardBody`
- Form with `Input` fields: Name, Email, Password
- `Button` calls `signUp()` → on success, redirects to `/verify` (NOT `/dashboard`)
- Error display + loading state
- Link to `/login` for existing users
- Link to `/verify` for "Already signed up? Verify Email"

> **Important:** After signup, user must verify their email before they can sign in. Redirect to the verify page, not dashboard.

> **Recording tip:** Show the route group `(auth)` concept — explain it doesn't affect the URL.

---

## Step 3: Build the Email Verification Page

**Create `src/app/(auth)/verify/page.tsx`:**

- HeroUI Card with Email, OTP Code, and Password inputs
- "Verify & Sign In" button — calls `verifyEmail()`, then `signIn()`, then redirects to `/dashboard`
- "Resend Code" button — calls `resendVerification()`
- Links back to `/signup` and `/login`
- All links and buttons use HeroUI components (`Button`, `Link`)

> **Key point:** The verification page is standalone — users can navigate to it directly if they left after signup.

---

## Step 4: Build the Login Page

**Create `src/app/(auth)/login/page.tsx`:**

- Same card layout as signup
- Email + Password inputs
- Calls `signIn()` → redirects to `/dashboard`
- Link to `/signup` and `/verify`

---

## Step 5: Build the Protected Layout

**Create `src/app/(protected)/layout.tsx`:**

- Uses `useAuth()` to check session
- If `loading` → show `Spinner`
- If no `user` → redirect to `/login`
- If authenticated → render `Navbar` + `{children}`

> **Key point:** Every page under `(protected)/` is automatically guarded.

---

## Step 6: Build the Navbar

**Create `src/components/Navbar.tsx`:**

- HeroUI `Navbar` with brand "StudyBuddy"
- Nav links: Dashboard, Multiplayer, Leaderboard
- Active link highlighting based on `usePathname()`
- User dropdown (name + email + Sign Out)

---

## Step 7: Dashboard Stub

**Create `src/app/(protected)/dashboard/page.tsx`:**

- Welcome heading with user's name
- HeroUI `Tabs` (`variant="bordered"`) for "Solo Quiz" and "Multiplayer Battle"
- Solo tab will have TopicSelector (built in Episode 3)
- Multiplayer tab has a card with button using `router.push("/multiplayer")`

---

## Step 8: Demo Flow

1. Go to `/signup` → create an account with name, email, password
2. Redirected to `/verify` → enter email, OTP code from email, password
3. Verified and signed in → redirected to `/dashboard`
4. See welcome message + navbar
5. Click user dropdown → Sign Out
6. Redirected to `/login`
7. Sign in with same credentials → back to dashboard

> **Recording tip:** Check your email for the OTP code on camera. Show the full verify flow.

# MIMIZEN 01 — Foundrs Product Overview

## 1. Architecture & Stack
- **Frontend:** React 18 + TypeScript + Vite, Tailwind & shadcn UI, Lucide icons.
- **State/Data:** Supabase (auth, Postgres tables, storage, realtime channels) + TanStack React Query.
- **Routing:** React Router SPA with Vercel rewrite (`vercel.json`).
- **Notifications & Messaging:** Supabase channels, web push helpers, custom hooks (`use-notifications`, `usePushNotifications`).
- **Branding Assets:** Custom favicon (SVG/PNG/ICO) generated via `scripts/generate_favicon.py`; meta tags updated in `index.html`.

## 2. User Journey & Key Screens
1. **Landing Page (`/`)**
   - Hero pitch for daily standups, testimonials, CTA buttons (Begin check-in / Sign in).
   - Explains rituals, streak mechanics, and community vibe.
2. **Auth (`/auth`)**
   - Email/password login & signup using Supabase.
   - Magic-link email redirects configured to production URL (no localhost).
   - OAuth buttons ready (placeholders) + warm gradient branding.
3. **Dashboard (`/dashboard`)**
   - **Goal Input:** Users post daily goals with due time, priority, success metric, blockers, motivation, join limit (1–10) and conditions.
   - **Goal Feed:** Shows other founders’ goals (avatar, priority, motivation). Automatically hides goals once join slots are full or due time passes, but they remain in the poster’s library.
   - **Join Flow:** "Join Goal" opens `MessageUserDialog`, reserves a slot via Supabase RPC, checks existing partnerships, and sends a partnership request message.
   - Sidebar includes streak tracker, profile editor (username + avatar upload), notification settings, navigation shortcuts, and logout.
4. **My Goals (`/my-goals`)**
   - Sidebar tabs render three dedicated views (only one visible at a time):
     - **Add New Goal:** Same form as dashboard for personal planning.
     - **Recent Goals:** Latest 5 goals with metadata and "Mark complete" action (updates Supabase + streak).
     - **Goals Library:** Archive of up to 50 goals with status badges, due dates, and quick actions.
5. **Partners (`/partners`)**
   - Real-time messaging, shared milestones, typing indicators, and video standup scheduling (Supabase channels `messages-*`, `milestones-*`, `presence-*`).
6. **Mailroom & Notifications (`/mailroom`, `/notifications`)**
   - Manage push/email preferences, inbox-style updates, and web-push enrollment hooks.
7. **Profiles (`/profile`, `/profile/view/:userId`)**
   - Users edit bios, stages, socials, avatar.
   - Public profile cards display streaks, recent goals, and partnership info.

## 3. Data Model Highlights
- `goals`: goal_text, date, due_at, priority, success_metric, blockers, motivation, join_limit, join_current_count, completed.
- `profiles`: username, avatar_url, current_streak, longest_streak, founder_stage, bio.
- `messages`, `shared_milestones`, `video_sessions`, `partnerships` support collaboration features.
- Custom Supabase RPC functions (`reserve_goal_join_slot`, `release_goal_join_slot`) enforce join limits.

## 4. Deployment & Tooling
- Hosted on **Vercel** (build: `npm run build`, output `dist`).
- SPA rewrite via `vercel.json` ensures deep links resolve to `index.html`.
- Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_VAPID_PUBLIC_KEY`) provided via Vercel dashboard.
- Git history rewritten with `git-filter-repo` to remove bot contributors; repo of record: `https://github.com/Usd650B/Foundrs-BETA`.

## 5. User Capabilities Summary
1. Sign up / log in with Supabase, confirm email via production redirect.
2. Draft multiple goals per day, including rich metadata.
3. Browse live goal feed, request accountability partnerships, and chat.
4. Track own goals via Add / Recent / Library views; mark completion and update streaks.
5. Manage partnerships (messages, milestones, video standups).
6. Configure notification preferences & view mailroom updates.
7. Edit profile and view other founders’ profiles.

## 6. Recent Fixes & Enhancements
- Auth page restyled with brand palette and improved hero.
- Added branded favicons & removed Lovable references.
- Vercel SPA routing fixed (catch-all rewrites) + Supabase redirect URLs updated—no more localhost links in emails.
- Goal feed filtering ensures only available/active goals are public; completed/full/expired goals live in My Goals library.
- My Goals reworked into tabbed experience (Add, Recent, Library) with exclusive rendering per tab.
- Git history cleaned (removing `lovable-dev[bot]` & `gpt-engineer-app[bot]`) and pushed to beta repo.

---
This document mirrors the walkthrough your co-founder requested: end-to-end flow, feature set, tech stack, and recent changes so anyone reviewing the repo understands exactly how Foundrs operates today.

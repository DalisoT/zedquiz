# ZedQuiz - Project Memory

## Overview
ZedQuiz is a Next.js 14 (App Router) + TypeScript web app for Zambian ECZ exam preparation. It uses Supabase for auth/database/storage and Groq API (Llama 3.3 70B) for AI-powered question parsing.

---

## What Was Done

### 1. Role-Based Access Control
- **Fixed middleware** (`app/middleware.ts`): `super_admin` now allowed in `/admin/*` routes; strict role guards for `/teacher/*` and `/student/*`
- **Role dashboards**: `/dashboard` now redirects admin/super_admin → `/admin/dashboard`, teacher → `/teacher/dashboard`
- **New redirect pages**: `app/student/page.tsx` → `/student/practice`, `app/teacher/page.tsx` → `/teacher/dashboard`
- **API role fixes**: `/api/users/route.ts`, `/api/users/[id]/role/route.ts`, `/api/marking-keys/[id]/approve/route.ts` — now allow `super_admin`

### 2. Papers Upload Fix
- **Fixed hardcoded userId**: `app/api/papers/upload/route.ts` — now uses `supabase.auth.getUser()` session instead of formData `userId`
- **Removed hardcoded userId** from `app/admin/papers/page.tsx` form submission
- **Added upload feedback**: `app/admin/papers/page.tsx` — spinner during upload + success/error message bar
- **Added RLS SELECT policy**: `supabase-papers-migration.sql` — teachers/admins can see their own papers

### 3. Security Fixes
- **Removed stack trace exposure**: `app/api/papers/upload/route.ts` — no more `stack: e.stack` in 500 responses
- **Removed password logging**: `app/api/auth/login/route.ts` — now logs masked email only
- **Fixed IDOR in paper upload**: userId now comes from session, not client
- **Auth on protected routes**: `/api/packs/download/route.ts` — now requires authentication
- **Fixed increment_points RPC**: `app/api/quizzes/[id]/submit/route.ts` — now passes `user_id_input` parameter and logs errors instead of silent catch

### 4. Cookie Security
- **Changed sameSite**: `lax` → `strict` (CSRF protection)
- **Reduced access token expiry**: 7 days → 1 hour
- **Refresh token**: stays at 7 days

### 5. Comprehensive SQL Migration (`supabase-comprehensive-migration.sql`)
Created and applied in Supabase SQL Editor. Includes:
- **New tables**: `exams`, `quizzes`, `quiz_questions`, `exam_questions`, `marking_keys`, `teacher_subjects`
- **Fixed insecure RLS policies**: `papers`, `paper_questions` — replaced `WITH CHECK (true)` with proper role checks
- **Added RLS** for all new tables
- **Added `updated_at` triggers** and trigger function `update_updated_at_column()`
- **Added missing indexes** on all FKs and frequently queried columns
- **Column renames**: `time_taken_seconds` → `time_spent_seconds` (wrapped in exception blocks)

### 6. TypeScript Types
- **`types/database.ts`**: Full type definitions for all tables (Profile, Question, Quiz, Exam, Paper, etc.)
- **`lib/auth.ts`**: Reusable helpers — `requireAuth()`, `requireRole()`, `requireAdmin()`, `requireTeacher()`, `isAdmin()`, `errorResponse()`
- **`lib/validation.ts`**: Zod schemas for all POST endpoints (createQuizSchema, createExamSchema, etc.)
- **`lib/paperProcessor.ts`**: AI/OCR paper processing logic
- **`lib/supabaseClient.ts`**: Supabase client + all DB queries

### 7. Zod Input Validation
- Applied to `/api/exams/route.ts` and `/api/quizzes/route.ts` — validates title, class_id, subject_id, time limits, etc.
- Schema: `lib/validation.ts` with `validateSchema()` utility

### 8. Admin User Management UI
- **`app/admin/users/page.tsx`**: Full admin panel to view all users and change roles
- Features: filter by role, user counts, role badges (color-coded), streak/points display, loading skeletons, success/error toasts, `super_admin` protected from role change
- Accessible at `/admin/users`

### 9. Signup Email Confirmation
- **`app/signup/page.tsx`**: Shows amber alert when email confirmation is needed, hides form, shows resend button

---

## Role System

| Role | Access |
|------|--------|
| `super_admin` | Full platform access, user management, cannot be demoted |
| `admin` | `/admin/*` — users, subjects, marking keys, papers |
| `teacher` | `/teacher/*` — question bank, quizzes, exams, paper processing |
| `student` | `/dashboard`, `/student/*` — practice, quizzes, exams, downloads |

**Creating admin/teacher accounts:**
1. User signs up at `/signup` → becomes `student`
2. Admin promotes them via `/admin/users` → change role dropdown
3. On next login they go to their correct portal

**Creating super_admin:** Only via SQL (intentional gatekeeper):
```sql
UPDATE profiles SET role = 'super_admin' WHERE id = 'user-uuid';
```

---

## Account Currently Set as super_admin
- ID: `85bee6dc-d3cc-4f76-8e36-d556a44b6ad2`
- Set in `supabase-migration.sql` line 384

---

## Files Modified/Created

| File | Change |
|------|--------|
| `app/middleware.ts` | Role-based route protection fix |
| `app/dashboard/page.tsx` | Redirect non-student roles |
| `app/student/page.tsx` | New — redirect to practice |
| `app/teacher/page.tsx` | New — redirect to dashboard |
| `app/api/users/route.ts` | Allow super_admin |
| `app/api/users/[id]/role/route.ts` | Allow super_admin |
| `app/api/marking-keys/[id]/approve/route.ts` | Allow super_admin |
| `app/api/papers/upload/route.ts` | Use session userId, remove stack trace |
| `app/api/packs/download/route.ts` | Add auth check |
| `app/api/quizzes/[id]/submit/route.ts` | Fix RPC call, add error logging |
| `app/api/auth/login/route.ts` | Fix cookie security, remove password logging |
| `app/api/exams/route.ts` | Add Zod validation |
| `app/api/quizzes/route.ts` | Add Zod validation |
| `app/admin/papers/page.tsx` | Remove hardcoded userId, add upload feedback |
| `app/admin/users/page.tsx` | Full admin user management UI |
| `app/signup/page.tsx` | Email confirmation flow |
| `supabase-comprehensive-migration.sql` | New — all RLS, tables, indexes, triggers |
| `types/database.ts` | New — TypeScript types |
| `lib/auth.ts` | New — auth helpers |
| `lib/validation.ts` | New — Zod schemas |

---

## Still TODO / Recommendations

1. **Signup sends email confirmation** but resend button doesn't actually resend yet (the onClick re-calls signup which won't help — need Supabase's resend confirmation email API)
2. **No rate limiting** on auth endpoints (`/api/auth/login`, `/api/auth/signup`)
3. **No automatic token refresh** in AuthContext — tokens expire and user has to re-login manually
4. **No Zod validation** on remaining POST routes (practice/mark, points-history, papers/upload, etc.)
5. **Leaderboard is a placeholder** — `/app/leaderboard/page.tsx` shows "Coming soon"
6. **Badges page is placeholder** — `/app/badges/page.tsx` shows "Coming soon"
7. **Groq API key is hardcoded in .env.local** — ensure `.env.local` is in `.gitignore` and not committed
8. **No offline sync conflict resolution** in `lib/offlineStore.ts`
9. **No input validation** on PDF file uploads (size limits, content-type validation)
10. **No audit log** for role changes

---

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Postgres, Storage, Realtime)
- **AI/OCR**: Groq API (Llama 3.3 70B), Tesseract.js
- **PDF**: pdfjs-dist 5.6.205
- **PWA**: Service worker + IndexedDB (`public/sw.js`, `lib/offlineStore.ts`)
- **Package Manager**: pnpm

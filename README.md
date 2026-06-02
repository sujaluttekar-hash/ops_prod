# StayVista — Butler Operations Platform

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000 — it redirects to /login automatically.
Login with any email + password (mock auth, no backend yet).

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

No environment variables needed at this stage (all mock data).

## Project structure

```
app/
  login/          Login page
  dashboard/      Operations overview
  delight/        Guest delight calendar + log
  tasks/          Utilisation tasks with photo upload
  roster/         Weekly roster grid + shift swaps
  huddle/         Butler huddle scheduling + attendance
  training/       Functional training schedule
  quiz/           Interactive quizzes + leaderboard
  credentials/    Encrypted credentials vault
  reports/        Analytics, scorecards, exports

lib/
  data.ts         All mock data (replace with Supabase queries)
  utils.ts        Shared helper functions

components/
  layout/         Topbar component
```

## Adding Supabase later

1. `npm install @supabase/supabase-js`
2. Create `lib/supabase.ts` with your client
3. Replace imports from `@/lib/data` with Supabase queries in each page
4. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   ```

## Brand

StayVista colors: #9CCCFC (blue) · #FED5A9 (peach) · #E9A0A7 (coral) · #F2F2F2 (cream)

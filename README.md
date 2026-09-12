# Pokemon Master Set Tracker

A web app for tracking your progress toward completing a "master set" (every
card) of a Pokemon TCG set released in 2026. Register an account, pick a set,
and check off cards as you collect them, watching a progress bar fill in.

**Live app:** _add your Netlify URL here after deploying_
**Demo video:** _add your unlisted YouTube link here_

## What it does

- Users register, log in, and log out (Supabase Auth).
- Each 2026 Pokemon TCG set and its cards are stored in the database.
- Signed-in users can mark individual cards as owned; a per-set progress bar
  shows how close they are to a master set.
- Card ownership is private per user (enforced with Supabase Row Level
  Security), so multiple people can track the same set independently.

## Technologies used

- **Frontend:** React + Vite
- **Backend/Database:** Supabase (Postgres + Auth)
- **Card data source:** [pokemontcg.io](https://pokemontcg.io) public API
- **Deployment:** Netlify

## Project structure

```
src/
  lib/supabaseClient.js   Supabase client setup
  pages/Login.jsx         Register / log in form
  pages/Dashboard.jsx     List of sets with progress bars
  pages/SetDetail.jsx     Card grid with owned checkboxes
  App.jsx                 Auth state + page routing
scripts/seed-cards.mjs    One-time script to load a set's cards from the API
supabase-schema.sql       Database tables + Row Level Security policies
```

## Setup instructions

### 1. Create a Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run everything in `supabase-schema.sql` to create the
   `sets`, `cards`, and `user_cards` tables and their security policies.
3. From Project Settings > API, copy the **Project URL**, **anon public
   key**, and **service_role key**.

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your Supabase URL and anon key:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install dependencies

```
npm install
```

### 4. Seed a 2026 set

Find a set ID at `https://api.pokemontcg.io/v2/sets` (filter for a 2026
`releaseDate`), then run the seed script with your **service role** key set
as an environment variable (this key must never be committed or used in the
frontend):

```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co SUPABASE_SERVICE_ROLE_KEY=your-service-role-key npm run seed -- <setId>
```

Repeat for each 2026 set you want to track.

### 5. Run locally

```
npm run dev
```

### 6. Deploy

Push to GitHub, then connect the repo to Netlify:

- Build command: `npm run build`
- Publish directory: `dist`
- Add the two `VITE_SUPABASE_*` environment variables in Netlify's site
  settings (never the service role key).

## Notes

- The Pokemon TCG API occasionally returns intermittent server errors when
  used without an API key; the seed script retries with backoff. A free key
  from [pokemontcg.io](https://pokemontcg.io) avoids this if it happens often.
- `user_cards` rows are protected by Row Level Security so each user only
  ever sees and edits their own ownership data.

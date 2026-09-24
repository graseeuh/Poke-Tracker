# Pokemon Master Set Tracker

A web app for tracking your progress toward completing a "master set" (every
card) of a Pokemon TCG set released in 2026. Register an account, pick a set,
and check off cards as you collect them, watching a progress bar fill in.

**Live app:** https://poke-tracker-nine.vercel.app
**Demo video:** _add your unlisted YouTube link here_

## What it does

- Anyone can browse and search every 2026 Pokemon TCG set and its full card
  list with no account (data pulled live from the [pokemontcg.io](https://pokemontcg.io) API).
- Users register, log in, and log out (Supabase Auth). Logging in is only
  required to track a set.
- Signed-in users **favorite** a set (Create) to start tracking it, **view**
  their tracked sets and card lists on the Dashboard (Read), **mark cards
  owned/unowned** (Update) with a live progress bar, and **unfavorite** a set
  (Delete) to stop tracking it — full CRUD over their own tracking data.
- Card ownership and favorites are private per user (enforced with Supabase
  Row Level Security), so multiple people can track the same set
  independently.

## Technologies used

- **Frontend:** React + Vite
- **Backend/Database:** Supabase (Postgres + Auth)
- **Card data source:** [pokemontcg.io](https://pokemontcg.io) public API
- **Deployment:** Vercel

## Project structure

```
src/
  lib/supabaseClient.js     Supabase client setup
  lib/pokemonApi.js         Public pokemontcg.io API client (live set/card data)
  lib/seedSet.js            Seeds a set's cards into Supabase the first time it's favorited
  lib/cardMapper.js         Shared API-response -> DB-row mapping
  lib/priceUtils.js         TCGplayer price extraction helpers
  components/SiteHeader.jsx Persistent header + auth controls
  components/CardModal.jsx  Card detail popup
  pages/Login.jsx           Register / log in form
  pages/FindSets.jsx        Browse/search all 2026 sets, favorite (star) to track
  pages/Dashboard.jsx       Signed-in user's tracked sets with progress bars
  pages/SetDetail.jsx       Rarity-grouped card grid with owned checkboxes
  pages/ArtistWorks.jsx     Gallery of a card artist's other work
  App.jsx                   Auth state + view routing
scripts/seed-cards.mjs      CLI script to bulk-load a set's cards from the API
supabase-schema.sql         Database tables + Row Level Security policies
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

Push to GitHub, then import the repo into [Vercel](https://vercel.com):

- Framework preset: Vite (auto-detected)
- Build command: `vite build`
- Output directory: `dist`
- Add the two `VITE_SUPABASE_*` environment variables in Vercel's project
  settings (never the service role key).
- Under Settings > Deployment Protection, make sure Vercel Authentication /
  Password Protection is **disabled** so the app is publicly reachable.

## Notes

- The Pokemon TCG API occasionally returns intermittent server errors when
  used without an API key; the seed script retries with backoff. A free key
  from [pokemontcg.io](https://pokemontcg.io) avoids this if it happens often.
- `user_cards` rows are protected by Row Level Security so each user only
  ever sees and edits their own ownership data.

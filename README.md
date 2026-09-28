# PokeBind

A web app for tracking your progress toward completing a "master set" (every
card) of a Pokemon TCG set released in 2026. Search for a set, favorite it to
start tracking it, and check off cards as you collect them, watching a
progress bar fill in across your whole binder.

**Live app:** https://poke-tracker-nine.vercel.app
**Demo video:** https://youtu.be/_yO5lXa0-m0
**Repo:** https://github.com/graseeuh/Poke-Tracker

## What it does

- Search every 2026 Pokemon TCG set by name with no account required (data
  pulled live from the [pokemontcg.io](https://pokemontcg.io) API, with our
  own Supabase database as an automatic fallback when that public API is
  temporarily down).
- Register, log in, and log out (Supabase Auth). Sessions persist across
  browser restarts, and logging in is only required to actually track a set.
- Signed-in users **favorite** a set (Create) to start tracking it, **view**
  their tracked sets and full card lists on the Binder page (Read), **mark
  cards owned/unowned** (Update) with a live progress bar per set and
  per-card filtering (all / owned only / not owned only), and **unfavorite**
  a set (Delete) to stop tracking it — full CRUD over their own tracking
  data.
- Card ownership and favorites are private per user, enforced with Supabase
  Row Level Security, so multiple people can track the same set
  independently.
- Cards are grouped into themed sections by rarity (chase cards get their
  own showcase, common/uncommon/rare are grouped as the main set), with an
  artist-credit page that shows every other card a given illustrator worked
  on.
- Real, browser-based URL routing (`/`, `/binder`, `/sets/:id`,
  `/artist/:name`) — refreshing, sharing a link, or using the browser
  back/forward buttons lands you back on the same page instead of resetting
  to the home screen.

## Technologies used

- **Frontend:** React + Vite
- **Backend/Database:** Supabase (Postgres + Auth + Row Level Security)
- **Card data source:** [pokemontcg.io](https://pokemontcg.io) public API,
  with set metadata/logos and card data cached into our own database as a
  fallback
- **Deployment:** Vercel

## Project structure

```
src/
  lib/supabaseClient.js     Supabase client setup
  lib/pokemonApi.js         Public pokemontcg.io API client (live set/card data)
  lib/seedSet.js            Seeds a set's cards into Supabase the first time it's favorited
  lib/cardMapper.js         Shared API-response -> DB-row mapping
  lib/priceUtils.js         TCGplayer market-price extraction helper (used at seed time)
  components/SiteHeader.jsx Persistent header + auth controls
  components/PixelBallField.jsx  Decorative pixel Poke Ball background animation
  components/CardModal.jsx  Card detail popup
  pages/Login.jsx           Register / log in / forgot-password form
  pages/FindSets.jsx        Search all 2026 sets, favorite (star) to track
  pages/Dashboard.jsx       Signed-in user's Binder: tracked sets with progress
  pages/SetDetail.jsx       Rarity-grouped card grid with owned checkboxes/filter
  pages/ArtistWorks.jsx     Gallery of a card artist's other work
  pages/ResetPassword.jsx   Password-reset confirmation flow
  App.jsx                   Auth state + client-side URL routing
scripts/seed-cards.mjs      CLI script to bulk-load a set's cards from the API
supabase-schema.sql         Database tables + Row Level Security policies
vercel.json                 SPA rewrite so direct/refreshed routes work on Vercel
```

## Setup instructions

### 1. Create a Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run everything in `supabase-schema.sql` to create the
   `sets`, `cards`, `user_cards`, and `favorite_sets` tables and their Row
   Level Security policies.
3. From Project Settings > API, copy the **Project URL**, **anon/publishable
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

Repeat for each 2026 set you want to track. (In the app itself, a set is
also seeded automatically the first time any user favorites it.)

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
  settings (never the service role key), scoped to Production.
- `vercel.json` is already committed, so deep links like `/binder` and
  `/sets/:id` will work on a hard refresh without extra config.
- Under Settings > Deployment Protection, make sure Vercel Authentication /
  Password Protection is **disabled** so the app is publicly reachable.

## Notes

- The Pokemon TCG API is a free public API and occasionally returns
  intermittent server errors; the app retries with backoff and falls back to
  its own database (which is why sets you've already tracked keep working,
  logos included, even when the live API is down).
- `user_cards` and `favorite_sets` rows are protected by Row Level Security
  so each user only ever sees and edits their own tracking data.
- Card pricing isn't shown in the app: no reliable, sourced real-time
  pricing API is publicly available for these sets, and the app doesn't
  fabricate numbers. A "View current price on TCGplayer" link opens
  TCGplayer's own live listing instead.

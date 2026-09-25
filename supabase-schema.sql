-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

create table if not exists sets (
  id text primary key,
  name text not null,
  series text,
  total int not null,
  release_date date
);

create table if not exists cards (
  id text primary key,
  set_id text not null references sets(id) on delete cascade,
  name text not null,
  number text,
  image_url text,
  types text[],
  rarity text,
  supertype text,
  tcgplayer_url text,
  description text,
  artist text,
  market_price numeric,
  price_updated_at timestamptz
);

-- variant distinguishes print variants of the same card (e.g. a Common's
-- "normal" vs "reverseHolo" printing), so a user can own one without the
-- other. Cards with only one real printing (Rare and above, which are
-- already foil by rarity) just use the default 'normal' variant.
create table if not exists user_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null references cards(id) on delete cascade,
  variant text not null default 'normal',
  owned boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id, variant)
);

create table if not exists favorite_sets (
  user_id uuid not null references auth.users(id) on delete cascade,
  set_id text not null references sets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, set_id)
);

alter table sets enable row level security;
alter table cards enable row level security;
alter table user_cards enable row level security;
alter table favorite_sets enable row level security;

-- Sets and cards are reference data: anyone signed in can read them.
create policy "sets are readable by authenticated users"
  on sets for select
  to authenticated
  using (true);

create policy "cards are readable by authenticated users"
  on cards for select
  to authenticated
  using (true);

-- Any signed-in user can seed a set they favorite (public TCG data, no secrets).
create policy "authenticated users can add sets"
  on sets for insert
  to authenticated
  with check (true);

create policy "authenticated users can update sets"
  on sets for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated users can add cards"
  on cards for insert
  to authenticated
  with check (true);

create policy "authenticated users can update cards"
  on cards for update
  to authenticated
  using (true)
  with check (true);

-- favorite_sets rows are private to the owning user.
create policy "users read their own favorites"
  on favorite_sets for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert their own favorites"
  on favorite_sets for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users delete their own favorites"
  on favorite_sets for delete
  to authenticated
  using (auth.uid() = user_id);

-- Needed because toggleOwned() upserts a favorite_sets row every time a
-- card is marked owned — once the row already exists, that upsert hits
-- Postgres's ON CONFLICT DO UPDATE path, which requires an UPDATE policy
-- even though nothing actually changes value. Without this, marking a
-- second card owned in an already-favorited set silently failed with a
-- 403 and reverted client-side.
create policy "users update their own favorites"
  on favorite_sets for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_cards rows are private to the owning user.
create policy "users read their own card progress"
  on user_cards for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert their own card progress"
  on user_cards for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users update their own card progress"
  on user_cards for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

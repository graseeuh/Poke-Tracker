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
  image_url text
);

create table if not exists user_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null references cards(id) on delete cascade,
  owned boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table sets enable row level security;
alter table cards enable row level security;
alter table user_cards enable row level security;

-- Sets and cards are reference data: anyone signed in can read them.
create policy "sets are readable by authenticated users"
  on sets for select
  to authenticated
  using (true);

create policy "cards are readable by authenticated users"
  on cards for select
  to authenticated
  using (true);

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

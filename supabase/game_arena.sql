-- Separate gameplay layer for the battle arena.
-- This schema is intentionally isolated from the canonical archive tables in public.*.
-- It can be applied independently without changing the lore/world database schema.

create extension if not exists pgcrypto;

create schema if not exists game;

create table if not exists game.player_stats (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  total_battles integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  favorite_character text not null default '',
  favorite_team text not null default '',
  best_team_combo text not null default '',
  achievements jsonb not null default '{}'::jsonb,
  primary_stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists game.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_profile_id uuid not null references public.profiles(id) on delete cascade,
  battlefield text not null default 'infernal-city',
  status text not null default 'open' check (status in ('open', 'in_progress', 'finished')),
  max_players integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists game.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game.rooms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  team_snapshot jsonb not null default '[]'::jsonb,
  joined_at timestamptz not null default now(),
  unique (room_id, profile_id)
);

create table if not exists game.arena_matches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  opponent_profile_id uuid references public.profiles(id),
  battlefield text not null default 'infernal-city',
  mode text not null default '1v1' check (mode in ('1v1', '2v2', '3v3', '5v5', 'team')),
  winner_profile_id uuid references public.profiles(id),
  team_a jsonb not null default '[]'::jsonb,
  team_b jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function game.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger player_stats_set_updated_at
before update on game.player_stats
for each row execute function game.set_updated_at();

create trigger rooms_set_updated_at
before update on game.rooms
for each row execute function game.set_updated_at();

alter table game.player_stats enable row level security;
alter table game.rooms enable row level security;
alter table game.room_players enable row level security;
alter table game.arena_matches enable row level security;

create policy game_player_stats_select_own
on game.player_stats for select to authenticated
using (profile_id = auth.uid());

create policy game_player_stats_insert_own
on game.player_stats for insert to authenticated
with check (profile_id = auth.uid());

create policy game_player_stats_update_own
on game.player_stats for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy game_rooms_select_own
on game.rooms for select to authenticated
using (host_profile_id = auth.uid());

create policy game_rooms_insert_own
on game.rooms for insert to authenticated
with check (host_profile_id = auth.uid());

create policy game_rooms_update_own
on game.rooms for update to authenticated
using (host_profile_id = auth.uid())
with check (host_profile_id = auth.uid());

create policy game_room_players_select_own
on game.room_players for select to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1 from game.rooms r
    where r.id = room_id and r.host_profile_id = auth.uid()
  )
);

create policy game_room_players_insert_own
on game.room_players for insert to authenticated
with check (profile_id = auth.uid());

create policy game_room_players_delete_own
on game.room_players for delete to authenticated
using (profile_id = auth.uid());

create policy game_arena_matches_select_own
on game.arena_matches for select to authenticated
using (
  profile_id = auth.uid()
  or opponent_profile_id = auth.uid()
  or winner_profile_id = auth.uid()
);

create policy game_arena_matches_insert_own
on game.arena_matches for insert to authenticated
with check (profile_id = auth.uid());

create index if not exists player_stats_profile_idx on game.player_stats(profile_id);
create index if not exists rooms_host_idx on game.rooms(host_profile_id);
create index if not exists room_players_room_idx on game.room_players(room_id);
create index if not exists arena_matches_profile_idx on game.arena_matches(profile_id, created_at desc);

-- Optional helper view if the app wants to surface a player's overall battle summary.
create or replace view game.player_summary as
select
  ps.profile_id,
  ps.total_battles,
  ps.wins,
  ps.losses,
  ps.favorite_character,
  ps.favorite_team,
  ps.achievements,
  ps.primary_stats,
  p.display_name
from game.player_stats ps
left join public.profiles p on p.id = ps.profile_id;

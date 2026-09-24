-- Universe OS database schema for Supabase/Postgres.
-- Run this file in the Supabase SQL Editor before wiring the Express API to Supabase.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('archive-images', 'archive-images', true)
on conflict (id) do update set public = true;

drop policy if exists archive_images_read on storage.objects;
create policy archive_images_read on storage.objects for select using (bucket_id = 'archive-images');
drop policy if exists archive_images_insert on storage.objects;
create policy archive_images_insert on storage.objects for insert to authenticated with check (bucket_id = 'archive-images');
drop policy if exists archive_images_update on storage.objects;
create policy archive_images_update on storage.objects for update to authenticated using (bucket_id = 'archive-images') with check (bucket_id = 'archive-images');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'admin' check (role in ('admin', 'god')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists active boolean not null default true;

alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

do $$
begin
  create type public.canon_status as enum (
    'DRAFT', 'UNDER_REVIEW', 'APPROVED', 'CANON',
    'NON_CANON', 'RETCONNED', 'DEPRECATED', 'ALTERNATE'
  );
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.universes (
  id text primary key,
  name text not null,
  code text not null unique,
  description text not null default '',
  status text not null default 'Active',
  timeline_system text not null default '',
  creation_date date,
  canon_status public.canon_status not null default 'DRAFT',
  cover_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.planets (
  id text primary key,
  universe_id text references public.universes(id) on delete set null,
  name text not null,
  designation text not null default '',
  star_system text not null default '',
  planet_type text not null default '',
  population text not null default '',
  gravity text not null default '',
  atmosphere text not null default '',
  climate text not null default '',
  diameter text not null default '',
  moons integer not null default 0,
  technology_level text not null default '',
  political_system text not null default '',
  dominant_species text not null default '',
  description text not null default '',
  canon_status public.canon_status not null default 'DRAFT',
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.planets add column if not exists full_name text not null default '';
alter table public.planets add column if not exists alias text not null default '';
alter table public.planets add column if not exists category text not null default 'Planet';
alter table public.planets add column if not exists status text not null default 'Unknown';
alter table public.planets add column if not exists star text not null default '';
alter table public.planets add column if not exists position text not null default '';
alter table public.planets add column if not exists day_length text not null default '';
alter table public.planets add column if not exists year_length text not null default '';
alter table public.planets add column if not exists terrain text not null default '';
alter table public.planets add column if not exists native_species text not null default '';
alter table public.planets add column if not exists languages text not null default '';
alter table public.planets add column if not exists government text not null default '';
alter table public.planets add column if not exists tech_level text not null default '';
alter table public.planets add column if not exists overview text not null default '';
alter table public.planets add column if not exists continents_regions text not null default '';
alter table public.planets add column if not exists oceans_waterways text not null default '';
alter table public.planets add column if not exists natural_wonders text not null default '';
alter table public.planets add column if not exists flora text not null default '';
alter table public.planets add column if not exists fauna text not null default '';
alter table public.planets add column if not exists extinct_endangered text not null default '';
alter table public.planets add column if not exists cities_settlements text not null default '';
alter table public.planets add column if not exists values_customs text not null default '';
alter table public.planets add column if not exists religion_belief text not null default '';
alter table public.planets add column if not exists economy text not null default '';
alter table public.planets add column if not exists art_architecture text not null default '';
alter table public.planets add column if not exists formation text not null default '';
alter table public.planets add column if not exists ancient_era text not null default '';
alter table public.planets add column if not exists major_events text not null default '';
alter table public.planets add column if not exists current_status text not null default '';
alter table public.planets add column if not exists strategic_significance text not null default '';
alter table public.planets add column if not exists legacy text not null default '';
alter table public.planets add column if not exists affiliation text not null default '';
alter table public.planets add column if not exists allies text not null default '';
alter table public.planets add column if not exists enemies text not null default '';
alter table public.planets add column if not exists notable_locations text not null default '';
alter table public.planets add column if not exists trivia text not null default '';
alter table public.planets add column if not exists see_also text not null default '';
alter table public.planets add column if not exists notes_references text not null default '';

create table if not exists public.locations (
  id text primary key,
  planet_id text references public.planets(id) on delete set null,
  name text not null,
  type text not null default '',
  parent_location text not null default '',
  description text not null default '',
  coordinates text not null default '',
  history text not null default '',
  canon_status public.canon_status not null default 'DRAFT',
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.characters (
  id text primary key,
  universe_id text references public.universes(id) on delete set null,
  name text not null,
  code_name text not null default '',
  aliases text[] not null default '{}',
  species text not null default '',
  gender text not null default '',
  age integer,
  birth_date text not null default '',
  birthplace text not null default '',
  current_location text not null default '',
  occupation text not null default '',
  height text not null default '',
  build text not null default '',
  hair text not null default '',
  eyes text not null default '',
  distinguishing_features text not null default '',
  costume text not null default '',
  personality text not null default '',
  powers text[] not null default '{}',
  skills text[] not null default '{}',
  weaknesses text[] not null default '{}',
  equipment text[] not null default '{}',
  friends text[] not null default '{}',
  family text[] not null default '{}',
  origin text not null default '',
  biography text not null default '',
  first_appearance text not null default '',
  current_status text not null default '',
  canon_status public.canon_status not null default 'DRAFT',
  portrait text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.characters add column if not exists description text not null default '';
alter table public.characters add column if not exists affiliation text not null default '';
alter table public.characters add column if not exists position_role text not null default '';
alter table public.characters add column if not exists romantic_interests text not null default '';
alter table public.characters add column if not exists enemies_rivals text not null default '';
alter table public.characters add column if not exists primary_energy_source text not null default '';
alter table public.characters add column if not exists major_abilities text not null default '';
alter table public.characters add column if not exists secondary_abilities text not null default '';
alter table public.characters add column if not exists signature_techniques text not null default '';
alter table public.characters add column if not exists positive_traits text not null default '';
alter table public.characters add column if not exists negative_traits text not null default '';
alter table public.characters add column if not exists quirks_habits text not null default '';
alter table public.characters add column if not exists physical_appearance text not null default '';
alter table public.characters add column if not exists central_themes text not null default '';
alter table public.characters add column if not exists core_philosophy text not null default '';
alter table public.characters add column if not exists signature_quote text not null default '';
alter table public.characters add column if not exists battle_philosophy text not null default '';
alter table public.characters add column if not exists character_arc text not null default '';
alter table public.characters add column if not exists heroic_villainous_legacy text not null default '';
alter table public.characters add column if not exists notable_engagements text not null default '';

create table if not exists public.teams (
  id text primary key,
  universe_id text references public.universes(id) on delete set null,
  name text not null,
  type text not null default '',
  leader text not null default '',
  headquarters text not null default '',
  founding_date text not null default '',
  members text[] not null default '{}',
  former_members text[] not null default '{}',
  allies text[] not null default '{}',
  enemies text[] not null default '{}',
  goals text not null default '',
  history text not null default '',
  status text not null default '',
  canon_status public.canon_status not null default 'DRAFT',
  logo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.teams add column if not exists full_name text not null default '';
alter table public.teams add column if not exists alias text not null default '';
alter table public.teams add column if not exists category text not null default 'Team';
alter table public.teams add column if not exists founded_by text not null default '';
alter table public.teams add column if not exists territory text not null default '';
alter table public.teams add column if not exists affiliation text not null default '';
alter table public.teams add column if not exists size text not null default '';
alter table public.teams add column if not exists power_source text not null default '';
alter table public.teams add column if not exists specialties text not null default '';
alter table public.teams add column if not exists resources text not null default '';
alter table public.teams add column if not exists description text not null default '';
alter table public.teams add column if not exists overview text not null default '';
alter table public.teams add column if not exists purpose_mandate text not null default '';
alter table public.teams add column if not exists chain_command text not null default '';
alter table public.teams add column if not exists roles text not null default '';
alter table public.teams add column if not exists membership_criteria text not null default '';
alter table public.teams add column if not exists recruitment text not null default '';
alter table public.teams add column if not exists current_members text not null default '';
alter table public.teams add column if not exists notable_former text not null default '';
alter table public.teams add column if not exists reservists_affiliates text not null default '';
alter table public.teams add column if not exists team_values text not null default '';
alter table public.teams add column if not exists internal_dynamics text not null default '';
alter table public.teams add column if not exists symbols_insignia text not null default '';
alter table public.teams add column if not exists reputation text not null default '';
alter table public.teams add column if not exists founding text not null default '';
alter table public.teams add column if not exists major_operations text not null default '';
alter table public.teams add column if not exists schisms_reforms text not null default '';
alter table public.teams add column if not exists current_status text not null default '';
alter table public.teams add column if not exists legacy text not null default '';
alter table public.teams add column if not exists trivia text not null default '';
alter table public.teams add column if not exists see_also text not null default '';
alter table public.teams add column if not exists notes_references text not null default '';

create table if not exists public.organizations (
  id text primary key,
  name text not null,
  type text not null default '',
  leadership text not null default '',
  headquarters text not null default '',
  resources text not null default '',
  goals text not null default '',
  influence text not null default '',
  status text not null default '',
  canon_status public.canon_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.species (
  id text primary key,
  name text not null,
  home_planet text not null default '',
  lifespan text not null default '',
  biology text not null default '',
  abilities text not null default '',
  weaknesses text not null default '',
  culture text not null default '',
  language text not null default '',
  population text not null default '',
  canon_status public.canon_status not null default 'DRAFT',
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.species add column if not exists image text;
alter table public.species add column if not exists category text not null default 'Species / Race';
alter table public.species add column if not exists status text not null default 'Unknown';
alter table public.species add column if not exists primary_locations text not null default '';
alter table public.species add column if not exists government text not null default '';
alter table public.species add column if not exists technology_level text not null default '';
alter table public.species add column if not exists overview text not null default '';
alter table public.species add column if not exists appearance text not null default '';
alter table public.species add column if not exists physiology text not null default '';
alter table public.species add column if not exists lifecycle_reproduction text not null default '';
alter table public.species add column if not exists diet text not null default '';
alter table public.species add column if not exists innate_abilities text not null default '';
alter table public.species add column if not exists learned_enhanced text not null default '';
alter table public.species add column if not exists limitations_weaknesses text not null default '';
alter table public.species add column if not exists customs_values text not null default '';
alter table public.species add column if not exists government_structure text not null default '';
alter table public.species add column if not exists technology text not null default '';
alter table public.species add column if not exists notable_factions text not null default '';
alter table public.species add column if not exists origins text not null default '';
alter table public.species add column if not exists major_events text not null default '';
alter table public.species add column if not exists current_status text not null default '';
alter table public.species add column if not exists notable_individuals text not null default '';
alter table public.species add column if not exists trivia text not null default '';
alter table public.species add column if not exists see_also text not null default '';
alter table public.species add column if not exists notes_references text not null default '';

create table if not exists public.powers (
  id text primary key,
  name text not null,
  category text not null default '',
  description text not null default '',
  known_users text[] not null default '{}',
  limitations text not null default '',
  strength_rating integer,
  canon_status public.canon_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artifacts (
  id text primary key,
  name text not null,
  type text not null default '',
  creator text not null default '',
  current_owner text not null default '',
  origin text not null default '',
  abilities text not null default '',
  history text not null default '',
  status text not null default '',
  canon_status public.canon_status not null default 'DRAFT',
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.artifacts add column if not exists full_name text not null default '';
alter table public.artifacts add column if not exists alias text not null default '';
alter table public.artifacts add column if not exists category text not null default 'Artifact / Weapon';
alter table public.artifacts add column if not exists created text not null default '';
alter table public.artifacts add column if not exists material text not null default '';
alter table public.artifacts add column if not exists wielders text not null default '';
alter table public.artifacts add column if not exists affiliation text not null default '';
alter table public.artifacts add column if not exists location text not null default '';
alter table public.artifacts add column if not exists power_source text not null default '';
alter table public.artifacts add column if not exists destructive_power text not null default '';
alter table public.artifacts add column if not exists description text not null default '';
alter table public.artifacts add column if not exists overview text not null default '';
alter table public.artifacts add column if not exists appearance_design text not null default '';
alter table public.artifacts add column if not exists secondary_abilities text not null default '';
alter table public.artifacts add column if not exists activation_use text not null default '';
alter table public.artifacts add column if not exists drawbacks text not null default '';
alter table public.artifacts add column if not exists creation text not null default '';
alter table public.artifacts add column if not exists notable_wielders text not null default '';
alter table public.artifacts add column if not exists major_events text not null default '';
alter table public.artifacts add column if not exists current_status text not null default '';
alter table public.artifacts add column if not exists significance text not null default '';
alter table public.artifacts add column if not exists trivia text not null default '';
alter table public.artifacts add column if not exists see_also text not null default '';
alter table public.artifacts add column if not exists notes_references text not null default '';

create table if not exists public.events (
  id text primary key,
  name text not null,
  event_date text not null default '',
  location text not null default '',
  characters text[] not null default '{}',
  teams text[] not null default '{}',
  consequences text not null default '',
  issues text[] not null default '{}',
  canon_status public.canon_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.issues (
  id text primary key,
  issue_number integer,
  title text not null,
  story_arc text not null default '',
  release_status text not null default '',
  publication_date text not null default '',
  synopsis text not null default '',
  characters text[] not null default '{}',
  locations text[] not null default '{}',
  events text[] not null default '{}',
  writer text not null default '',
  artist text not null default '',
  colorist text not null default '',
  letterer text not null default '',
  editor text not null default '',
  pages integer,
  canon_status public.canon_status not null default 'DRAFT',
  cover text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- The finished, reader-ready comic (PDF/CBZ/image bundle), separate from the
-- in-progress script/cover art, so completed issues can be pulled back out later.
alter table public.issues add column if not exists final_file_url text;
alter table public.issues add column if not exists final_file_name text;
alter table public.issues add column if not exists final_file_type text;

create table if not exists public.story_arcs (
  id text primary key,
  title text not null,
  issues text[] not null default '{}',
  main_characters text[] not null default '{}',
  major_events text[] not null default '{}',
  status text not null default '',
  canon_status public.canon_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationships (
  id text primary key,
  source text not null,
  source_name text not null default '',
  target text not null,
  target_name text not null default '',
  type text not null,
  start_date text not null default '',
  end_date text not null default '',
  description text not null default '',
  canon_status public.canon_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scripts (
  id text primary key,
  issue_id text references public.issues(id) on delete cascade,
  page_number integer not null default 1,
  panel_number integer not null default 1,
  setting text not null default '',
  description text not null default '',
  dialogue jsonb not null default '[]'::jsonb,
  narration text not null default '',
  sfx text not null default '',
  artist_note text not null default '',
  editor_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.scripts add column if not exists panel_type text not null default 'Standard';
alter table public.scripts add column if not exists camera_angle text not null default 'Eye-level';
alter table public.scripts add column if not exists shot_notes text not null default '';
alter table public.scripts add column if not exists caption text not null default '';
alter table public.scripts add column if not exists panel_status text not null default 'DRAFT';
alter table public.scripts add column if not exists page_status text not null default 'IN_PROGRESS';
alter table public.scripts add column if not exists page_notes text not null default '';

create table if not exists public.artwork (
  id text primary key,
  title text not null,
  entity_id text not null,
  entity_type text not null,
  stage text not null default '',
  url text not null default '',
  artist text not null default '',
  version text not null default '',
  notes text not null default '',
  canon_status public.canon_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  event_timestamp timestamptz not null default now(),
  username text not null default '',
  action text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id text primary key,
  target_id text not null,
  target_type text not null,
  author text not null default '',
  text text not null,
  comment_timestamp timestamptz not null default now(),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  issue_id text references public.issues(id) on delete cascade,
  stage text not null default '',
  assignee text not null default '',
  deadline text not null default '',
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.retcons (
  id text primary key,
  entity_id text not null,
  entity_name text not null default '',
  field text not null,
  old_value text not null default '',
  new_value text not null default '',
  reason text not null default '',
  issue text not null default '',
  approved_by text not null default '',
  retcon_date text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists characters_universe_id_idx on public.characters(universe_id);
create index if not exists planets_universe_id_idx on public.planets(universe_id);
create index if not exists locations_planet_id_idx on public.locations(planet_id);
create index if not exists teams_universe_id_idx on public.teams(universe_id);
create index if not exists scripts_issue_id_idx on public.scripts(issue_id);
create index if not exists tasks_issue_id_idx on public.tasks(issue_id);
create index if not exists relationships_source_idx on public.relationships(source);
create index if not exists relationships_target_idx on public.relationships(target);
create index if not exists comments_target_idx on public.comments(target_id, target_type);

drop trigger if exists universes_set_updated_at on public.universes;
create trigger universes_set_updated_at before update on public.universes for each row execute function public.set_updated_at();
drop trigger if exists planets_set_updated_at on public.planets;
create trigger planets_set_updated_at before update on public.planets for each row execute function public.set_updated_at();
drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at before update on public.locations for each row execute function public.set_updated_at();
drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at before update on public.characters for each row execute function public.set_updated_at();
drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at before update on public.teams for each row execute function public.set_updated_at();
drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
drop trigger if exists species_set_updated_at on public.species;
create trigger species_set_updated_at before update on public.species for each row execute function public.set_updated_at();
drop trigger if exists powers_set_updated_at on public.powers;
create trigger powers_set_updated_at before update on public.powers for each row execute function public.set_updated_at();
drop trigger if exists artifacts_set_updated_at on public.artifacts;
create trigger artifacts_set_updated_at before update on public.artifacts for each row execute function public.set_updated_at();
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();
drop trigger if exists issues_set_updated_at on public.issues;
create trigger issues_set_updated_at before update on public.issues for each row execute function public.set_updated_at();
drop trigger if exists story_arcs_set_updated_at on public.story_arcs;
create trigger story_arcs_set_updated_at before update on public.story_arcs for each row execute function public.set_updated_at();
drop trigger if exists relationships_set_updated_at on public.relationships;
create trigger relationships_set_updated_at before update on public.relationships for each row execute function public.set_updated_at();
drop trigger if exists scripts_set_updated_at on public.scripts;
create trigger scripts_set_updated_at before update on public.scripts for each row execute function public.set_updated_at();
drop trigger if exists artwork_set_updated_at on public.artwork;
create trigger artwork_set_updated_at before update on public.artwork for each row execute function public.set_updated_at();
drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at before update on public.comments for each row execute function public.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();

alter table public.universes enable row level security;
alter table public.planets enable row level security;
alter table public.locations enable row level security;
alter table public.characters enable row level security;
alter table public.teams enable row level security;
alter table public.organizations enable row level security;
alter table public.species enable row level security;
alter table public.powers enable row level security;
alter table public.artifacts enable row level security;
alter table public.events enable row level security;
alter table public.issues enable row level security;
alter table public.story_arcs enable row level security;
alter table public.relationships enable row level security;
alter table public.scripts enable row level security;
alter table public.artwork enable row level security;
alter table public.audit_logs enable row level security;
alter table public.comments enable row level security;
alter table public.tasks enable row level security;
alter table public.retcons enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'universes', 'planets', 'locations', 'characters', 'teams', 'organizations',
    'species', 'powers', 'artifacts', 'events', 'issues', 'story_arcs',
    'relationships', 'scripts', 'artwork', 'audit_logs', 'comments', 'tasks', 'retcons'
  ] loop
    execute format('drop policy if exists authenticated_full_access on public.%I', table_name);
    execute format(
      'create policy authenticated_full_access on public.%I for all to authenticated using (true) with check (true)',
      table_name
    );
  end loop;
end;
$$;

-- Let every teammate see who else is in the archive (needed for chat's name/DM directory).
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles for select to authenticated using (true);

create table if not exists public.chat_messages (
  id text primary key,
  channel text not null default 'public' check (channel in ('public', 'dm')),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null default '',
  recipient_id uuid references public.profiles(id) on delete cascade,
  recipient_name text not null default '',
  text text not null default '',
  attachment_url text,
  attachment_type text check (attachment_type in ('image', 'file')),
  attachment_name text,
  created_at timestamptz not null default now()
);
alter table public.chat_messages add column if not exists attachment_url text;
alter table public.chat_messages add column if not exists attachment_type text;
alter table public.chat_messages add column if not exists attachment_name text;
alter table public.chat_messages alter column text set default '';

create index if not exists chat_messages_channel_idx on public.chat_messages(channel, created_at);
create index if not exists chat_messages_sender_idx on public.chat_messages(sender_id);
create index if not exists chat_messages_recipient_idx on public.chat_messages(recipient_id);

alter table public.chat_messages enable row level security;

-- Public channel is readable by everyone; DMs are only visible to the two participants.
drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages for select to authenticated
using (channel = 'public' or sender_id = auth.uid() or recipient_id = auth.uid());

-- Senders can only ever post as themselves.
drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages for insert to authenticated
with check (sender_id = auth.uid());

create table if not exists public.simulations (
  id text primary key,
  combatant1_id text not null,
  combatant1_name text not null default '',
  combatant2_id text not null,
  combatant2_name text not null default '',
  setup jsonb not null default '{}'::jsonb,
  rounds jsonb not null default '[]'::jsonb,
  winner_id text not null default '',
  winner_name text not null default '',
  loser_name text not null default '',
  probability1 integer not null default 50,
  probability2 integer not null default 50,
  turning_point text not null default '',
  primary_cause text not null default '',
  unexpected_factor text not null default '',
  is_upset boolean not null default false,
  engine_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.simulations add column if not exists engine_report jsonb not null default '{}'::jsonb;

-- Align older simulator tables with the API's camelCase-to-snake_case mapping.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'combatant_1_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'combatant1_id'
  ) then
    alter table public.simulations rename column combatant_1_id to combatant1_id;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'combatant_1_name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'combatant1_name'
  ) then
    alter table public.simulations rename column combatant_1_name to combatant1_name;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'combatant_2_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'combatant2_id'
  ) then
    alter table public.simulations rename column combatant_2_id to combatant2_id;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'combatant_2_name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'combatant2_name'
  ) then
    alter table public.simulations rename column combatant_2_name to combatant2_name;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'probability_1'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'probability1'
  ) then
    alter table public.simulations rename column probability_1 to probability1;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'probability_2'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'simulations'
      and column_name = 'probability2'
  ) then
    alter table public.simulations rename column probability_2 to probability2;
  end if;
end;
$$;

create index if not exists simulations_created_at_idx on public.simulations(created_at desc);

alter table public.simulations enable row level security;
drop policy if exists simulations_full_access on public.simulations;
create policy simulations_full_access on public.simulations for all to authenticated using (true) with check (true);

-- Public simulator access: canon archive records and shareable simulation results only.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'characters', 'species', 'powers', 'artifacts', 'teams',
    'organizations', 'planets', 'locations', 'issues'
  ] loop
    execute format('drop policy if exists public_canon_read on public.%I', table_name);
    execute format(
      'create policy public_canon_read on public.%I for select to anon using (canon_status = ''CANON'')',
      table_name
    );
  end loop;
end;
$$;

drop policy if exists public_simulation_read on public.simulations;
create policy public_simulation_read on public.simulations for select to anon using (true);

-- Broadcast row changes over Supabase Realtime (websocket) so the frontend can
-- refresh instantly instead of waiting on the next poll. Wrapped per-table
-- since re-adding an already-published table raises a duplicate_object error.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'universes', 'planets', 'locations', 'characters', 'teams', 'organizations',
    'species', 'powers', 'artifacts', 'events', 'issues', 'story_arcs',
    'relationships', 'scripts', 'artwork', 'audit_logs', 'comments', 'tasks',
    'retcons', 'chat_messages', 'simulations'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    exception
      when duplicate_object then null;
    end;
  end loop;
end;
$$;


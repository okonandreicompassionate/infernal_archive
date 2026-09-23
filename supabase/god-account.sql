-- Run this in the Supabase SQL Editor after creating the Auth user.
-- Passwords must never be stored in SQL or committed to the repository.

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
create policy profiles_select_own on public.profiles
for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

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
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill the profile if the Auth user was created before the trigger existed.
insert into public.profiles (id, email)
select id, coalesce(email, '')
from auth.users
where lower(email) = lower('okoncompassionate@gmail.com')
on conflict (id) do update set email = excluded.email;

update public.profiles
set role = 'god', updated_at = now()
where lower(email) = lower('okoncompassionate@gmail.com');

-- Verify the promotion.
select email, role
from public.profiles
where lower(email) = lower('okoncompassionate@gmail.com');

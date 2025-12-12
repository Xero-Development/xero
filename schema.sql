create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  discord_id text,
  discord_username text,
  created_at timestamptz not null default now(),
  primary key (id)
);
create unique index if not exists profiles_discord_id_unique on public.profiles(discord_id) where discord_id is not null;

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid()=id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid()=id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username) values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table if not exists public.staff_applications (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  role text not null,
  message text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.staff_applications enable row level security;
create policy "applications_insert_own" on public.staff_applications for insert to authenticated with check (auth.uid()=user_id);
create policy "applications_select_own" on public.staff_applications for select to authenticated using (auth.uid()=user_id);

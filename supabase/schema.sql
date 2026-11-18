-- ARK AI Video Editor — Complete Supabase PostgreSQL & Storage Schema
-- Run this script in your Supabase Project SQL Editor.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- 1. Profiles table (mirrors auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  handle text unique,
  bio text default '',
  avatar_url text default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  storage_used_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Subscription Plans table
create table if not exists public.plans (
  id text primary key,
  name text not null,
  audience text not null,
  description text not null,
  monthly_price_cents integer not null,
  annual_price_cents integer not null,
  storage_limit_gb integer not null,
  max_export_resolution text not null check (max_export_resolution in ('720p', '1080p', '4K')),
  ai_credits_monthly integer not null,
  watermark boolean not null default false,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'annual')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Projects table (Video & Photo projects)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  type text not null check (type in ('video', 'photo')),
  aspect_ratio text not null default '16:9',
  duration_seconds numeric(10, 2) not null default 0,
  thumbnail_url text default '',
  status text not null default 'draft' check (status in ('draft', 'exported', 'archived')),
  timeline_data jsonb not null default '{}'::jsonb,
  photo_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Media Assets table (Uploaded videos, photos, audio & exported renders)
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  bucket text not null check (bucket in ('media', 'exports', 'avatars')),
  storage_path text not null,
  file_name text not null,
  media_type text not null check (media_type in ('video', 'image', 'audio', 'export')),
  mime_type text not null,
  size_bytes bigint not null default 0,
  duration_seconds numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- Seed default plans
insert into public.plans (id, name, audience, description, monthly_price_cents, annual_price_cents, storage_limit_gb, max_export_resolution, ai_credits_monthly, watermark, features)
values
  ('starter', 'Starter', 'For individual creators getting started', 'Full browser timeline editing, photo studio tools, and 720p MP4 exports.', 0, 0, 5, '720p', 25, false, '["5 GB cloud media storage","720p MP4 & WebM exports","Multi-track timeline & photo studio","25 monthly AI assist requests"]'::jsonb),
  ('pro', 'Pro Studio', 'For solo filmmakers and daily channels', 'Full 1080p & 4K FFmpeg exports, 100 GB storage, and priority AI scripting.', 1900, 18000, 100, '4K', 500, false, '["100 GB cloud media storage","4K 60fps MP4 & WebM exports","Unlimited timeline tracks & LUT filters","500 monthly AI assist requests"]'::jsonb),
  ('studio', 'Studio Team', 'For production houses and creative agencies', '1 TB shared archive, 4K mastering, and dedicated team workspace controls.', 4900, 46800, 1024, '4K', 2500, false, '["1 TB cloud media storage","4K 60fps uncompressed mastering","Priority team project review","2,500 monthly AI assist requests"]'::jsonb)
on conflict (id) do nothing;

-- Auto-create profile and free starter subscription on user sign up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, handle, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')) || '_' || substr(new.id::text, 1, 4),
    'user'
  );

  insert into public.subscriptions (user_id, plan_id, billing_cycle, status)
  values (new.id, 'starter', 'monthly', 'active');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.media_assets enable row level security;

-- Helper function for admin check
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- Plans policies (public read, admin write)
create policy "Anyone can view active plans" on public.plans
  for select using (true);

create policy "Admins can manage plans" on public.plans
  for all using (public.is_admin());

-- Subscriptions policies
create policy "Users view own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Users update own subscriptions" on public.subscriptions
  for all using (auth.uid() = user_id or public.is_admin());

-- Projects policies
create policy "Users manage own projects" on public.projects
  for all using (auth.uid() = user_id or public.is_admin());

-- Media assets policies
create policy "Users manage own media assets" on public.media_assets
  for all using (auth.uid() = user_id or public.is_admin());

-- Storage Buckets
insert into storage.buckets (id, name, public)
values
  ('media', 'media', false),
  ('exports', 'exports', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS Policies
create policy "Users manage own media folder"
  on storage.objects for all
  using (bucket_id in ('media', 'exports') and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin()))
  with check (bucket_id in ('media', 'exports') and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin()));

create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

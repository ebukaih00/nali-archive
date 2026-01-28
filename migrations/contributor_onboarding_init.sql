-- Enable RLS if not already enabled (good practice check)
alter table public.names enable row level security;

-- 1. Creates contributor_applications table
create table if not exists public.contributor_applications (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text not null,
  primary_tribe text not null, -- Could be an array if multi-select is strict, but text is fine for CSV or single
  dialect_nuance text,
  audio_sample_url text, -- Points to vetting_samples bucket
  status text check (status in ('pending_review', 'approved', 'rejected')) default 'pending_review',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.contributor_applications enable row level security;

-- Allow insert by anyone (application form)
create policy "Allow public insert to applications" on public.contributor_applications for insert with check (true);
-- Allow read only by admins (we'll define admin policies later/separately or assume service role for now)

-- 2. Create Audio Submissions Table
create table if not exists public.audio_submissions (
  id uuid default gen_random_uuid() primary key,
  name_id bigint references public.names(id) not null,
  contributor_id uuid references auth.users(id), -- Nullable if we want to keep it even if user is deleted, but ideally linked
  audio_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.audio_submissions enable row level security;

-- 3. Update Names Table
alter table public.names add column if not exists verification_status text check (verification_status in ('unverified', 'in_progress', 'verified')) default 'unverified';
alter table public.names add column if not exists locked_by uuid references auth.users(id);
alter table public.names add column if not exists locked_at timestamp with time zone;
alter table public.names add column if not exists verified_audio_url text;

-- 4. Create Profiles Table (if not exists) and add Role
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text check (role in ('user', 'contributor', 'admin')) default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
-- Trigger to create profile on signup is recommended usually, but skipping for brevity unless requested.

-- 5. Storage Buckets
-- Note: inserting into storage.buckets usually requires superadmin or service_role. 
-- Best to handle via Dashboard or Supabase Client if this fails.
insert into storage.buckets (id, name, public) 
values ('vetting_samples', 'vetting_samples', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('pronunciations', 'pronunciations', true)
on conflict (id) do nothing;

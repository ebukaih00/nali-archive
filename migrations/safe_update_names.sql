-- 3. Update Names Table (Safe commands)
alter table public.names add column if not exists verification_status text check (verification_status in ('unverified', 'in_progress', 'verified')) default 'unverified';
alter table public.names add column if not exists locked_by uuid references auth.users(id);
alter table public.names add column if not exists locked_at timestamp with time zone;
alter table public.names add column if not exists verified_audio_url text;

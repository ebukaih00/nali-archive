-- Add locking and status columns to audio_submissions table
alter table public.audio_submissions 
add column if not exists status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
add column if not exists locked_by uuid references auth.users(id),
add column if not exists locked_at timestamp with time zone;

-- Index for faster batch queries
create index if not exists idx_audio_submissions_status_locked on public.audio_submissions(status, locked_at);

-- Add verification count
alter table public.audio_submissions
add column if not exists verification_count integer default 0;

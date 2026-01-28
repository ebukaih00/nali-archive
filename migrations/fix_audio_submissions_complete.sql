-- Ensure all necessary columns exist on audio_submissions
alter table public.audio_submissions 
add column if not exists locked_by uuid references auth.users(id),
add column if not exists locked_at timestamp with time zone,
add column if not exists status text check (status in ('pending', 'approved', 'rejected', 'edited')) default 'pending',
add column if not exists verification_count int default 0,
add column if not exists phonetic_hint text,
add column if not exists review_notes text;

-- Ensure RLS is enabled and policies exist
alter table public.audio_submissions enable row level security;

-- Policy to allow authenticated users to UPDATE (claim) rows
create policy "Allow authenticated update audio submissions"
on public.audio_submissions
for update
to authenticated
using (true)
with check (true);

-- Policy to allow authenticated users to SELECT rows (view dashboard)
create policy "Allow authenticated select audio submissions"
on public.audio_submissions
for select
to authenticated
using (true);

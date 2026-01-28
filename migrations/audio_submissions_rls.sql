-- Enable RLS (just in case)
alter table public.audio_submissions enable row level security;

-- 1. VIEW Policies
-- Allow users to view submissions that are pending (to browse) OR locked by themselves
create policy "View pending or self-locked submissions"
on public.audio_submissions
for select
to authenticated
using (
  status = 'pending' 
  or locked_by = auth.uid()
);

-- 2. UPDATE Policies
-- Allow users to lock a submission if it is currently unlocked
create policy "Claim unlocked submissions"
on public.audio_submissions
for update
to authenticated
using (
  (locked_by is null) 
  and status = 'pending'
)
with check (
  locked_by = auth.uid()
);

-- Allow users to update submissions they have already locked (to approve/reject/edit)
create policy "Manage self-locked submissions"
on public.audio_submissions
for update
to authenticated
using (
  locked_by = auth.uid()
);

-- 3. INSERT Policies (if you allow new audio submissions via valid channels, usually handled by separate logic, assuming 'names' logic handles creation, but let's allow insert if needed for future)
-- For now, skipping insert policy as submissions are likely created via other flows or seeding.


-- Allow authenticated users to UPDATE audio submissions (needed for locking/claiming)
create policy "Allow authenticated update audio submissions"
on public.audio_submissions
for update
to authenticated
using (true)
with check (true);

-- Allow authenticated users to UPDATE names (needed for verification_status update)
create policy "Allow authenticated update names"
on public.names
for update
to authenticated
using (true)
with check (true);

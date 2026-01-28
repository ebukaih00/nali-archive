
-- ==========================================================
-- FINAL SECURITY HARDENING (NON-DESTRUCTIVE)
-- ==========================================================
-- ⚠️ IMPORTANT: Run this in your Supabase SQL Editor.
-- This script tightens "UPDATE" permissions and secures roles.
-- It does NOT delete data and does NOT block public applications.

------------------------------------------------------------
-- 1. AUTOMATIC PROFILE CREATION
------------------------------------------------------------
-- Ensures every new user automatically gets a 'contributor' profile.
-- This makes the Manual Invite flow work seamlessly.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'contributor')
  on conflict (id) do update set role = EXCLUDED.role;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

------------------------------------------------------------
-- 2. SECURE THE PROFILES TABLE
------------------------------------------------------------
-- Users can only see their own profile.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
to authenticated
using ( auth.uid() = id );

-- Only existing Admins can change user roles (Stops self-promotion).
drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
to authenticated
using ( 
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

------------------------------------------------------------
-- 3. SECURE THE NAMES TABLE
------------------------------------------------------------
-- SELECT (Browsing) remains open to the public as per 'Allow select for all' or current defaults.
-- Only Contributors/Admins can verify or edit names.
drop policy if exists "Allow authenticated update names" on public.names;
create policy "Contributors/Admins can update names"
on public.names for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('contributor', 'admin')
  )
);

------------------------------------------------------------
-- 4. SECURE AUDIO SUBMISSIONS
------------------------------------------------------------
-- Only authenticated users see submissions.
-- Contributors can only manage (approve/edit) submissions they have locked.
drop policy if exists "Allow authenticated update audio submissions" on public.audio_submissions;
create policy "Contributors manage self-locked submissions"
on public.audio_submissions for update
to authenticated
using (
  locked_by = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('contributor', 'admin')
  )
);

------------------------------------------------------------
-- 5. SECURE STORAGE BUCKETS
------------------------------------------------------------
-- 'vetting_samples': Public can still upload (for new applications).
drop policy if exists "Give public access to upload vetting samples" on storage.objects;
create policy "Public can upload vetting samples"
on storage.objects for insert
with check ( bucket_id = 'vetting_samples' );

-- 'pronunciations': Only Contributors can upload final files.
drop policy if exists "Contributors can upload pronunciations" on storage.objects;
create policy "Contributors can upload pronunciations"
on storage.objects for insert
to authenticated
with check ( 
  bucket_id = 'pronunciations' 
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('contributor', 'admin')
  )
);

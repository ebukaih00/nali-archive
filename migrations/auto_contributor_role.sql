
-- Update the handle_new_user function to automatically assign 'contributor' role 
-- if the user has an approved application.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_approved boolean;
begin
  -- Check if there is an approved application for this email
  -- We use lower() to ensure case-insensitive matching
  select exists (
    select 1 from public.contributor_applications 
    where lower(email) = lower(new.email) 
    and status = 'approved'
  ) into is_approved;

  if is_approved then
    -- If approved application exists, grant contributor role immediately
    insert into public.profiles (id, role)
    values (new.id, 'contributor');
    
    -- Optional: Log the automatic promotion for debugging
    raise notice 'User % automatically promoted to contributor based on approved application.', new.email;
  else
    -- Otherwise, assign the default 'user' role
    insert into public.profiles (id, role)
    values (new.id, 'user');
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Ensure the trigger is still active (it should be if already created, but let's be safe)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

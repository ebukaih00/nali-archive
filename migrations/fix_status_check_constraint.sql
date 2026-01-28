
-- Relax or Fix the Check Constraint on audio_submissions status
-- The previous migration might have failed to update an existing constraint if the column already existed.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Find and drop ANY check constraint on the 'status' column of 'audio_submissions'
    -- We search pg_constraint for checks on this relation and column.
    
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.audio_submissions'::regclass 
          AND contype = 'c' 
          AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.audio_submissions DROP CONSTRAINT ' || r.conname;
    END LOOP;
END $$;

-- 2. Add the correct constraint back
ALTER TABLE public.audio_submissions 
ADD CONSTRAINT audio_submissions_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'edited'));


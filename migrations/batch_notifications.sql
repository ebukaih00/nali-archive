-- migration: Automated Batch Completion Notifications & Tracking

-- 1. Add tracking column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pending_review_count INTEGER DEFAULT 0;

-- 2. Create the sync function
CREATE OR REPLACE FUNCTION public.sync_pending_review_count()
RETURNS TRIGGER AS $$
DECLARE
    target_email TEXT;
BEGIN
    -- Determine the email to sync
    IF (TG_OP = 'DELETE') THEN
        target_email := OLD.assigned_to;
    ELSE
        target_email := NEW.assigned_to;
    END IF;

    -- Only proceed if there is an assigned email
    IF target_email IS NOT NULL THEN
        UPDATE public.profiles
        SET pending_review_count = (
            SELECT count(*)::int
            FROM public.names
            WHERE assigned_to ILIKE target_email
            AND status IN ('pending', 'unverified')
            AND ignored = false
        )
        WHERE id IN (
            SELECT id FROM auth.users WHERE email ILIKE target_email
        );

        -- NOTE: To actually trigger the email, you must set up a 
        -- Database Webhook in the Supabase Dashboard:
        -- 1. Go to Database -> Webhooks
        -- 2. Create a new webhook for 'profiles' table on 'UPDATE'
        -- 3. Point it to the 'notify-batch-complete' Edge Function
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger on names table
DROP TRIGGER IF EXISTS on_name_change_sync_count ON public.names;
CREATE TRIGGER on_name_change_sync_count
AFTER INSERT OR UPDATE OR DELETE ON public.names
FOR EACH ROW EXECUTE FUNCTION public.sync_pending_review_count();

-- 4. Initial Sync for existing data
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT DISTINCT assigned_to FROM public.names WHERE assigned_to IS NOT NULL LOOP
        UPDATE public.profiles
        SET pending_review_count = (
            SELECT count(*)::int
            FROM public.names
            WHERE assigned_to ILIKE r.assigned_to
            AND status IN ('pending', 'unverified')
            AND ignored = false
        )
        WHERE id IN (
            SELECT id FROM auth.users WHERE email ILIKE r.assigned_to
        );
    END LOOP;
END $$;

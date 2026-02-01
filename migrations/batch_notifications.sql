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
    IF (TG_OP = 'DELETE') THEN
        target_email := OLD.assigned_to;
    ELSE
        target_email := NEW.assigned_to;
    END IF;

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
END;
$$;

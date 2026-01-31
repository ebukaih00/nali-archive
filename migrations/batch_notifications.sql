
-- 1. Function to count pending names for a user email
CREATE OR REPLACE FUNCTION public.get_pending_name_count(user_email TEXT)
RETURNS INTEGER AS $$
DECLARE
    pending_count INTEGER;
BEGIN
    SELECT count(*)
    INTO pending_count
    FROM public.names
    WHERE assigned_to = user_email
    AND (verification_status != 'verified' OR verification_status IS NULL)
    AND ignored = false;
    
    RETURN pending_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger function to check completion and notify Edge Function
CREATE OR REPLACE FUNCTION public.on_name_update_check_batch()
RETURNS TRIGGER AS $$
DECLARE
    pending_count INTEGER;
BEGIN
    -- Only act if assigned_to is set and status was changed to 'verified' or 'ignored'
    IF (NEW.assigned_to IS NOT NULL) AND 
       (NEW.verification_status = 'verified' OR NEW.ignored = true) AND
       (OLD.verification_status != 'verified' OR OLD.ignored != true) 
    THEN
        pending_count := public.get_pending_name_count(NEW.assigned_to);
        
        IF pending_count = 0 THEN
            -- In a real Supabase environment, this would be configured as a Webhook in the Dashboard.
            -- However, to make it portable via SQL, we insert into a dedicated 'completed_batches' table
            -- or use the 'supabase_functions.hooks' table if available.
            -- For this project, we'll create a simple 'batch_completions' log table that the Edge Function can watch.
            INSERT INTO public.batch_completions (contributor_email, completed_at)
            VALUES (NEW.assigned_to, now());
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create log table for batch completions (this triggers the actual Webhook)
CREATE TABLE IF NOT EXISTS public.batch_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_email TEXT NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for security, but allow the trigger to insert
ALTER TABLE public.batch_completions ENABLE ROW LEVEL SECURITY;

-- 4. Create the trigger on names table
DROP TRIGGER IF EXISTS tr_check_batch_completion ON public.names;
CREATE TRIGGER tr_check_batch_completion
    AFTER UPDATE ON public.names
    FOR EACH ROW
    EXECUTE FUNCTION public.on_name_update_check_batch();

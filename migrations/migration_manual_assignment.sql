
-- Add assignment and ignore tracking to names table
ALTER TABLE public.names 
ADD COLUMN IF NOT EXISTS assigned_to TEXT, -- Stores contributor email
ADD COLUMN IF NOT EXISTS ignored BOOLEAN DEFAULT false; -- Stores skip status

-- Add index for contributor lookup
CREATE INDEX IF NOT EXISTS idx_names_assigned_to ON public.names(assigned_to);
CREATE INDEX IF NOT EXISTS idx_names_ignored ON public.names(ignored);

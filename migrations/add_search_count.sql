-- Migration: Add search_count to names table
-- This allows tracking how many times a name has been searched or viewed.

ALTER TABLE public.names 
ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;

-- Comments for documentation
COMMENT ON COLUMN public.names.search_count IS 'Number of times this name has been searched or viewed by users';

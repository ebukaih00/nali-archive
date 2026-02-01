
-- Migration: Add user_name to feedback table
-- This allows capturing user attribution for positive testimonials.

ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Update RLS if necessary (usually not needed for new columns if table level RLS is already set for public insert)
COMMENT ON COLUMN public.feedback.user_name IS 'Optional name of the user providing the feedback for attribution.';

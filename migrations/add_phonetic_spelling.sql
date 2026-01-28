
-- Add phonetic_spelling column to names table
-- This allows for custom phonetic hints to improve TTS pronunciation
ALTER TABLE public.names 
ADD COLUMN IF NOT EXISTS phonetic_spelling TEXT;

COMMENT ON COLUMN public.names.phonetic_spelling IS 'Optional override for TTS to improve pronunciation (e.g., O-loo-wah-she-un)';

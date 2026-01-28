-- Clean slate: Delete all audio submissions and names
TRUNCATE TABLE public.audio_submissions CASCADE;
TRUNCATE TABLE public.names CASCADE;

-- Optional: Reset sequences if needed, but TRUNCATE usually handles this or they aren't critical with UUIDs/BigInts that don't need reset.

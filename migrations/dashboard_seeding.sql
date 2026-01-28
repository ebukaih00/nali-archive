-- Create test tasks for dashboard
DO $$
DECLARE
    v_name_id bigint;
    v_user_id uuid;
BEGIN
    -- 1. Get a user ID to assign as the contributor/locker (optional, can be null)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    -- 2. Insert a dummy name if you don't have one, or get an existing one
    INSERT INTO public.names (name, origin, verification_status)
    VALUES ('Emeka', 'Igbo', 'unverified')
    RETURNING id INTO v_name_id;

    -- 3. Insert a pending AUDIO submission for this name
    INSERT INTO public.audio_submissions (name_id, contributor_id, audio_url, status)
    VALUES (
        v_name_id, 
        v_user_id, -- can be null if no user
        'https://www.soundhelix.com/examples/mp3/Soundhelix-Song-1.mp3', 
        'pending'
    );
    
    -- 4. Create another one for Yoruba
     INSERT INTO public.names (name, origin, verification_status)
    VALUES ('Ade', 'Yoruba', 'unverified')
    RETURNING id INTO v_name_id;

    INSERT INTO public.audio_submissions (name_id, contributor_id, audio_url, status)
    VALUES (
        v_name_id, 
        v_user_id, 
        'https://www.soundhelix.com/examples/mp3/Soundhelix-Song-1.mp3', 
        'pending'
    );

END $$;

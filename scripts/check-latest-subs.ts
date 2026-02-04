
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSubmissions() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

    console.log("Checking latest 5 audio submissions...");
    const { data, error } = await supabase
        .from('audio_submissions')
        .select('*, names(name)')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Latest Submissions:', JSON.stringify(data, null, 2));
    }
}

checkSubmissions();

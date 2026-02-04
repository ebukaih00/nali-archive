
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { supabaseAdmin } from '../lib/supabase'; // Using the admin client if valid for script context, else manual

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function verify() {
    const namePattern = "Eze_Debug_%";

    console.log(`Checking status of debug name...`);

    const { data, error } = await supabase
        .from('names')
        .select('id, name, verification_status, status, audio_url, phonetic_hint')
        .ilike('name', namePattern);

    if (error) {
        console.error('Error fetching name:', error);
    } else {
        console.log('Current Name Record:', JSON.stringify(data, null, 2));

        // Also check submissions
        if (data && data.length > 0) {
            const { data: subs } = await supabase
                .from('audio_submissions')
                .select('*')
                .eq('name_id', data[0].id);
            console.log('Related Submissions:', JSON.stringify(subs, null, 2));
        }
    }
}

verify();

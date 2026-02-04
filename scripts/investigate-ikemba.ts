
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function investigate() {
    const name = "IKEMBA";
    console.log(`Investigating name: ${name}`);

    // Check the names table
    const { data: nameData, error: nameError } = await supabase
        .from('names')
        .select('*')
        .ilike('name', name)
        .maybeSingle();

    if (nameError) {
        console.error('Error fetching name data:', nameError);
    } else {
        console.log('Names Table Entry:', JSON.stringify(nameData, null, 2));
    }

    // Check audio_submissions
    if (nameData) {
        const { data: subs, error: subError } = await supabase
            .from('audio_submissions')
            .select('*')
            .eq('name_id', nameData.id);

        if (subError) {
            console.error('Error fetching submissions:', subError);
        } else {
            console.log('Related Submissions:', JSON.stringify(subs, null, 2));
        }
    }
}

investigate();

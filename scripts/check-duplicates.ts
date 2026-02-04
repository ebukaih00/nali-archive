
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

async function checkDuplicates() {
    const { data, error } = await supabase
        .from('names')
        .select('id, name, verification_status, audio_url, status')
        .ilike('name', 'Ikemba');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Matches for IKEMBA:', JSON.stringify(data, null, 2));
    }
}

checkDuplicates();

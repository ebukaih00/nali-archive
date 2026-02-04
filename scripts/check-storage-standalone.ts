
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkStorage() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('Missing Supabase environment variables');
        process.exit(1);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const id = "17592";
    console.log(`Checking storage for ID: ${id}`);

    const { data, error } = await supabaseAdmin.storage
        .from('name-audio')
        .list('', {
            search: id
        });

    if (error) {
        console.error('Error listing storage:', error);
    } else {
        console.log('Matching files in name-audio:', JSON.stringify(data, null, 2));
    }
}

checkStorage();

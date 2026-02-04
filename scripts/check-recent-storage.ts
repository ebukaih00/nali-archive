
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkRecentStorage() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

    console.log("Checking last 20 files in name-audio...");
    const { data, error } = await supabase.storage
        .from('name-audio')
        .list('', {
            limit: 20,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
        });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Recent Files:', JSON.stringify(data, null, 2));
    }
}

checkRecentStorage();

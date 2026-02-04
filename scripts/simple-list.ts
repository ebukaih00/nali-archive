
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listFiles() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

    const { data, error } = await supabase.storage.from('name-audio').list();
    if (error) {
        console.error(error);
    } else {
        console.log(`Found ${data?.length} files in root`);
        console.log('Sample:', data?.slice(0, 5));
    }
}

listFiles();

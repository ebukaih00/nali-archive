
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkConstraints() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

    console.log("Checking constraints for 'names' and 'audio_submissions'...");

    const { data, error } = await supabase.rpc('pg_get_table_constraints', { t_name: 'names' });
    // If RPC is missing, let's try a different way.

    // Alternative: query pg_constraint via SQL (if we can)
    const { data: raw, error: rawErr } = await supabase.from('names').select('*').limit(1);
    console.log("Sample Name:", JSON.stringify(raw, null, 2));
}

checkConstraints();

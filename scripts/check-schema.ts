
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSchema() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

    // Check columns for names
    const { data: cols, error: err } = await supabase.rpc('get_table_columns', { table_name: 'names' });
    if (err) console.log("Can't use RPC, trying direct query on pg_attribute...");

    // Since I can't easily use RPC without it being defined, let's just try to select one row from audio_submissions and keys() it.
    const { data: subs } = await supabase.from('audio_submissions').select('*').limit(1);
    console.log("Audio Submissions Sample Keys:", subs && subs[0] ? Object.keys(subs[0]) : "No records found");

    const { data: names } = await supabase.from('names').select('*').limit(1);
    console.log("Names Sample Keys:", names && names[0] ? Object.keys(names[0]) : "No records found");
}

checkSchema();

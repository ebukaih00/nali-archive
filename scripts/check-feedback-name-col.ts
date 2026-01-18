
import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkNameColumn() {
    const { supabaseAdmin } = await import('../lib/supabase');

    console.log('Checking if "name" column exists in feedback table...');
    const { data, error } = await supabaseAdmin
        .from('feedback')
        .select('name')
        .limit(1);

    if (error) {
        console.log('Error selecting name:', error.message);
    } else {
        console.log('Successfully selected name column. Column exists.');
    }
}

checkNameColumn();

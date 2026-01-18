
import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkColumns() {
    const { supabaseAdmin } = await import('../lib/supabase');

    // Try inserting dummy to check schema constraints
    // We expect foreign key violation to 'names' table if name_id is invalid, 
    // OR a column error if schema is wrong.
    console.log('Attempting insert to check schema...');
    const { error: insertError } = await supabaseAdmin
        .from('feedback')
        .insert({
            name_id: 1, // creating a dummy id dependency might fail if id 1 doesn't exist, but that proves column exists
            category: 'Test',
            comment: 'Test'
        });

    if (insertError) {
        console.log('Insert Result:', insertError.message);
    } else {
        console.log('Insert successful (surprisingly)');
    }
}

checkColumns();

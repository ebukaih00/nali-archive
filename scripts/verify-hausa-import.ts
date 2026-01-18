
import { config } from 'dotenv';
config({ path: '.env.local' });

async function verifyImport() {
    const { supabaseAdmin } = await import('../lib/supabase');

    // Check count
    const { count, error: countError } = await supabaseAdmin
        .from('names')
        .select('*', { count: 'exact', head: true })
        .eq('origin', 'Hausa');

    if (countError) {
        console.error('Count error:', countError);
    } else {
        console.log(`Total Hausa names in DB: ${count}`);
    }

    // Check sample
    const { data, error } = await supabaseAdmin
        .from('names')
        .select('*')
        .eq('origin', 'Hausa')
        .limit(5);

    if (error) {
        console.error('Fetch error:', error);
    } else {
        console.log('Sample Hausa names:', JSON.stringify(data, null, 2));
    }
}

verifyImport();

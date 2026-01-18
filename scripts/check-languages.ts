
import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkLanguageValues() {
    const { supabaseAdmin } = await import('../lib/supabase');
    // We can't do distinct easily with supabase-js select without a helper or raw rpc sometimes, 
    // but we can fetch all and aggregate in JS for small datasets.
    // Or we can just fetch a sample.
    const { data, error } = await supabaseAdmin.from('names').select('language');

    if (error) {
        console.error('Error fetching languages:', error);
        return;
    }

    const counts: Record<string, number> = {};
    data?.forEach((row: any) => {
        const l = row.language || 'NULL';
        counts[l] = (counts[l] || 0) + 1;
    });

    console.log('Language column distribution:', counts);
}

checkLanguageValues();

import { config } from 'dotenv';
config({ path: '.env.local' });
import { supabaseAdmin } from '../lib/supabase';

async function inspectNames() {
    const { data, error } = await supabaseAdmin
        .from('names')
        .select('*');

    if (error) {
        console.error('Error fetching names:', error);
        return;
    }

    console.log(`Found ${data.length} names in total.`);
    console.log('--- Sample of names ---');
    // Show all to be sure, or a large sample
    data.forEach((n: any) => {
        console.log(`${n.name} [Lang: ${n.language}] [Country: ${n.origin_country}]`);
    });
}

inspectNames();

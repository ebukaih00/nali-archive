
import { config } from 'dotenv';
config({ path: '.env.local' });
import { supabase } from '../lib/supabaseClient';

async function cleanupBadYorubaNames() {
    console.log('--- Cleaning up Bad Yoruba Names ---');

    // Specific patterns identified
    const patterns = ['Echu%'];

    for (const pattern of patterns) {
        console.log(`Checking pattern: ${pattern}`);

        const { data, error } = await supabase
            .from('names')
            .select('*')
            .ilike('name', pattern);

        if (error) {
            console.error(error);
            continue;
        }

        if (data && data.length > 0) {
            console.log(`Found ${data.length} entries matching "${pattern}":`);
            data.forEach(n => console.log(` - ${n.name} (${n.meaning})`));

            // Delete them
            const { error: delError } = await supabase
                .from('names')
                .delete()
                .ilike('name', pattern);

            if (delError) console.error('Delete Error:', delError);
            else console.log('✅ Deleted successfully.');
        } else {
            console.log('No matches found.');
        }
    }
}

cleanupBadYorubaNames();

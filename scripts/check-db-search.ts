
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkDb() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    console.log('--- Checking for unaccent extension ---');
    const { data: extensions, error: extError } = await supabase.rpc('get_extensions' as any);
    if (extError) {
        // If RPC doesn't exist, try raw query for extensions
        const { data: pgExt } = await supabase.from('pg_extension' as any).select('extname');
        console.log('Available Extensions:', pgExt?.map(e => e.extname));
    } else {
        console.log('Extensions:', extensions);
    }

    console.log('\n--- Checking names table columns ---');
    const { data: columns, error: colError } = await supabase.from('names').select('name').limit(1);
    if (colError) {
        console.error('Error fetching names:', colError);
    } else {
        console.log('Successfully queried names table.');
    }
}

checkDb();

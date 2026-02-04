
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testSearch() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const query = 'Toluwanimi';
    console.log(`Searching for: ${query}`);

    // Test ilike exact
    const { data: exact } = await supabase.from('names').select('name').ilike('name', query);
    console.log('Exact (ilike) matches:', exact);

    // Test ilike wildcard
    const { data: wildcard } = await supabase.from('names').select('name').ilike('name', `%${query}%`).limit(5);
    console.log('Wildcard matches:', wildcard);

    // Search for the one with marks specifically to see how it looks
    const marked = 'Tolúwanimí';
    const { data: specific } = await supabase.from('names').select('name').eq('name', marked);
    console.log(`Searching for specific marked name "${marked}":`, specific);
}

testSearch();

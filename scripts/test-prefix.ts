
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testPrefix() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const query = 'Tolu';
    console.log(`Searching for prefix: ${query}%`);

    const { data } = await supabase.from('names').select('name').ilike('name', `${query}%`);
    console.log('Results:', data);
}

testPrefix();

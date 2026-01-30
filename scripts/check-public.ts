
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPublicAccess(searchName: string) {
    console.log(`🌍 Checking PUBLIC access for: "${searchName}"`);
    const { data, error } = await supabase
        .from('names')
        .select('id, name, verification_status')
        .ilike('name', searchName);

    if (error) {
        console.error("❌ Public Access Error:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`✅ Success! Publicly visible:`, JSON.stringify(data, null, 2));
    } else {
        console.log("🚫 Not visible to public (empty results).");
    }
}

checkPublicAccess('Achebe');


import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSuggestions(query: string) {
    console.log(`🔍 Testing suggestions for: "${query}"`);
    const { data, error } = await supabase
        .from('names')
        .select('id, name, origin, meaning, phonetic_hint, origin_country')
        .eq('verification_status', 'verified')
        .ilike('name', `${query}%`)
        .limit(8);

    if (error) {
        console.error("❌ Suggestions Error:", error);
        return;
    }

    console.log(`✅ Suggestions found: ${data.length}`);
    console.log(JSON.stringify(data, null, 2));
}

async function testExactMatch(query: string) {
    console.log(`🔍 Testing exact match for: "${query}"`);
    const { data, error } = await supabase
        .from('names')
        .select('*')
        .eq('verification_status', 'verified')
        .ilike('name', query.trim())
        .maybeSingle();

    if (error) {
        console.error("❌ Exact Match Error:", error);
        return;
    }

    console.log(`✅ Exact match found: ${!!data}`);
    if (data) console.log(JSON.stringify(data, null, 2));
}

(async () => {
    await testSuggestions('Ach');
    await testExactMatch('Achebe');
})();


import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkDatabaseStats() {
    console.log("📊 Database Statistics:");

    const { count: total } = await supabase.from('names').select('*', { count: 'exact', head: true });
    const { count: verified } = await supabase.from('names').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified');
    const { count: unverified } = await supabase.from('names').select('*', { count: 'exact', head: true }).eq('verification_status', 'unverified');
    const { count: ignored } = await supabase.from('names').select('*', { count: 'exact', head: true }).eq('ignored', true);

    console.log(`- Total Names: ${total}`);
    console.log(`- Verified: ${verified}`);
    console.log(`- Unverified: ${unverified}`);
    console.log(`- Ignored: ${ignored}`);

    const { count: unverifiedWithPhonetic } = await supabase
        .from('names')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'unverified')
        .not('phonetic_hint', 'is', null)
        .neq('phonetic_hint', '');

    console.log(`- Unverified with Phonetic: ${unverifiedWithPhonetic}`);

    const { count: unverifiedWithAudio } = await supabase
        .from('names')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'unverified')
        .not('audio_url', 'is', null)
        .neq('audio_url', '');

    console.log(`- Unverified with Audio: ${unverifiedWithAudio}`);

    // Check some examples of unverified names
    const { data: examples } = await supabase
        .from('names')
        .select('name, phonetic_hint, audio_url')
        .eq('verification_status', 'unverified')
        .limit(10);

    console.log("\n📋 Examples of Unverified Names:");
    console.log(JSON.stringify(examples, null, 2));
}

checkDatabaseStats();


import { config } from 'dotenv';
config({ path: '.env.local' });

async function getSample() {
    const { supabaseAdmin } = await import('../lib/supabase');
    const { data } = await supabaseAdmin
        .from('names')
        .select('id, name, phonetic_hint, audio_url')
        .eq('origin', 'Igbo')
        .not('audio_url', 'is', null)
        .limit(20);

    console.log(`Found ${data?.length} Igbo names with audio.`);
    data?.forEach(n => {
        console.log(`${n.id}|${n.name}|${n.phonetic_hint}|${n.audio_url}`);
    });
}
getSample();

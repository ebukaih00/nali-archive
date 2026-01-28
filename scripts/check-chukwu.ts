
import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkChukwu() {
    const { supabaseAdmin } = await import('../lib/supabase');
    const { data } = await supabaseAdmin
        .from('names')
        .select('id, name, phonetic_hint')
        .ilike('name', '%Chukwu%');

    data?.forEach(n => {
        console.log(`${n.id}|${n.name}|${n.phonetic_hint}`);
    });
}
checkChukwu();

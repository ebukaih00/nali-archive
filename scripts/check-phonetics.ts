
import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkPhonetics() {
    const { supabaseAdmin } = await import('../lib/supabase');

    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await supabaseAdmin
            .from('names')
            .select('id, name, origin, phonetic_hint')
            .range(from, from + step - 1);

        if (error) break;
        if (!data || data.length === 0) break;

        allData = allData.concat(data);
        from += step;
    }

    const origins = ['Yoruba', 'Igbo', 'Hausa', 'Urhobo', 'Edo'];
    origins.forEach(orig => {
        const sample = allData.filter(n => n.origin === orig && n.phonetic_hint).slice(0, 5);
        console.log(`\n--- Sample ${orig} Phonetics ---`);
        sample.forEach(s => console.log(`${s.name}: ${s.phonetic_hint}`));
    });
}

checkPhonetics();

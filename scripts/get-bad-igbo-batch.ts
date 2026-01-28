
import { config } from 'dotenv';
config({ path: '.env.local' });

async function getNextBatch() {
    const { supabaseAdmin } = await import('../lib/supabase');

    let allData: any[] = [];
    let from = 0;
    const step = 2000;

    while (allData.length < 9000) {
        const { data, error } = await supabaseAdmin
            .from('names')
            .select('id, name, origin, phonetic_hint')
            .range(from, from + step - 1);

        if (error) break;
        if (!data || data.length === 0) break;

        allData = allData.concat(data);
        from += step;
    }

    const bad = allData.filter(n => {
        if (!n.phonetic_hint) return true;
        const hasSpecial = /[^\x00-\x7F]/.test(n.phonetic_hint);
        const isName = n.name.toLowerCase() === n.phonetic_hint.toLowerCase();
        return hasSpecial || isName;
    }).slice(0, 300);

    bad.forEach(n => {
        console.log(`${n.id}|${n.name}`);
    });
}

getNextBatch();


import { config } from 'dotenv';
config({ path: '.env.local' });

async function getAllBad() {
    const { supabaseAdmin } = await import('../lib/supabase');

    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await supabaseAdmin
            .from('names')
            .select('id, name, origin, phonetic_hint')
            .range(from, from + step - 1);

        if (error || !data || data.length === 0) break;

        allData = allData.concat(data);
        from += step;
    }

    const bad = allData.filter(n => {
        if (!n.phonetic_hint) return true;
        const hasSpecial = /[^\x00-\x7F]/.test(n.phonetic_hint);
        const isName = n.name.toLowerCase() === n.phonetic_hint.toLowerCase();
        return hasSpecial || isName;
    });

    bad.forEach(n => {
        console.log(`${n.id}|${n.name}|${n.origin}`);
    });
}

getAllBad();

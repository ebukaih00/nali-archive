
import { config } from 'dotenv';
config({ path: '.env.local' });

async function listMissing() {
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

    const missing = allData.filter(n => !n.phonetic_hint);
    missing.forEach(n => {
        console.log(`${n.id}|${n.name}|${n.origin}`);
    });
}

listMissing();

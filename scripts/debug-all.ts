
import { config } from 'dotenv';
config({ path: '.env.local' });

async function debugAll() {
    const { supabaseAdmin } = await import('../lib/supabase');

    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    console.log('Fetching...');
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('names')
            .select('id, name, origin, phonetic_hint')
            .range(from, from + step - 1);

        if (error) {
            console.error('Error:', error);
            break;
        }
        if (!data || data.length === 0) {
            console.log('No more data.');
            break;
        }

        console.log(`Fetched ${data.length} items from ${from}. Total so far: ${allData.length + data.length}`);
        allData = allData.concat(data);
        from += step;

        if (allData.length > 20000) break; // safety
    }

    const bad = allData.filter(n => {
        if (!n.phonetic_hint) return true;
        const hasSpecial = /[^\x00-\x7F]/.test(n.phonetic_hint);
        const isName = n.name.toLowerCase() === n.phonetic_hint.toLowerCase();
        return hasSpecial || isName;
    });

    console.log(`\nFiltered Bad: ${bad.length}`);
    if (bad.length > 0) {
        console.log('Sample bad:', bad.slice(0, 10).map(n => n.name));
    }
}

debugAll();

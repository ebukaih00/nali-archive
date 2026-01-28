
import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkPhoneticCoverage() {
    const { supabaseAdmin } = await import('../lib/supabase');

    console.log('Fetching names to check phonetic coverage...');
    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await supabaseAdmin
            .from('names')
            .select('origin, phonetic_hint')
            .range(from, from + step - 1);

        if (error) break;
        if (!data || data.length === 0) break;

        allData = allData.concat(data);
        from += step;
    }

    const coverage: Record<string, { total: number, withPhonetic: number }> = {};

    allData.forEach((n: any) => {
        const o = n.origin || 'Unknown';
        if (!coverage[o]) coverage[o] = { total: 0, withPhonetic: 0 };
        coverage[o].total++;
        if (n.phonetic_hint && n.phonetic_hint.trim() !== '' && n.phonetic_hint !== 'N/A') {
            coverage[o].withPhonetic++;
        }
    });

    console.log('--- Phonetic Hint Coverage ---');
    Object.entries(coverage).forEach(([origin, stats]) => {
        const pct = ((stats.withPhonetic / stats.total) * 100).toFixed(1);
        console.log(`${origin}: ${stats.withPhonetic}/${stats.total} (${pct}%)`);
    });
}

checkPhoneticCoverage();

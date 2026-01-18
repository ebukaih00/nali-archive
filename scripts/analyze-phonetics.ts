
import { config } from 'dotenv';
config({ path: '.env.local' });

async function analyzePhonetics() {
    const { supabaseAdmin } = await import('../lib/supabase');

    const { data, error } = await supabaseAdmin
        .from('names')
        .select('origin, phonetic_hint');

    if (error) {
        console.error('Error fetching names:', error);
        return;
    }

    const stats: Record<string, { total: number, missing: number }> = {};

    data?.forEach((row: any) => {
        const origin = row.origin || 'Unknown';
        if (!stats[origin]) stats[origin] = { total: 0, missing: 0 };
        stats[origin].total++;
        if (!row.phonetic_hint) stats[origin].missing++;
    });

    console.log('--- Database Audit Statistics ---');
    console.table(stats);
}

analyzePhonetics();

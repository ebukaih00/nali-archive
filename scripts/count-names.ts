
import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkCounts() {
    const { supabaseAdmin } = await import('../lib/supabase');

    // Get total count
    const { count, error: countError } = await supabaseAdmin
        .from('names')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Count error:', countError);
        return;
    }
    console.log('Total names in DB:', count);

    // Fetch origins in batches if needed, but let's try 10k at once if possible or just use a group by query if it exists
    // actually let's just use a loop to be sure
    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await supabaseAdmin
            .from('names')
            .select('origin')
            .range(from, from + step - 1);

        if (error) break;
        if (!data || data.length === 0) break;

        allData = allData.concat(data);
        from += step;
        if (allData.length >= (count || 0)) break;
    }

    const counts: Record<string, number> = {};
    allData.forEach((t: any) => {
        const o = t.origin || 'NULL';
        counts[o] = (counts[o] || 0) + 1;
    });
    console.log('Counts by origin (Total):', counts);
}

checkCounts();

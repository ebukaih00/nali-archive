
import { config } from 'dotenv';
config({ path: '.env.local' });

async function deduplicate() {
    const { supabaseAdmin } = await import('../lib/supabase');

    console.log('Fetching all names for deduplication...');
    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await supabaseAdmin
            .from('names')
            .select('id, name, origin')
            .range(from, from + step - 1);

        if (error) break;
        if (!data || data.length === 0) break;

        allData = allData.concat(data);
        from += step;
        process.stdout.write('.');
    }

    console.log(`\nTotal entries: ${allData.length}`);

    const seen = new Map<string, number>(); // key -> firstId
    const toDelete: number[] = [];

    allData.forEach((n: any) => {
        const key = `${n.name.trim().toLowerCase()}|${n.origin}`;
        if (seen.has(key)) {
            toDelete.push(n.id);
        } else {
            seen.set(key, n.id);
        }
    });

    console.log(`Found ${toDelete.length} duplicates to remove.`);

    if (toDelete.length > 0) {
        // Delete in batches of 100 to avoid request limits
        const batchSize = 100;
        for (let i = 0; i < toDelete.length; i += batchSize) {
            const batch = toDelete.slice(i, i + batchSize);
            const { error } = await supabaseAdmin
                .from('names')
                .delete()
                .in('id', batch);

            if (error) {
                console.error(`Error deleting batch ${i}:`, error.message);
            } else {
                process.stdout.write('x');
            }
        }
        console.log('\nDeduplication complete.');
    } else {
        console.log('No duplicates found.');
    }
}

deduplicate();

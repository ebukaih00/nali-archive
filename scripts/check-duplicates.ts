
import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkDuplicates() {
    const { supabaseAdmin } = await import('../lib/supabase');

    let allData: any[] = [];
    let from = 0;
    const step = 1000;

    console.log('Fetching all names for duplicate check...');
    while (true) {
        const { data, error } = await supabaseAdmin
            .from('names')
            .select('name, origin')
            .range(from, from + step - 1);

        if (error) {
            console.error('Fetch error:', error);
            break;
        }
        if (!data || data.length === 0) break;

        allData = allData.concat(data);
        from += step;
        process.stdout.write('.');
    }

    console.log(`\nTotal Names examined: ${allData.length}`);

    const counts: Record<string, number> = {};
    const dupDetails: Record<string, number> = {};

    allData.forEach((n: any) => {
        const key = `${n.name.trim().toLowerCase()}|${n.origin}`;
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] > 1) {
            dupDetails[key] = counts[key];
        }
    });

    const dupCount = Object.keys(dupDetails).length;
    console.log(`Unique Names|Origin pairs: ${Object.keys(counts).length}`);
    console.log(`Duplicate Keys found: ${dupCount}`);

    if (dupCount > 0) {
        const sortedDups = Object.entries(dupDetails).sort((a, b) => b[1] - a[1]);
        console.log('Top Duplicates (Count):');
        sortedDups.slice(0, 10).forEach(([k, c]) => console.log(`  - ${k}: ${c}`));
    }
}

checkDuplicates();

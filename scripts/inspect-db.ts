
import { config } from 'dotenv';
config({ path: '.env.local' });

async function inspectNames() {
    const { supabaseAdmin } = await import('../lib/supabase');
    const { data, error } = await supabaseAdmin
        .from('names')
        .select('*');

    if (error) {
        console.error('Error fetching names:', error);
        return;
    }

    console.log(`Found ${data.length} names in total.`);

    const origins: Record<string, number> = {};
    data.forEach((n: any) => {
        const o = n.origin || 'Unknown';
        origins[o] = (origins[o] || 0) + 1;
    });
    console.log('Distribution:', origins);

    const ngozi = data.filter((n: any) => n.name.toLowerCase().includes('ngozi'));
    console.log('Ngozi entries:', ngozi);

    const ada = data.filter((n: any) => n.name.toLowerCase() === 'ada');
    console.log('Ada entries:', ada);

    const igbo = data.filter((n: any) => n.origin === 'Igbo');
    console.log(`Igbo samples (${igbo.length}):`, igbo.slice(0, 10).map((n: any) => n.name));
}

inspectNames();


import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkBadPhonetics() {
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

    const bad = allData.filter(n => {
        if (!n.phonetic_hint) return true;
        // Check for non-standard English alpha-numeric/hyphen
        const hasSpecial = /[^\x00-\x7F]/.test(n.phonetic_hint);
        // Check if it's just the name (case insensitive)
        const isName = n.name.toLowerCase() === n.phonetic_hint.toLowerCase();
        return hasSpecial || isName;
    });

    console.log(`Total entries: ${allData.length}`);
    console.log(`Bad/Missing Phonetics: ${bad.length}`);

    const byOrigin: Record<string, number> = {};
    bad.forEach(n => {
        byOrigin[n.origin] = (byOrigin[n.origin] || 0) + 1;
    });
    console.log('Bad by origin:', byOrigin);

    // Sample some Igbo bad ones
    const igboBad = bad.filter(n => n.origin === 'Igbo').slice(0, 5);
    console.log('\nSample Igbo Bad Phonetics:');
    igboBad.forEach(n => console.log(`${n.name} -> ${n.phonetic_hint}`));
}

checkBadPhonetics();

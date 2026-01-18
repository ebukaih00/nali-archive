
import { config } from 'dotenv';
config({ path: '.env.local' });

async function verifyMiddleBelt() {
    const { supabaseAdmin } = await import('../lib/supabase');

    // Check Tiv
    const { count: tivCount } = await supabaseAdmin
        .from('names')
        .select('*', { count: 'exact', head: true })
        .eq('origin', 'Tiv');

    // Check Idoma
    const { count: idomaCount } = await supabaseAdmin
        .from('names')
        .select('*', { count: 'exact', head: true })
        .eq('origin', 'Idoma');

    console.log(`Tiv Count: ${tivCount}`);
    console.log(`Idoma Count: ${idomaCount}`);
}

verifyMiddleBelt();

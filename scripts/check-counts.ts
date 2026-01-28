
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCounts() {
    // 1. Unverified names
    const { count: unverifiedCount } = await supabase
        .from('names')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'unverified');

    // 2. Pending submissions
    const { count: pendingSubmissions } = await supabase
        .from('audio_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    // 3. Languages in pending
    const { data: languages } = await supabase
        .from('audio_submissions')
        .select('names(origin)')
        .eq('status', 'pending');

    console.log(`Unverified names: ${unverifiedCount}`);
    console.log(`Pending submissions: ${pendingSubmissions}`);

    const langCounts: Record<string, number> = {};
    languages?.forEach((l: any) => {
        const lang = l.names?.origin || 'Unknown';
        langCounts[lang] = (langCounts[lang] || 0) + 1;
    });
    console.log('Pending Languages:', langCounts);
}

checkCounts();

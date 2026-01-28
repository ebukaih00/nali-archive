
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCounts() {
    try {
        const { count: total } = await supabase
            .from('names')
            .select('*', { count: 'exact', head: true });

        const { count: verified } = await supabase
            .from('names')
            .select('*', { count: 'exact', head: true })
            .eq('verification_status', 'verified');

        const { count: unverified } = await supabase
            .from('names')
            .select('*', { count: 'exact', head: true })
            .eq('verification_status', 'unverified');

        const { count: pendingSubmissions } = await supabase
            .from('audio_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        const { data: languages } = await supabase
            .from('audio_submissions')
            .select('names(origin)')
            .eq('status', 'pending');

        console.log(`--- DB STATUS ---`);
        console.log(`Total Names: ${total}`);
        console.log(`Verified Names: ${verified}`);
        console.log(`Unverified Names: ${unverified}`);
        console.log(`\n--- STUDIO STATUS ---`);
        console.log(`Pending Submissions: ${pendingSubmissions}`);

        const langCounts = {};
        languages?.forEach((l) => {
            const lang = l.names?.origin || 'Unknown';
            langCounts[lang] = (langCounts[lang] || 0) + 1;
        });
        console.log('Work by Language:', langCounts);

    } catch (e) {
        console.error(e);
    }
}

checkCounts();

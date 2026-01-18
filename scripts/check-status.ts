import { config } from 'dotenv';
config({ path: '.env.local' });

// Now import the lib which relies on process.env
// import { supabaseAdmin } from '../lib/supabase';

async function checkStatus() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log('Checking name status counts...');

    const { count: total, error: errTotal } = await supabaseAdmin
        .from('names')
        .select('*', { count: 'exact', head: true });

    if (errTotal) console.error('Error getting total:', errTotal);

    const { count: verified, error: errVerified } = await supabaseAdmin
        .from('names')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'verified');

    if (errVerified) console.error('Error getting verified:', errVerified);

    const { count: pending, error: errPending } = await supabaseAdmin
        .from('names')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    if (errPending) console.error('Error getting pending:', errPending);

    const { count: nullStatus, error: errNull } = await supabaseAdmin
        .from('names')
        .select('*', { count: 'exact', head: true })
        .is('status', null);

    if (errNull) console.error('Error getting null status:', errNull);

    console.log({
        total: total,
        verified: verified,
        pending: pending,
        nullStatus: nullStatus
    });
}

checkStatus();

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function compareAccess() {
    console.log('--- Testing Access Control ---');

    // 1. Admin Access
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { count: adminCount, error: adminError } = await adminClient
        .from('names')
        .select('*', { count: 'exact', head: true });

    if (adminError) console.error('Admin Error:', adminError);
    console.log(`🔑 Admin (Service Role) sees: ${adminCount} rows`);

    // 2. Public Access
    const publicClient = createClient(supabaseUrl, supabaseAnonKey);
    const { count: publicCount, error: publicError } = await publicClient
        .from('names')
        .select('*', { count: 'exact', head: true });

    if (publicError) console.error('Public (Anon) Error:', publicError);
    console.log(`🌍 Public (Anon Key) sees:   ${publicCount} rows`);

    if (adminCount && (!publicCount || publicCount === 0)) {
        console.error('\n🚨 CRITICAL: Public client sees 0 rows! RLS is likely enabled without a SELECT policy.');
    } else {
        console.log('\n✅ Access seems consistent.');
    }
}

compareAccess();

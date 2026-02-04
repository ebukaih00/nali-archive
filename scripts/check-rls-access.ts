
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkPolicies() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    console.log('--- RLS Policies for "names" ---');
    const { data: namePolicies, error: nameError } = await supabase.rpc('get_policies', { table_name: 'names' });
    // Since rpc('get_policies') might not exist, we'll try a raw query via a temporary function if needed, 
    // but usually we can check via information_schema or pg_policies

    const { data: policies, error } = await supabase.from('pg_policies' as any).select('*').eq('tablename', 'names');

    if (error) {
        // If pg_policies is not accessible via API, we'll use a direct SQL approach if we had a tool for it.
        // Instead, let's just test access as an authenticated user.
        console.log('Could not fetch policies directly. Testing access instead...');
    } else {
        console.table(policies);
    }

    // Alternative: Check if RLS is enabled
    const { data: rlsStatus } = await supabase.rpc('check_rls', { table_name: 'names' });
    console.log('RLS Status:', rlsStatus);
}

async function testAccessAsUser() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, anonKey);

    // Note: We can't easily "become" the user without a token.
    // However, if RLS is 'open to public' as the user thinks, then anon should see it.
    console.log('\n--- Testing Access as ANON ---');
    const { data, error, count } = await supabase.from('names').select('id', { count: 'exact', head: true });
    if (error) {
        console.error('❌ ANON cannot see names:', error.message);
    } else {
        console.log('✅ ANON can see names. Count:', count);
    }
}

testAccessAsUser();

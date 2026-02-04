
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function diagnoseAllUsers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('Missing Supabase environment variables');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('--- System-wide User Diagnosis ---');

    // 1. List all Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Error fetching auth users:', authError);
        return;
    }

    // 2. List all Profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return;
    }

    console.log(`Found ${users.length} Auth Users and ${profiles?.length || 0} Profiles.`);

    const combined = users.map(u => {
        const profile = profiles?.find(p => p.id === u.id);
        return {
            id: u.id,
            email: u.email,
            role: profile?.role || 'MISSING',
            confirmed: !!u.email_confirmed_at,
            last_sign_in: u.last_sign_in_at
        };
    });

    console.table(combined);

    // 3. Specifically check for 'ihuezeebuka' pattern
    console.log('\n--- Searching for "ihuezeebuka" pattern ---');
    const targetPattern = 'ihuezeebuka';
    const matches = combined.filter(u => u.email?.toLowerCase().includes(targetPattern));
    console.table(matches);

    // 4. Check for unverified contributor applications
    const { data: apps } = await supabase
        .from('contributor_applications')
        .select('*')
        .ilike('email', `%${targetPattern}%`);

    console.log('\n--- Applications matching "ihuezeebuka" ---');
    console.table(apps?.map(a => ({ email: a.email, status: a.status })));
}

diagnoseAllUsers();

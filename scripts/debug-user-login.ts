
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugUser(email: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('Missing Supabase environment variables');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log(`--- Debugging: ${email} ---`);

    // 1. Check Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!authUser) {
        console.log('❌ Auth: No user account found.');
    } else {
        console.log(`✅ Auth: Found user with ID: ${authUser.id}`);
        console.log(`   Confirmed At: ${authUser.email_confirmed_at || 'Not confirmed'}`);
        console.log(`   Last Sign In: ${authUser.last_sign_in_at || 'Never'}`);
    }

    // 2. Check Application
    const { data: app } = await supabase
        .from('contributor_applications')
        .select('status')
        .ilike('email', email)
        .single();

    console.log(`📋 Application Status: ${app?.status || 'No application found'}`);

    // 3. Check Profile
    if (authUser) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .single();

        console.log(`👤 Profile Role: ${profile?.role || 'No profile row found yet'}`);
    }

    console.log('---------------------------');
}

const emailToDebug = 'ihuezeebuka@yahoo.com';
debugUser(emailToDebug);

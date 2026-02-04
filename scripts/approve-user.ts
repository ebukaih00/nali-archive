
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function approveUser(email: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('Missing Supabase environment variables');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log(`Searching for application: ${email}...`);

    // 1. Update Application Status
    const { data: application, error: appError } = await supabase
        .from('contributor_applications')
        .update({ status: 'approved' })
        .ilike('email', email)
        .select();

    if (appError) {
        console.error('Error updating application:', appError);
        return;
    }

    if (!application || application.length === 0) {
        console.warn('No application found for this email.');
    } else {
        console.log('Application approved successfully.');
    }

    // 2. Check and Update Profile
    console.log(`Checking for existing profile for: ${email}...`);

    // First, find the user ID from auth.users (via a trick or by searching profiles if email is stored there)
    // Actually, profiles table might not have email, let's check auth.admin

    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (authUser) {
        console.log(`Found Auth User: ${authUser.id}. Updating profile role...`);
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ role: 'contributor' })
            .eq('id', authUser.id);

        if (profileError) {
            console.error('Error updating profile:', profileError);
        } else {
            console.log('Profile role updated to "contributor".');
        }
    } else {
        console.log('No registered account found for this email yet. The profile will be created automatically when they first sign up.');
    }
}

const emailToApprove = 'ihuezeebuka@yahoo.com';
approveUser(emailToApprove);

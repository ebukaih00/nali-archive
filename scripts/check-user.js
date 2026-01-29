
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUser(email) {
    try {
        console.log(`🔍 Checking data for: ${email}`);

        // 1. Check Application
        const { data: application } = await supabase
            .from('contributor_applications')
            .select('*')
            .eq('email', email)
            .single();

        console.log('--- Application ---');
        console.log(application || 'Not found');

        // 2. Check Auth User
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const user = users.find(u => u.email === email);

        console.log('\n--- Auth User ---');
        if (user) {
            console.log(`ID: ${user.id}`);
            console.log(`Last Sign In: ${user.last_sign_in_at}`);
        } else {
            console.log('Not found in Auth');
        }

        // 3. Check Profile
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            console.log('\n--- Profile ---');
            console.log(profile || 'Not found');
        }

    } catch (e) {
        console.error(e);
    }
}

checkUser('ihuezeebuka5@gmail.com');

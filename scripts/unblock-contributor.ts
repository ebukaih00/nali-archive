
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function unblockContributor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

    const emails = ['ihuezeebuka@yahoo.com', 'ihuezeebuka5@gmail.com'];

    for (const email of emails) {
        console.log(`--- Processing: ${email} ---`);

        // 1. Ensure approved application
        const { error: appError } = await supabase
            .from('contributor_applications')
            .upsert({ email, status: 'approved', full_name: 'Contributor' }, { onConflict: 'email' });

        if (appError) console.error(`Error with application for ${email}:`, appError);
        else console.log(`✅ Application approved/confirmed.`);

        // 2. Ensure profile exists and has role 'contributor'
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({ id: user.id, role: 'contributor' }, { onConflict: 'id' });

            if (profileError) console.error(`Error with profile for ${email}:`, profileError);
            else console.log(`✅ Profile promoted to 'contributor'.`);
        } else {
            console.log(`ℹ️ No account found for ${email} yet. Automation will handle it on signup.`);
        }
    }
}

unblockContributor();

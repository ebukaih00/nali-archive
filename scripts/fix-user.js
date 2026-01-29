
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUser(email) {
    try {
        console.log(`🔧 Fixing role for: ${email}`);

        // 1. Get Auth User
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const user = users.find(u => u.email === email);

        if (!user) {
            console.error("User not found in Auth.");
            return;
        }

        // 2. Prepare Update
        const updates = { role: 'contributor' };

        // Try to get languages but don't fail if they don't exist
        try {
            const { data: app } = await supabase
                .from('contributor_applications')
                .select('languages')
                .eq('email', email)
                .single();
            if (app?.languages) {
                updates.languages = app.languages;
            }
        } catch (e) {
            console.log("Note: Could not fetch application languages.");
        }

        // 3. Perform Update
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) {
            if (error.message.includes('languages')) {
                console.log("⚠️  'languages' column missing in 'profiles'. Retrying with role only...");
                const { error: retryError } = await supabase
                    .from('profiles')
                    .update({ role: 'contributor' })
                    .eq('id', user.id);
                if (retryError) throw retryError;
            } else {
                throw error;
            }
        }

        console.log(`✅ User ${email} successfully upgraded to contributor.`);

    } catch (e) {
        console.error("❌ Fix failed:", e);
    }
}

const emailArg = process.argv[2] || 'ihuezeebuka5@gmail.com';
fixUser(emailArg);


import { config } from 'dotenv';
config({ path: '.env.local' });

async function resendLink(email: string) {
    const { supabaseAdmin } = await import('../lib/supabase');

    if (!email) {
        console.error("Please provide an email address.");
        return;
    }

    console.log(`📧 Resending fresh magic link to ${email}...`);

    const redirectBase = process.env.APP_URL || 'http://localhost:3000';
    const redirectTo = `${redirectBase}/auth/callback?next=/studio/library`;

    const { error: authError } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: redirectTo,
        },
    });

    if (authError) {
        console.error("❌ Auth error sending link:", authError.message);
    } else {
        console.log(`✨ Success! Fresh magic link sent to ${email}.`);
    }
}

const emailArg = process.argv[2];
resendLink(emailArg);

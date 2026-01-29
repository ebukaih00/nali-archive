
import { config } from 'dotenv';
config({ path: '.env.local' });

async function approveContributor(email: string) {
    const { supabaseAdmin } = await import('../lib/supabase');

    if (!email) {
        console.error("Please provide an email address.");
        return;
    }

    console.log(`🔍 Reviewing application for: ${email}`);

    // 1. Find the application
    const { data: application, error: fetchError } = await supabaseAdmin
        .from('contributor_applications')
        .select('*')
        .eq('email', email)
        .eq('status', 'pending_review')
        .single();

    if (fetchError || !application) {
        console.error("❌ Application not found or already processed.");
        return;
    }

    // 2. Update status to approved
    const { error: updateError } = await supabaseAdmin
        .from('contributor_applications')
        .update({ status: 'approved' })
        .eq('id', application.id);

    if (updateError) {
        console.error("❌ Error updating application status:", updateError.message);
        return;
    }

    console.log("✅ Application marked as APPROVED.");

    // 3. Send Magic Link / Invite
    console.log(`📧 Sending magic link to ${email}...`);

    // Determine redirect base based on APP_URL env var or fallback to localhost
    const redirectBase = process.env.APP_URL || 'http://localhost:3000';
    const redirectTo = `${redirectBase}/auth/callback?next=/studio/library`;

    // Note: Since this is server-side via admin client, we use admin.generateLink or similar 
    // but for simplicity and to match the existing magic link style, we can use signInWithOtp
    // However, for a true "First Time Admin Approval", we might want to ensure the user profile is created too.

    const { error: authError } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
            // Note: Use 'https://naliproject.org' for live users.
            // If testing locally on a specific port (e.g. 3001), update this accordingly.
            emailRedirectTo: redirectTo,
        },
    });

    if (authError) {
        console.error("❌ Auth error sending link:", authError.message);
    } else {
        console.log(`✨ Success! Magic link sent to ${email}.`);
        console.log("The user will now receive the 'Confirm Signup' or 'Magic Link' email.");
    }
}

// Get email from command line argument
const emailArg = process.argv[2];
approveContributor(emailArg);

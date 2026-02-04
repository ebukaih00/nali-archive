'use server';

import { createClient } from '@supabase/supabase-js';

// Create a service role client for administrative tasks
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function validateLoginEmail(email: string): Promise<{ allowed: boolean, message?: string }> {
    try {
        // 1. Check contributor_applications for 'approved' status
        const { data: application, error: appError } = await supabaseAdmin
            .from('contributor_applications')
            .select('status')
            .ilike('email', email)
            .eq('status', 'approved')
            .single();

        if (application) {
            return { allowed: true };
        }

        // 2. Check auth.users + profiles for existing admin/contributor role
        // This is for users who might have been added manually without an application
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (user) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile && (profile.role === 'admin' || profile.role === 'contributor')) {
                return { allowed: true };
            }
        }

        // If neither check passed, block the login
        return {
            allowed: false,
            message: "Unauthorized. Your email is not on our approved list. Please apply to become a contributor first."
        };

    } catch (error) {
        console.error("Error validating login email:", error);
        return { allowed: false, message: "An error occurred while validating your access. Please try again." };
    }
}

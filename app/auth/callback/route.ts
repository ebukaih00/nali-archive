import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/studio/library';

    // Determine the redirect origin based on the environment
    // Use origin as fallback but prioritize naliproject.org in production
    const isProduction = process.env.NODE_ENV === 'production' || request.headers.get('host')?.includes('naliproject.org');
    const redirectBase = isProduction ? 'https://naliproject.org' : origin;

    const supabase = await createClient();

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // 1. Fetch user profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, role, languages')
                    .eq('id', user.id)
                    .single();

                // 2. Fetch contributor application to sync profile if needed
                const { data: application } = await supabase
                    .from('contributor_applications')
                    .select('languages')
                    .eq('email', user.email)
                    .eq('status', 'approved')
                    .single();

                const languages = application?.languages || profile?.languages || null;

                if (!profile) {
                    await supabase
                        .from('profiles')
                        .insert({
                            id: user.id,
                            role: 'contributor',
                            languages: languages
                        });
                } else if (!profile.languages && languages) {
                    // Sync languages if profile exists but languages are missing
                    await supabase
                        .from('profiles')
                        .update({ languages: languages })
                        .eq('id', user.id);
                }

                // Allow admin/contributor access
                if (!profile || profile.role === 'contributor' || profile.role === 'admin') {
                    return NextResponse.redirect(new URL(next, redirectBase));
                } else {
                    return NextResponse.redirect(new URL('/unauthorized', redirectBase));
                }
            }
        } else {
            // Already have a session? 
            // This happens if the link was pre-fetched or clicked twice.
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                return NextResponse.redirect(new URL(next, redirectBase));
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(new URL('/auth/auth-code-error', redirectBase));
}

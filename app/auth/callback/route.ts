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

                // 2. Fetch approved contributor application
                const { data: application } = await supabase
                    .from('contributor_applications')
                    .select('languages')
                    .eq('email', user.email)
                    .eq('status', 'approved')
                    .single();

                const languages = application?.languages || profile?.languages || null;

                // 3. Access Decision Logic
                let allowAccess = false;

                if (profile) {
                    if (profile.role === 'admin' || profile.role === 'contributor') {
                        allowAccess = true;
                        // Sync languages if missing
                        if (!profile.languages && languages) {
                            await supabase.from('profiles').update({ languages }).eq('id', user.id);
                        }
                    } else if (profile.role === 'user' && application) {
                        // Upgrade un-approved user to contributor if they now have an approved application
                        await supabase.from('profiles').update({ role: 'contributor', languages }).eq('id', user.id);
                        allowAccess = true;
                    }
                } else if (application) {
                    // Create new contributor profile for first-time approved login
                    await supabase.from('profiles').insert({
                        id: user.id,
                        role: 'contributor',
                        languages: languages
                    });
                    allowAccess = true;
                }

                if (allowAccess) {
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

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/studio/library';

    // Determine the redirect origin based on the environment
    const isProduction = process.env.NODE_ENV === 'production' || request.headers.get('host')?.includes('naliproject.org');
    const redirectOrigin = isProduction ? 'https://naliproject.org' : origin;

    const supabase = await createClient();

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // 1. Check if profile exists, if not create it
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (!profile) {
                    await supabase
                        .from('profiles')
                        .insert({ id: user.id, role: 'contributor' });
                }

                // Allow admin/contributor access
                if (!profile || profile.role === 'contributor' || profile.role === 'admin') {
                    return NextResponse.redirect(`${redirectOrigin}${next}`);
                } else {
                    return NextResponse.redirect(`${redirectOrigin}/unauthorized`);
                }
            }
        } else {
            // If exchange failed, check if we ALREADY have a session.
            // This happens if the link was pre-fetched or clicked twice.
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                return NextResponse.redirect(`${redirectOrigin}${next}`);
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${redirectOrigin}/auth/auth-code-error`);
}

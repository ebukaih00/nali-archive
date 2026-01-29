import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/studio/library';

    // Determine the redirect origin based on the environment
    const isProduction = process.env.NODE_ENV === 'production' || request.headers.get('host')?.includes('naliproject.org');
    const redirectBase = isProduction ? 'https://naliproject.org' : origin;

    const supabase = await createClient();

    // 0. PKCE Defense: Check if already logged in (e.g. by a pre-fetcher)
    const { data: { user: existingUser } } = await supabase.auth.getUser();
    if (existingUser) {
        console.log(`✅ User ${existingUser.email} already has a session. Skipping exchange.`);
        return NextResponse.redirect(new URL(next, redirectBase));
    }

    if (code) {
        console.log(`📡 Exchanging code for session...`);
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.warn(`⚠️ Code exchange failed: ${error.message}. Checking for existing session...`);
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log(`✅ Session recovery successful via cookies.`);
            } else {
                console.error(`❌ Authentication failed: No session and code expired.`);
                return NextResponse.redirect(new URL('/auth/auth-code-error', redirectBase));
            }
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            console.log(`🔑 Auth verified for ${user.email}. Syncing profile...`);

            // Use ADMIN client to bypass RLS for role upgrades
            // 1. Fetch user profile
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('id, role, languages')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error("❌ Error fetching profile:", profileError);
            }

            // 2. Fetch approved contributor application (CASE-INSENSITIVE)
            const { data: application, error: appError } = await supabaseAdmin
                .from('contributor_applications')
                .select('languages')
                .ilike('email', user.email!)
                .eq('status', 'approved')
                .single();

            if (appError && appError.code !== 'PGRST116') {
                console.error("❌ Error fetching application:", appError);
            }

            const languages = application?.languages || profile?.languages || null;
            console.log(`📊 Profile role: ${profile?.role || 'null'}, App found: ${!!application}`);

            // 3. Access Decision Logic
            let allowAccess = false;

            if (profile) {
                if (profile.role === 'admin' || profile.role === 'contributor') {
                    allowAccess = true;
                    // Sync languages if missing (gracefully handle missing column)
                    if (!profile.languages && languages) {
                        try {
                            const { error: lError } = await supabaseAdmin.from('profiles').update({ languages }).eq('id', user.id);
                            if (lError && lError.message.includes('languages')) {
                                console.warn("⚠️ 'languages' column missing in profiles, skipping sync.");
                            }
                        } catch (e) { /* ignore */ }
                    }
                } else if (profile.role === 'user' && application) {
                    // UPGRADE: Un-approved user now has an approved application
                    console.log(`🚀 Upgrading user ${user.email} from 'user' to 'contributor' role.`);

                    const updates: any = { role: 'contributor' };
                    if (languages) {
                        try {
                            // Try initial update with languages
                            let { error: upgradeError } = await supabaseAdmin
                                .from('profiles')
                                .update({ role: 'contributor', languages })
                                .eq('id', user.id);

                            if (upgradeError && upgradeError.message.includes('languages')) {
                                console.warn("⚠️ Retrying upgrade without missing 'languages' column.");
                                const { error: retryError } = await supabaseAdmin
                                    .from('profiles')
                                    .update({ role: 'contributor' })
                                    .eq('id', user.id);
                                upgradeError = retryError;
                            }

                            if (upgradeError) console.error("❌ Upgrade failed:", upgradeError);
                            else {
                                console.log("✅ Role upgrade successful.");
                                allowAccess = true;
                            }
                        } catch (e) {
                            allowAccess = false;
                        }
                    } else {
                        const { error: upgradeError } = await supabaseAdmin
                            .from('profiles')
                            .update({ role: 'contributor' })
                            .eq('id', user.id);
                        if (!upgradeError) {
                            console.log("✅ Role upgrade successful (no languages).");
                            allowAccess = true;
                        }
                    }
                }
            } else if (application) {
                // INITIAL: Create new contributor profile
                console.log(`✨ Creating first-time contributor profile for ${user.email}.`);

                const insertPayload: any = {
                    id: user.id,
                    role: 'contributor'
                };
                if (languages) insertPayload.languages = languages;

                let { error: insertError } = await supabaseAdmin.from('profiles').insert(insertPayload);

                // Retry without languages if column missing
                if (insertError && insertError.message.includes('languages')) {
                    console.warn("⚠️ Retrying insert without missing 'languages' column.");
                    const { error: retryError } = await supabaseAdmin.from('profiles').insert({
                        id: user.id,
                        role: 'contributor'
                    });
                    insertError = retryError;
                }

                if (insertError) console.error("❌ Profile creation failed:", insertError);
                else {
                    console.log("✅ Contributor profile created.");
                    allowAccess = true;
                }
            }

            if (allowAccess) {
                console.log(`🏁 Access granted! Redirecting to ${next}`);
                return NextResponse.redirect(new URL(next, redirectBase));
            } else {
                console.warn(`🛑 Access denied for ${user.email}. No approved application found.`);
                return NextResponse.redirect(new URL('/unauthorized', redirectBase));
            }
        }
    } else {
        // No code, check if we already have a session (PKCE fallback)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            console.log("✅ Active session found without code. Redirecting...");
            return NextResponse.redirect(new URL(next, redirectBase));
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(new URL('/auth/auth-code-error', redirectBase));
}

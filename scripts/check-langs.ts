
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkLangs(email: string) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    console.log(`Checking profile/app for: ${email}`);

    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        console.log('Profile:', JSON.stringify(profile, null, 2));
    }

    const { data: app } = await supabase.from('contributor_applications').select('*').ilike('email', email).single();
    console.log('Application:', JSON.stringify(app, null, 2));
}

const email = 'ihuezeebuka@yahoo.com';
checkLangs(email);


import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyYahoo() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    console.log('Checking for ihuezeebuka@yahoo.com...');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const found = users.filter(u => u.email?.toLowerCase().includes('yahoo'));
    console.log('Found:', found.map(u => ({ id: u.id, email: u.email })));
}
verifyYahoo();

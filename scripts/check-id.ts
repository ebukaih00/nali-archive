
import { config } from 'dotenv';
config({ path: '.env.local' });

async function check() {
    const { supabaseAdmin } = await import('../lib/supabase');
    const { data } = await supabaseAdmin.from('names').select('*').eq('id', 16347).single();
    console.log(data);
}
check();

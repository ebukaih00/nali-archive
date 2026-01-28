
import { config } from 'dotenv';
config({ path: '.env.local' });

async function listColumns() {
    const { supabaseAdmin } = await import('../lib/supabase');
    const { data } = await supabaseAdmin.from('audio_submissions').select('*').limit(1);
    console.log('Columns:', Object.keys(data?.[0] || {}));
}
listColumns();

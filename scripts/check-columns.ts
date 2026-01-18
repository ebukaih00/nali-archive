
import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkColumns() {
    const { supabaseAdmin } = await import('../lib/supabase');
    const { data, error } = await supabaseAdmin.from('names').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('Table names is empty or could not fetch.');
    }
}

checkColumns();

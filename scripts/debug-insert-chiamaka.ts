
import { config } from 'dotenv';
config({ path: '.env.local' });

async function debugChiamaka() {
    const { supabaseAdmin } = await import('../lib/supabase');
    const name = 'Chiāmākā'; // With diacritics as from API

    console.log(`Checking if '${name}' exists for any origin...`);
    const { data: existing } = await supabaseAdmin.from('names').select('*').eq('name', name);
    console.log('Existing entries:', existing);

    console.log(`Attempting to insert '${name}' for origin 'Igbo'...`);
    const { data: inserted, error } = await supabaseAdmin.from('names').insert({
        name: name,
        origin: 'Igbo',
        meaning: 'God is awesome',
        verification_status: 'verified'
    }).select();

    if (error) {
        console.error('Insert Error:', error.message);
    } else {
        console.log('Insert Success:', inserted);
    }
}
debugChiamaka();

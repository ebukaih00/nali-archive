import { config } from 'dotenv';
config({ path: '.env.local' });
import { supabaseAdmin } from '../lib/supabase';

async function addName() {
    console.log('Adding Toluwani...');
    const { data, error } = await supabaseAdmin
        .from('names')
        .insert([
            {
                name: 'Toluwani',
                origin_country: 'Nigeria',
                language: 'Yoruba',
                phonetic_hint: 'TO-LU-WA-NI',
                meaning: 'I belong to God' // Inferred meaning
            }
        ])
        .select();

    if (error) {
        console.error('Error adding name:', error);
    } else {
        console.log('Successfully added:', data);
    }
}

addName();

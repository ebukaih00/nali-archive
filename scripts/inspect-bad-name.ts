
import { config } from 'dotenv';
config({ path: '.env.local' });
import { supabase } from '../lib/supabaseClient';

async function inspectBadName() {
    const badName = 'Echualabi';
    console.log(`Searching for "${badName}"...`);

    const { data, error } = await supabase
        .from('names')
        .select('*')
        .ilike('name', badName);

    if (error) {
        console.error(error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Found Entry:', data[0]);
        // Maybe check surrounding IDs?
        const id = data[0].id;

        console.log('Checking neighbors...');
        const { data: neighbors } = await supabase
            .from('names')
            .select('*')
            .gt('id', id - 5)
            .lt('id', id + 5);

        console.table(neighbors);
    } else {
        console.log('Name not found in DB.');
    }
}

inspectBadName();

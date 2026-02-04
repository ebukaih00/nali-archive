
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabase';

async function checkStorage() {
    const id = "17592";
    console.log(`Checking storage for ID: ${id}`);

    const { data, error } = await supabaseAdmin.storage
        .from('name-audio')
        .list('', {
            search: id
        });

    if (error) {
        console.error('Error listing storage:', error);
    } else {
        console.log('Matching files in name-audio:', JSON.stringify(data, null, 2));
    }

    // Also check vetting_samples just in case
    const { data: data2, error: error2 } = await supabaseAdmin.storage
        .from('vetting_samples')
        .list('', {
            search: id
        });

    if (error2) {
        console.error('Error listing vetting_samples:', error2);
    } else {
        console.log('Matching files in vetting_samples:', JSON.stringify(data2, null, 2));
    }
}

checkStorage();

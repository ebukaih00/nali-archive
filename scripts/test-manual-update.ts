
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testUpdate() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

    const id = "17592";
    const testUrl = "https://example.com/test_human.webm";

    console.log(`Testing update for ID: ${id}`);
    const { data, error } = await supabase
        .from('names')
        .update({
            status: 'verified',
            verification_status: 'verified',
            audio_url: testUrl,
            verified_audio_url: testUrl
        })
        .eq('id', id)
        .select();

    if (error) {
        console.error('Update Failed:', error);
    } else {
        console.log('Update Success:', JSON.stringify(data, null, 2));
    }
}

testUpdate();

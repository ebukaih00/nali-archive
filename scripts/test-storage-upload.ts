
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testUpload() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

    const dummyId = "test_upload_" + Date.now();
    const buffer = Buffer.from("dummy audio content");

    console.log(`Testing upload for ${dummyId}...`);
    const { data, error } = await supabase.storage
        .from('name-audio')
        .upload(`${dummyId}.webm`, buffer, { contentType: 'audio/webm' });

    if (error) {
        console.error('Upload Failed:', error);
    } else {
        console.log('Upload Success:', JSON.stringify(data, null, 2));

        // Cleanup
        await supabase.storage.from('name-audio').remove([`${dummyId}.webm`]);
    }
}

testUpload();

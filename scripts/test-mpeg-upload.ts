
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testUploadMpeg() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

    const dummyId = "test_mpeg_" + Date.now();
    const buffer = Buffer.from("dummy content");

    console.log(`Testing upload as audio/mpeg for ${dummyId}...`);
    const { data, error } = await supabase.storage
        .from('name-audio')
        .upload(`${dummyId}.mp3`, buffer, { contentType: 'audio/mpeg' });

    if (error) {
        console.error('Upload Failed:', error);
    } else {
        console.log('Upload Success:', JSON.stringify(data, null, 2));
        await supabase.storage.from('name-audio').remove([`${dummyId}.mp3`]);
    }
}

testUploadMpeg();

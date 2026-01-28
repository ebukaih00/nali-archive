import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load Environment Variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`URL: ${supabaseUrl ? 'Found' : 'Missing'}`);
console.log(`Key: ${supabaseServiceRoleKey ? 'Found' : 'Missing'}`);

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing credentials. Please check .env.local");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function setupBuckets() {
    console.log("Checking storage buckets...");
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
        console.error("Error listing buckets:", error);
        // If we can't list, we probably can't create, or auth is wrong.
        return;
    }

    const requiredBuckets = [
        { name: 'vetting_samples', public: true },
        { name: 'pronunciations', public: true }
    ];

    for (const req of requiredBuckets) {
        const exists = buckets?.some(b => b.name === req.name);
        if (exists) {
            console.log(`✅ Bucket '${req.name}' already exists.`);
        } else {
            console.log(`Creating bucket '${req.name}'...`);
            const { data, error: createError } = await supabaseAdmin.storage.createBucket(req.name, {
                public: req.public,
                fileSizeLimit: 10485760, // 10MB
                allowedMimeTypes: ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/ogg']
            });

            if (createError) {
                console.error(`❌ Failed to create bucket '${req.name}':`, createError);
            } else {
                console.log(`✅ Bucket '${req.name}' created successfully!`);
            }
        }
    }
}

setupBuckets();

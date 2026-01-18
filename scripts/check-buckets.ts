import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load Environment Variables from .env.local
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                process.env[key] = value;
            }
        });
    }
} catch (e) {
    console.error("Error loading .env.local", e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing credentials. Please check .env.local");
    process.exit(1);
}

console.log("Using credentials from env");

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkAndCreateBucket() {
    console.log("Checking storage buckets...");
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
        console.error("Error listing buckets:", error);
        return;
    }

    const bucketName = 'name-audio';
    const exists = buckets?.some(b => b.name === bucketName);

    if (exists) {
        console.log(`\nSUCCESS: '${bucketName}' bucket alread exists.`);
    } else {
        console.log(`\n'${bucketName}' bucket NOT found. Creating it...`);
        const { data, error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['audio/mpeg', 'audio/mp3']
        });

        if (createError) {
            console.error("Failed to create bucket:", createError);
        } else {
            console.log(`\nSUCCESS: '${bucketName}' bucket created successfully!`);
        }
    }
}

checkAndCreateBucket();

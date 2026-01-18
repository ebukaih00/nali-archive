import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Load Environment Variables
const loadEnv = (filename: string) => {
    try {
        const envPath = path.resolve(process.cwd(), filename);
        if (fs.existsSync(envPath)) {
            console.log(`Loading ${filename}...`);
            const envFile = fs.readFileSync(envPath, 'utf8');
            envFile.split(/\r?\n/).forEach(line => {
                const firstEquals = line.indexOf('=');
                if (firstEquals > 0) {
                    const key = line.slice(0, firstEquals).trim();
                    const value = line.slice(firstEquals + 1).trim().replace(/^["']|["']$/g, '');
                    if (key && !key.startsWith('#')) {
                        process.env[key] = value;
                        // console.log(`Loaded ${key}`);
                    }
                }
            });
        }
    } catch (e) {
        console.error(`Error loading ${filename}`, e);
    }
};

loadEnv('.env');
loadEnv('.env.local');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing credentials.");
    console.log("URL Present:", !!supabaseUrl);
    console.log("Anon Key Present:", !!supabaseAnonKey);
    process.exit(1);
}

// 2. Client with ANON key (represents a regular/hacker user)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function verifySecurity() {
    console.log("🔒 Auditing 'name-audio' bucket security...");

    // Test 1: Attempt Unauthorized Upload
    // We use audio/mpeg because the bucket restricts mime types.
    // If this succeeds, it means the bucket is PUBLICLY WRITABLE (Bad).
    const fileName = `security-test-${Date.now()}.mp3`;
    const { data, error } = await supabaseAnon
        .storage
        .from('name-audio')
        .upload(fileName, 'fake audio content', {
            contentType: 'audio/mpeg',
        });

    if (error) {
        console.log("\n✅ Security Check Passed: Unauthorized upload failed.");
        console.log(`   Reason: ${error.message}`);
    } else {
        console.error("\n❌ Security Check FAILED: Unauthorized upload succeeded!");
        console.error("   Warning: Your bucket allows public writes. This is dangerous.");

        // Clean up the file if it worked
        await supabaseAnon.storage.from('name-audio').remove([fileName]);
    }
}

verifySecurity();

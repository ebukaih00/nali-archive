import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Load Environment Variables
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
} catch (e) {
    console.error("Error loading .env.local", e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials. Please check .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log("Inspecting 'feedback' table...");

    // We can't directly query schema heavily with JS client easily without SQL function, 
    // but we can try inserting a row with null name_id and see if it fails.

    try {
        console.log("Attempting to insert General Feedback (name_id: null)...");
        const { data, error } = await supabase
            .from('feedback')
            .insert({
                category: 'Verification',
                comment: 'This is a test to confirm General Feedback storage is working.',
                name_id: null
            })
            .select();

        if (error) {
            console.error("FAILED to store general feedback:", error);
        } else {
            console.log("\nSUCCESS: General Feedback stored successfully!");
            console.log("Record ID:", data[0]?.id);
            console.log("Stored Data:", data[0]);

            // Clean up
            if (data[0]?.id) {
                await supabase.from('feedback').delete().eq('id', data[0].id);
                console.log("Test record cleaned up.");
            }
        }
    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

inspectSchema();


import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load Environment Variables
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function listColumns() {
    console.log("Listing columns for 'feedback' table...");

    // We can use a trick to see columns by selecting 1 row and looking at keys
    const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching feedback row:", error.message);
    } else if (data && data.length > 0) {
        console.log("Columns found in existing row:", Object.keys(data[0]));
    } else {
        // If table is empty, we try to insert and see what happens or if we can get metadata
        console.log("Table is empty. Trying to find columns via empty select...");
        const { data: emptyData, error: emptyError } = await supabase
            .from('feedback')
            .select('*')
            .limit(0);

        if (emptyError) {
            console.error("Error:", emptyError.message);
        } else {
            // In some versions of postgrest/supabase-js, empty select might not return column names easily
            console.log("Empty select didn't reveal columns headers directly in JS client.");
        }
    }
}

listColumns();

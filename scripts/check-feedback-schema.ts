
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

async function checkSchema() {
    console.log("Checking columns of 'feedback' table...");
    const { data, error } = await supabase.rpc('inspect_table', { table_name: 'feedback' });

    if (error) {
        console.log("RPC inspect_table failed (expected if not defined). Trying alternative...");
        const { data: cols, error: colError } = await supabase.from('feedback').select('*').limit(1);
        if (colError) {
            console.error("Error:", colError.message);
        } else {
            console.log("Existing columns:", data && data.length > 0 ? Object.keys(data[0]) : "No rows found");
        }
    } else {
        console.log("Table structure:", data);
    }
}

checkSchema();

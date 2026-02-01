
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

async function checkNamesSchema() {
    console.log("Checking columns of 'names' table...");
    const { data, error } = await supabase.from('names').select('*').limit(1);

    if (error) {
        console.error("Error fetching names row:", error.message);
    } else if (data && data.length > 0) {
        console.log("Columns found in existing row:", Object.keys(data[0]));
        console.log("Example row status:", data[0].status);
        console.log("Example row verification_status:", data[0].verification_status);
    } else {
        console.log("Table 'names' is empty.");
    }
}

checkNamesSchema();

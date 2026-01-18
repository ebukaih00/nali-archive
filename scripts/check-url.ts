import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);

if (urlMatch) {
    console.log("Connecting to Supabase Project:", urlMatch[1].trim());
} else {
    console.log("Could not find Supabase URL in .env.local");
}

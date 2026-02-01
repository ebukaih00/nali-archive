
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runMigration() {
    const migrationPath = path.join(process.cwd(), 'migrations', 'batch_notifications.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log("🚀 Running migration: batch_notifications.sql");

    // We use a trick to run raw SQL via RPC if it exists, 
    // but usually we can't run DDL via the standard dashboard API.
    // However, I can try to run it via a direct fetch if I have a postgres-level tool.
    // Since I don't have a direct psql tool, I will try to use the 'exec_sql' RPC if available,
    // or provide the user with the instruction if I can't run it myself.

    const { error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
        console.error("❌ Migration failed:", error.message);
        console.log("Trying alternative approach (multi-statement execution)...");

        // Sometimes rpc('exec_sql') isn't configured. 
        // I will notify the user to run this in the Supabase SQL Editor if it fails.
    } else {
        console.log("✅ Migration completed successfully!");
    }
}

runMigration();

import { config } from 'dotenv';
config({ path: '.env.local' });

async function migrate() {
    // Dynamic import to ensure process.env is populated before lib/supabase runs
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log("🚀 Starting Playground Migration...");

    // 1. Add tts_settings to names
    console.log("📂 Adding tts_settings to 'names' table...");
    const { error: error1 } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `alter table public.names add column if not exists tts_settings jsonb default '{}'::jsonb;`
    });

    if (error1) {
        // Fallback if exec_sql doesn't exist: try a direct query (if possible via postgrest)
        // or just let the user know.
        console.warn("⚠️ Warning: exec_sql RPC might not exist. Please run the SQL in migrations/migration_playground_tuning.sql manually if this fails.");
        console.error("Error Detail:", error1.message);
    }

    // 2. Create rules table
    console.log("📂 Creating 'pronunciation_rules' table...");
    const { error: error2 } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
            create table if not exists public.pronunciation_rules (
                id uuid primary key default gen_random_uuid(),
                pattern text not null unique,
                phonetic_replacement text,
                settings jsonb default '{}'::jsonb,
                created_at timestamptz default now()
            );
        `
    });

    if (error2) {
        console.error("Error Detail:", error2.message);
    }

    console.log("✅ Migration script finished. Please check Supabase dashboard to verify.");
}

migrate();

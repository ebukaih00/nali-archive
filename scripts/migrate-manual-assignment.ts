
import { config } from 'dotenv';
config({ path: '.env.local' });

async function migrate() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log("🚀 Starting Manual Assignment Migration...");

    const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
            -- Add assignment and ignore tracking to names table
            ALTER TABLE public.names 
            ADD COLUMN IF NOT EXISTS assigned_to TEXT, -- Stores contributor email
            ADD COLUMN IF NOT EXISTS ignored BOOLEAN DEFAULT false; -- Stores skip status

            -- Add index for contributor lookup
            CREATE INDEX IF NOT EXISTS idx_names_assigned_to ON public.names(assigned_to);
            CREATE INDEX IF NOT EXISTS idx_names_ignored ON public.names(ignored);
        `
    });

    if (error) {
        console.error("❌ Migration FAILED:", error.message);
    } else {
        console.log("✅ Migration SUCCESSFUL!");
    }
}

migrate();

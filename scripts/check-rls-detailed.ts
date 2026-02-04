
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkRLS() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Use a query to check RLS status on the names table
    const { data, error } = await supabase.rpc('get_rls_status_for_table', { t_name: 'names' });

    // If rpc doesn't exist, we'll try to query pg_class
    if (error) {
        const { data: pgClass, error: pgError } = await supabase
            .from('pg_class' as any)
            .select('relrowsecurity')
            .eq('relname', 'names')
            .single();

        if (pgClass) {
            console.log('RLS Enabled on "names":', (pgClass as any).relrowsecurity);
        } else {
            console.log('Could not determine RLS status.');
        }
    } else {
        console.log('RLS Status:', data);
    }

    // Check policies
    const { data: policies } = await supabase
        .from('pg_policies' as any)
        .select('*')
        .eq('tablename', 'names');

    console.log('Policies for "names":');
    console.table(policies);
}

checkRLS();

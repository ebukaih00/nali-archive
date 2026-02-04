
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function assign() {
    const namePattern = "Eze_Debug_%"; // Match the timestamped name
    const assignee = "dev@nali.org";

    console.log(`Assigning names matching '${namePattern}' to ${assignee}...`);

    const { data, error } = await supabase
        .from('names')
        .update({ assigned_to: assignee })
        .ilike('name', namePattern)
        .select();

    if (error) {
        console.error('Error assigning name:', error);
    } else {
        console.log(`Successfully assigned ${data.length} name(s) to ${assignee}:`, data.map(d => d.name));
    }
}

assign();

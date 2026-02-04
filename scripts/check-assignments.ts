
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkAssignments(emails: string[]) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    for (const email of emails) {
        console.log(`\nChecking assignments for: ${email}`);
        const { data, count, error } = await supabase
            .from('names')
            .select('id, name, assigned_to, status, origin', { count: 'exact' })
            .ilike('assigned_to', `%${email}%`);

        if (error) {
            console.error('Error:', error);
            continue;
        }

        console.log(`Found ${count} assignments total.`);
        if (data && data.length > 0) {
            console.table(data.slice(0, 5));
        }
    }
}

const emails = ['ihuezeebuka@yahoo.com', 'ihuezeebuka5@gmail.com'];
checkAssignments(emails);

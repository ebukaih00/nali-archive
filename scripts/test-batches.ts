
import { getPendingBatches } from './app/studio/actions';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Mock getAuth to return the specific user
const mockEmail = 'ihuezeebuka@yahoo.com';

async function testGetPendingBatches() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Get user profile/auth
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email?.toLowerCase() === mockEmail.toLowerCase());

    if (!user) {
        console.error('User not found');
        return;
    }

    // We need to bypass the actual getAuth in the script somehow or just manually run the query logic
    console.log(`Manual query check for: ${mockEmail}`);

    const { data: assignedItems, error } = await supabase
        .from('names')
        .select('id, origin, status')
        .ilike('assigned_to', mockEmail)
        .or('status.eq.pending,status.eq.unverified')
        .eq('ignored', false);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${assignedItems?.length || 0} assigned items for the queue.`);
        console.log('Items:', JSON.stringify(assignedItems, null, 2));
    }
}

testGetPendingBatches();

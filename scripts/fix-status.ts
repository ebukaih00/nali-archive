
import { config } from 'dotenv';
config({ path: '.env.local' });

async function fixStatus() {
    const { supabaseAdmin } = await import('../lib/supabase');
    console.log('Fixing name statuses...');

    const { error } = await supabaseAdmin
        .from('names')
        .update({ status: 'verified' })
        .eq('status', 'pending')
        .eq('is_community_contributed', false);

    if (error) {
        console.error('Error updating names:', error);
    } else {
        console.log('Successfully updated pending names to verified.');
    }
}

fixStatus();

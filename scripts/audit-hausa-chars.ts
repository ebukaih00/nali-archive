
import { config } from 'dotenv';
config({ path: '.env.local' });

async function findHausaIssues() {
    const { supabaseAdmin } = await import('../lib/supabase');

    const { data: names, error } = await supabaseAdmin
        .from('names')
        .select('id, name')
        .eq('origin', 'Hausa');

    if (error) {
        console.error('Error fetching Hausa names:', error);
        return;
    }

    // Common indicators of corrupted special characters in Hausa (hooked letters b, d, k, y)
    // Or names that look like they have artifacts.
    const issues = names?.filter(n => /[?\[\]{}()!@#$%\^&*]/.test(n.name) || /^[a-z]/.test(n.name));

    console.log(`Found ${issues?.length} Hausa names with potential issues out of ${names?.length}.`);
    if (issues && issues.length > 0) {
        console.log("Sample of issues:");
        issues.slice(0, 20).forEach(n => console.log(`- [${n.id}] ${n.name}`));
    }
}

findHausaIssues();

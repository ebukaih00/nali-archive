import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function simulateFetchLoop() {
    console.log('--- Simulating Component Fetch Loop ---');
    let allData: any[] = [];
    let from = 0;
    const step = 999;
    let more = true;
    let loops = 0;

    try {
        while (more) {
            loops++;
            console.log(`Loop ${loops}: Fetching range ${from} - ${from + step}`);

            const { data, error } = await supabase
                .from('names')
                .select('name')
                .order('name', { ascending: true })
                .range(from, from + step);

            if (error) throw error;

            if (data && data.length > 0) {
                console.log(`   -> Received ${data.length} rows.`);
                allData = [...allData, ...data];
                from += (step + 1);

                if (data.length <= step) {
                    console.log(`   -> data.length (${data.length}) <= step (${step}). Stopping.`);
                    // STRICT CHECK:
                    // If we asked for 1000 items (0-999), and got 1000, we might still have more.
                    // Usually standard pagination is: if received < requested_limit, then done.
                    // Here we requested (step + 1) items (since range is inclusive).
                    // Range 0 to 999 is 1000 items. 
                    // step is 999. 
                    // request size = 1000.
                    // if data.length < 1000, then stop.
                    if (data.length < (step + 1)) more = false;
                }
            } else {
                console.log('   -> Received 0 rows. Stopping.');
                more = false;
            }
        }
    } catch (err) {
        console.error('Error in loop:', err);
    }

    console.log(`\nTotal Loaded: ${allData.length}`);
}

simulateFetchLoop();

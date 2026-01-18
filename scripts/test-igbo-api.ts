
import { config } from 'dotenv';
config({ path: '.env.local' });

const IGBO_API_URL = 'https://igboapi.com/api/v1';

async function testIgboApi() {
    console.log('--- Testing Igbo API ---');
    // Need an API key ideally, but let's try public access or see if we can get a key.
    // Their docs say "Get an API Key". I don't have one.
    // Assuming strict authenticated access, this might fail.
    // Let's try to search for "Amaka" or a common name.

    // NOTE: Without a key, we might be rate limited or blocked.
    // Let's assume we need to just ping it.

    try {
        const keyword = 'Amaka';
        const response = await fetch(`${IGBO_API_URL}/words?keyword=${keyword}`, {
            headers: {
                'X-API-Key': process.env.IGBO_API_KEY || ''
            }
        });

        if (response.status === 401 || response.status === 403) {
            console.error('❌ Authentication required. Please get an API key from igboapi.com.');
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Response for "${keyword}":`);
        console.dir(data, { depth: null });

    } catch (error) {
        console.error('❌ Error calling Igbo API:', error);
    }
}

testIgboApi();

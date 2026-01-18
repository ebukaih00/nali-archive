import { config } from 'dotenv';
config({ path: '.env.local' });
import { ElevenLabsClient } from "elevenlabs";

async function listVoices() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const client = new ElevenLabsClient({ apiKey });

    try {
        const response = await client.voices.getAll();
        console.log("Available Voices:");
        response.voices.forEach(v => {
            console.log(`- ${v.name} (ID: ${v.voice_id}) [Category: ${v.category}]`);
        });
    } catch (error) {
        console.error("Error listing voices:", error);
    }
}

listVoices();

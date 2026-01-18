import { config } from 'dotenv';
config({ path: '.env.local' });
import { ElevenLabsClient } from "elevenlabs";

async function testElevenLabs() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.error("❌ ELEVENLABS_API_KEY is missing");
        return;
    }

    const client = new ElevenLabsClient({ apiKey });
    const voiceId = "gsyHQ9kWCDIipR26RqQ1";

    console.log("Found API Key. Starting tests...");

    // TEST 1: Default Voice
    try {
        process.stdout.write("Test 1: Default Voice (Control)... ");
        await client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
            text: "Control check.",
            model_id: "eleven_multilingual_v2",
        });
        console.log("✅ Success");
    } catch (e: any) {
        console.log("❌ Failed", e?.statusCode);
    }

    // TEST 2: Custom Voice (No Settings)
    try {
        process.stdout.write(`Test 2: Custom Voice (${voiceId}) No Settings... `);
        await client.textToSpeech.convert(voiceId, {
            text: "Voice check.",
            model_id: "eleven_multilingual_v2",
        });
        console.log("✅ Success");
    } catch (e: any) {
        console.log("❌ Failed", e?.statusCode);
    }

    // TEST 3: Custom Voice (With Settings)
    try {
        process.stdout.write("Test 3: Custom Voice With Settings... ");
        await client.textToSpeech.convert(voiceId, {
            text: "Settings check.",
            model_id: "eleven_multilingual_v2",
            voice_settings: {
                stability: 0.4,
                similarity_boost: 0.8,
            },
        });
        console.log("✅ Success");
    } catch (e: any) {
        console.log("❌ Failed", e?.statusCode, e?.body);
    }
}

testElevenLabs();

import { ElevenLabsClient } from "elevenlabs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const { text, voice_id, name_id, stability: stabilityOverride, speed: speedOverride, bypass_cache } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // 1. Check Cache (Storage First Strategy) - Skip if bypass_cache is true
        if (name_id && !bypass_cache) {
            // Check DB first for speed
            const { data: nameData } = await supabaseAdmin
                .from('names')
                .select('audio_url')
                .eq('id', name_id)
                .maybeSingle();

            if (nameData?.audio_url) {
                console.log(`Serving cached audio from DB for name_id: ${name_id}`);
                const cachedRes = await fetch(nameData.audio_url);
                if (cachedRes.ok) {
                    const arrayBuffer = await cachedRes.arrayBuffer();
                    return new NextResponse(Buffer.from(arrayBuffer), {
                        headers: { "Content-Type": "audio/mpeg" },
                    });
                }
            }

            // Fallback: Check Storage directly (in case DB is missing URL but file exists)
            const fileName = `${name_id}.mp3`;
            const { data: { publicUrl } } = supabaseAdmin
                .storage
                .from('name-audio')
                .getPublicUrl(fileName);

            const storageRes = await fetch(publicUrl, { method: 'HEAD' });
            if (storageRes.ok) {
                console.log(`Serving cached audio from Storage for name_id: ${name_id}`);
                const fileRes = await fetch(publicUrl);
                const arrayBuffer = await fileRes.arrayBuffer();

                // Update DB to sync
                await supabaseAdmin
                    .from('names')
                    .update({ audio_url: publicUrl })
                    .eq('id', name_id);

                return new NextResponse(Buffer.from(arrayBuffer), {
                    headers: { "Content-Type": "audio/mpeg" },
                });
            }
        }

        // 2. Fetch phonetic override if available
        let textToSpeak = text;
        if (name_id) {
            const { data: nameData } = await supabaseAdmin
                .from('names')
                .select('phonetic_hint')
                .eq('id', name_id)
                .maybeSingle();

            if (nameData?.phonetic_hint) {
                // Strip hyphens for "Flow State" to avoid micro-pauses
                textToSpeak = nameData.phonetic_hint.replace(/-/g, ' ');
                console.log(`Using phonetic_hint override for name_id ${name_id} (cleaned): ${textToSpeak}`);
            }
        }

        // 3. Generate Audio with fine-tuned settings
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });
        }

        const client = new ElevenLabsClient({ apiKey });

        // Use overrides if provided, else defaults
        const stability = typeof stabilityOverride === 'number' ? stabilityOverride : 0.8;
        const speed = typeof speedOverride === 'number' ? speedOverride : 0.9;

        // Apply 200ms pause and 0.9 speed for better flow
        const audioStream = await client.textToSpeech.convert(voice_id || "it5NMxoQQ2INIh4XcO44", {
            text: `<break time="200ms"/>${textToSpeak}`,
            model_id: "eleven_multilingual_v2",
            output_format: "mp3_44100_128",
            voice_settings: {
                stability,
                similarity_boost: 0.95,
                style: 0.0,
                use_speaker_boost: true,
                speed
            },
        });

        const chunks: Buffer[] = [];
        for await (const chunk of audioStream) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);

        // 3. Cache Audio (if name_id is provided and not in playground/bypass mode)
        if (name_id && !bypass_cache) {
            const fileName = `${name_id}.mp3`;
            const { data: uploadData, error: uploadError } = await supabaseAdmin
                .storage
                .from('name-audio')
                .upload(fileName, audioBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true
                });

            if (!uploadError && uploadData) {
                const { data: { publicUrl } } = supabaseAdmin
                    .storage
                    .from('name-audio')
                    .getPublicUrl(fileName);

                if (publicUrl) {
                    await supabaseAdmin
                        .from('names')
                        .update({ audio_url: publicUrl })
                        .eq('id', name_id);
                    console.log(`Cached audio for name_id: ${name_id}`);
                }
            } else {
                console.error("Failed to upload audio to cache:", uploadError);
            }
        }

        return new NextResponse(audioBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
            },
        });

    } catch (error: any) {
        console.error("Error generating speech:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

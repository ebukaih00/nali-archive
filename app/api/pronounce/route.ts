import { ElevenLabsClient } from "elevenlabs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const { text, voice_id, name_id } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // 1. Check Cache (Storage First Strategy)
        if (name_id) {
            // Check DB first for speed
            const { data: nameData } = await supabaseAdmin
                .from('names')
                .select('audio_url')
                .eq('id', name_id)
                .single();

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

        // 2. Generate Audio
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });
        }

        const client = new ElevenLabsClient({ apiKey });

        const audioStream = await client.textToSpeech.convert(voice_id || "zwbf3iHXH6YGoTCPStfx", {
            text,
            model_id: "eleven_multilingual_v2",
            output_format: "mp3_44100_128",
            voice_settings: {
                stability: 0.9,
                similarity_boost: 0.9,
                style: 0.0,
                use_speaker_boost: true
            },
        });

        const chunks: Buffer[] = [];
        for await (const chunk of audioStream) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);

        // 3. Cache Audio (if name_id is provided)
        if (name_id) {
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

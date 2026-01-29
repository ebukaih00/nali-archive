import { ElevenLabsClient } from "elevenlabs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const { text, voice_id, name_id, stability: stabilityOverride, speed: speedOverride, bypass_cache } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // 1. Check Cache (Database First Strategy) - Skip if bypass_cache is true
        // 1. Check for Human Verified Audio First (Priority 1)
        if (name_id && !bypass_cache) {
            const { data: nameData } = await supabaseAdmin
                .from('names')
                .select('audio_url, verified_audio_url')
                .eq('id', name_id)
                .maybeSingle();

            // HUMAN AUDIO takes precedence
            const priorityAudio = nameData?.verified_audio_url || nameData?.audio_url;

            if (priorityAudio && priorityAudio.startsWith('http')) {
                try {
                    console.log(`Serving cached/verified audio for name_id: ${name_id}`);
                    const cachedRes = await fetch(priorityAudio);
                    if (cachedRes.ok) {
                        const arrayBuffer = await cachedRes.arrayBuffer();
                        const contentType = priorityAudio.endsWith('.webm') ? 'audio/webm' : 'audio/mpeg';
                        return new NextResponse(Buffer.from(arrayBuffer), {
                            headers: { "Content-Type": contentType },
                        });
                    }
                } catch (fetchErr) {
                    console.error("Cache fetch failed, falling back to AI:", fetchErr);
                    // Fall through to AI generation
                }
            }
        }

        // 2. Fetch phonetic overrides and settings
        let textToSpeak = text;
        let finalVoiceId = voice_id || "it5NMxoQQ2INIh4XcO44"; // Fisayo Global Default
        let finalStability = stabilityOverride;
        let finalSpeed = speedOverride;

        // A. Apply GLOBAL RULES First (Prefixes/Suffixes)
        const { data: rules } = await supabaseAdmin
            .from('pronunciation_rules')
            .select('*')
            .order('created_at', { ascending: false });

        if (rules && rules.length > 0) {
            for (const rule of rules) {
                const [type, pattern] = rule.pattern.split(':');
                const lowerText = text.toLowerCase();
                let match = false;

                if (type === 'prefix' && lowerText.startsWith(pattern)) match = true;
                else if (type === 'suffix' && lowerText.endsWith(pattern)) match = true;
                else if (type === 'equals' && lowerText === pattern) match = true;

                if (match) {
                    console.log(`🎯 Applying global rule [${rule.pattern}] to "${text}"`);
                    if (rule.phonetic_replacement) {
                        textToSpeak = rule.phonetic_replacement.replace(/-/g, ' ');
                    }
                    if (finalStability === undefined) finalStability = rule.settings?.stability;
                    if (finalSpeed === undefined) finalSpeed = rule.settings?.speed;
                    if (!voice_id) finalVoiceId = rule.settings?.voice_id || finalVoiceId;
                    break; // Use the most recent matching rule
                }
            }
        }

        // B. Apply NAME-SPECIFIC Overrides (Highest Priority)
        if (name_id) {
            const { data: nameData } = await supabaseAdmin
                .from('names')
                .select('phonetic_hint, tts_settings')
                .eq('id', name_id)
                .maybeSingle();

            if (nameData) {
                if (nameData.phonetic_hint) {
                    textToSpeak = nameData.phonetic_hint.replace(/-/g, ' ');
                    console.log(`🔠 Using name-specific phonetic override: ${textToSpeak}`);
                }

                const s = nameData.tts_settings || {};
                if (finalStability === undefined) finalStability = s.stability;
                if (finalSpeed === undefined) finalSpeed = s.speed;
                if (!voice_id) finalVoiceId = s.voice_id || finalVoiceId;
            }
        }

        // 3. Generate Audio with fine-tuned settings
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });
        }

        const client = new ElevenLabsClient({ apiKey });

        // Use defaults if still undefined
        const stability = typeof finalStability === 'number' ? finalStability : 0.8;

        // Apply a longer initial pause (500ms) to allow for clear delivery
        const audioStream = await client.textToSpeech.convert(finalVoiceId, {
            text: `<break time="500ms"/>${textToSpeak}.`,
            model_id: "eleven_multilingual_v2",
            output_format: "mp3_44100_128",
            voice_settings: {
                stability,
                similarity_boost: 0.95,
                style: 0.0,
                use_speaker_boost: true
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

import { ElevenLabsClient } from "elevenlabs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

async function handlePronounce(params: {
    text?: string,
    voice_id?: string,
    name_id?: string,
    stability?: number,
    speed?: number,
    bypass_cache?: boolean
}) {
    const { text, voice_id, name_id, stability: stabilityOverride, speed: speedOverride, bypass_cache } = params;

    // 1. Check Cache (Database First Strategy) - Skip if bypass_cache is true
    if (name_id && !bypass_cache) {
        // Check DB first for speed
        const { data: nameData } = await supabaseAdmin
            .from('names')
            .select('audio_url, name, verification_status')
            .eq('id', name_id)
            .maybeSingle();

        if (nameData?.audio_url) {
            try {
                // Determine content type based on URL extension BEFORE fetching
                const urlWithoutParams = nameData.audio_url.split('?')[0].toLowerCase();
                const contentType = urlWithoutParams.endsWith('.webm')
                    ? 'audio/webm'
                    : (urlWithoutParams.endsWith('.m4a') || urlWithoutParams.endsWith('.mp4'))
                        ? 'audio/mp4'
                        : 'audio/mpeg';

                console.log(`[Pronounce] Attempting to fetch DB cache for ${nameData.name} from: ${nameData.audio_url}`);
                const cachedRes = await fetch(nameData.audio_url);

                if (cachedRes.ok) {
                    console.log(`[Pronounce] Serving cached audio for ${nameData.name} (Status: ${cachedRes.status}, Type: ${contentType}, URL: ${nameData.audio_url})`);
                    const arrayBuffer = await cachedRes.arrayBuffer();

                    return new NextResponse(Buffer.from(arrayBuffer), {
                        headers: {
                            "Content-Type": contentType,
                            "Cache-Control": "no-cache, no-store, must-revalidate"
                        },
                    });
                } else {
                    console.warn(`[Pronounce] Cache fetch failed for ${nameData.name}: ${cachedRes.status} ${cachedRes.statusText}`);
                }
            } catch (err) {
                console.error(`[Pronounce] Error fetching cached audio for ${nameData.name}:`, err);
            }
        } else {
            console.log(`[Pronounce] No audio_url in DB for name_id: ${name_id}`);
        }
    } else {
        if (!name_id) console.log("[Pronounce] No name_id provided, skipping DB cache");
        if (bypass_cache) console.log("[Pronounce] bypass_cache is TRUE, forcing regeneration");
    }

    // Determine the text to speak
    let targetText = text;
    if (!targetText && name_id) {
        // Fetch name if text is missing but name_id provided
        const { data } = await supabaseAdmin.from('names').select('name').eq('id', name_id).single();
        if (data) targetText = data.name;
    }

    if (!targetText) {
        return NextResponse.json({ error: "Text or Name ID is required" }, { status: 400 });
    }

    // 2. Fetch phonetic overrides and settings
    let textToSpeak = targetText;
    let finalVoiceId = voice_id || "it5NMxoQQ2INIh4XcO44";
    let finalStability = stabilityOverride;
    let finalSpeed = speedOverride;

    // A. Apply GLOBAL RULES First
    const { data: rules } = await supabaseAdmin
        .from('pronunciation_rules')
        .select('*')
        .order('created_at', { ascending: false });

    if (rules && rules.length > 0) {
        for (const rule of rules) {
            const [type, pattern] = rule.pattern.split(':');
            const lowerText = targetText.toLowerCase();
            let match = false;

            if (type === 'prefix' && lowerText.startsWith(pattern)) match = true;
            else if (type === 'suffix' && lowerText.endsWith(pattern)) match = true;
            else if (type === 'equals' && lowerText === pattern) match = true;

            if (match) {
                if (rule.phonetic_replacement) {
                    textToSpeak = rule.phonetic_replacement.replace(/-/g, ' ');
                }
                if (finalStability === undefined) finalStability = rule.settings?.stability;
                if (finalSpeed === undefined) finalSpeed = rule.settings?.speed;
                if (!voice_id) finalVoiceId = rule.settings?.voice_id || finalVoiceId;
                break;
            }
        }
    }

    // B. Apply NAME-SPECIFIC Overrides
    if (name_id) {
        const { data: nameData } = await supabaseAdmin
            .from('names')
            .select('phonetic_hint, tts_settings')
            .eq('id', name_id)
            .maybeSingle();

        if (nameData) {
            if (nameData.phonetic_hint) {
                textToSpeak = nameData.phonetic_hint.replace(/-/g, ' ');
            }
            const s = nameData.tts_settings || {};
            if (finalStability === undefined) finalStability = s.stability;
            if (finalSpeed === undefined) finalSpeed = s.speed;
            if (!voice_id) finalVoiceId = s.voice_id || finalVoiceId;
        }
    }

    // 3. Generate Audio
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

    const client = new ElevenLabsClient({ apiKey });
    const stability = typeof finalStability === 'number' ? finalStability : 0.8;
    const speed = typeof finalSpeed === 'number' ? finalSpeed : 0.9;

    const audioStream = await client.textToSpeech.convert(finalVoiceId, {
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

    // Cache (if not internal bypass/playground)
    if (name_id && !bypass_cache) {
        // Only update audio_url if it's currently empty OR if the name is not verified
        // This prevents overwriting human recordings with AI audio.
        const { data: current } = await supabaseAdmin.from('names').select('verification_status, audio_url').eq('id', name_id).single();

        const fileName = `${name_id}.mp3`;
        await supabaseAdmin.storage.from('name-audio')
            .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

        const { data: { publicUrl } } = supabaseAdmin.storage.from('name-audio').getPublicUrl(fileName);

        if (publicUrl && (!current?.audio_url || current?.verification_status !== 'verified')) {
            console.log(`[Pronounce] Updating AI cache URL for name_id: ${name_id}`);
            await supabaseAdmin.from('names').update({
                audio_url: publicUrl,
                status: 'pending' // Only AI-generated, so keep/set as pending if not verified
            }).eq('id', name_id);
        }
    }

    return new NextResponse(audioBuffer, {
        headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store, max-age=0"
        },
    });
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        return await handlePronounce({
            text: searchParams.get('text') || undefined,
            name_id: searchParams.get('name_id') || undefined,
            voice_id: searchParams.get('voice_id') || undefined,
            stability: searchParams.get('stability') ? parseFloat(searchParams.get('stability')!) : undefined,
            speed: searchParams.get('speed') ? parseFloat(searchParams.get('speed')!) : undefined,
            bypass_cache: searchParams.get('bypass_cache') === 'true'
        });
    } catch (error: any) {
        console.error("GET pronounce error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        return await handlePronounce(body);
    } catch (error: any) {
        console.error("POST pronounce error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
    try {
        const { id, name, origin } = await req.json();

        if (!id || !name) {
            return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error("OPENAI_API_KEY not set");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey });

        const prompt = `Provide a simple phonetic spelling for the Nigerian name "${name}" (${origin} origin). Return ONLY the phonetic string, nothing else. Example format: "CHEE-dee-buh-reh".`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4o-mini",
        });

        const phoneticHint = completion.choices[0].message.content?.trim().replace(/^"|"$/g, '') || "";

        if (phoneticHint) {
            const { error } = await supabaseAdmin
                .from('names')
                .update({ phonetic_hint: phoneticHint })
                .eq('id', id);

            if (error) {
                throw error;
            }
        }

        return NextResponse.json({ success: true, phonetic_hint: phoneticHint });

    } catch (error: any) {
        console.error("Error processing name:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

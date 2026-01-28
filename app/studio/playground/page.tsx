'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Volume2, Settings2, Sliders, MessageSquare, Info, History } from 'lucide-react';
import Link from 'next/link';

const NIGERIAN_VOICES = [
    { id: "it5NMxoQQ2INIh4XcO44", name: "Fisayo (Deep / Warm)", description: "Great for Igbo and Yoruba male names." },
    { id: "zwbf3iHXH6YGoTCPStfx", name: "Nigerian Male (Classic)", description: "Standard clear pronunciation." },
    { id: "Lcf7u9D9tJp75Ky79YfS", name: "Ebuka (Igbo Focus)", description: "Tuned for Igbo tonality." },
];

export default function PronunciationPlayground() {
    const [text, setText] = useState('Adébùkọ́lá');
    const [phonetic, setPhonetic] = useState('Ah-deh-boo-kaw-lah');
    const [voice, setVoice] = useState(NIGERIAN_VOICES[0].id);
    const [stability, setStability] = useState(0.8);
    const [speed, setSpeed] = useState(0.9);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [history, setHistory] = useState<{ text: string, phonetic: string, stability: number, speed: number }[]>([]);

    const playAudio = async (usePhonetic: boolean) => {
        setIsPlaying(true);
        try {
            const response = await fetch('/api/pronounce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: usePhonetic ? phonetic : text,
                    voice_id: voice,
                    stability,
                    speed,
                    bypass_cache: true // Always fresh for playground
                })
            });

            if (!response.ok) throw new Error('Failed to generate audio');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
            const audio = new Audio(url);
            audio.play();

            // Add to history
            const newEntry = { text, phonetic, stability, speed };
            setHistory(prev => [newEntry, ...prev].slice(0, 5));
        } catch (error) {
            console.error(error);
            alert("Error playing audio. Check your API key or network.");
        } finally {
            setIsPlaying(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#FDFCFB] p-6 md:p-12 font-sans text-[#2C2420]">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-[#4e3629] mb-2">Pronunciation Playground</h1>
                        <p className="text-[#6B6661]">Find the "Master Formula" for difficult names tanpa wasting credits.</p>
                    </div>
                    <Link href="/studio/library" className="text-[#4e3629] hover:underline font-medium">
                        Back to Library
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Side: Tuning Controls */}
                    <div className="space-y-8">
                        {/* Name Input */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#F0EBE6]">
                            <label className="block text-sm font-bold uppercase tracking-wider text-[#9E958F] mb-4">The Name</label>
                            <input
                                type="text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="w-full text-2xl font-serif bg-transparent border-none focus:ring-0 text-[#2C2420]"
                                placeholder="Enter name..."
                            />
                        </div>

                        {/* Phonetic Tuning */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#F0EBE6]">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-sm font-bold uppercase tracking-wider text-[#9E958F]">Phonetic Respelling (AI sees this)</label>
                                <div className="p-1 bg-[#F5F2EF] rounded-md text-[#6B6661] text-[10px] cursor-help" title="Try spelling it exactly how it sounds to the ear.">
                                    <Info className="w-3 h-3" />
                                </div>
                            </div>
                            <input
                                type="text"
                                value={phonetic}
                                onChange={(e) => setPhonetic(e.target.value)}
                                className="w-full text-xl bg-[#FDFCFB] p-3 rounded-xl border border-[#F0EBE6] focus:border-[#4e3629] outline-none transition-all"
                                placeholder="e.g. Choo kwoo ay boo kah"
                            />
                            <div className="mt-4 flex gap-4">
                                <button
                                    onClick={() => playAudio(false)}
                                    disabled={isPlaying}
                                    className="flex-1 py-3 px-4 bg-[#F5F2EF] hover:bg-[#E9E4DE] text-[#4e3629] rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    <Volume2 className="w-4 h-4" />
                                    Original
                                </button>
                                <button
                                    onClick={() => playAudio(true)}
                                    disabled={isPlaying}
                                    className="flex-1 py-3 px-4 bg-[#4e3629] hover:bg-[#3d2a20] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4e3629]/20"
                                >
                                    <Play className="w-4 h-4 fill-white" />
                                    Phonetic
                                </button>
                            </div>
                        </div>

                        {/* Fine Tuning Controls */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#F0EBE6] space-y-6">
                            <label className="block text-sm font-bold uppercase tracking-wider text-[#9E958F]">Fine Tuning</label>

                            {/* Voice Selector */}
                            <div className="space-y-3">
                                <div className="text-xs font-medium text-[#6B6661]">Choose a Voice</div>
                                <div className="grid grid-cols-1 gap-2">
                                    {NIGERIAN_VOICES.map((v) => (
                                        <button
                                            key={v.id}
                                            onClick={() => setVoice(v.id)}
                                            className={`p-3 text-left rounded-xl border transition-all ${voice === v.id ? 'border-[#4e3629] bg-[#FDFCFB]' : 'border-transparent bg-white hover:bg-[#FDFCFB]'}`}
                                        >
                                            <div className="font-bold text-sm text-[#4e3629]">{v.name}</div>
                                            <div className="text-[10px] text-[#9E958F]">{v.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Stability Slider */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="text-xs font-medium text-[#6B6661]">Stability (Emotional range)</div>
                                    <div className="text-xs font-bold text-[#4e3629]">{stability}</div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={stability}
                                    onChange={(e) => setStability(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-[#F5F2EF] rounded-lg appearance-none cursor-pointer accent-[#4e3629]"
                                />
                                <div className="flex justify-between text-[9px] text-[#9E958F]">
                                    <span>Expressive / Risky</span>
                                    <span>Stable / Rigid</span>
                                </div>
                            </div>

                            {/* Speed Slider */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="text-xs font-medium text-[#6B6661]">Speed (Pace)</div>
                                    <div className="text-xs font-bold text-[#4e3629]">{speed}</div>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1.5"
                                    step="0.05"
                                    value={speed}
                                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-[#F5F2EF] rounded-lg appearance-none cursor-pointer accent-[#4e3629]"
                                />
                                <div className="flex justify-between text-[9px] text-[#9E958F]">
                                    <span>Slower</span>
                                    <span>Faster</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Tips & History */}
                    <div className="space-y-8">
                        {/* Native Tips Section */}
                        <div className="bg-[#4e3629] text-white p-8 rounded-3xl shadow-xl shadow-[#4e3629]/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Settings2 className="w-24 h-24" />
                            </div>
                            <h3 className="text-xl font-serif font-medium mb-6 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                Pro Tips for Tonal Names
                            </h3>
                            <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                                <p>• <strong>Hyphen Removal:</strong> We strip hyphens in the API to avoid robotic micro-pauses. Use spaces for syllable breaks instead.</p>
                                <p>• <strong>Vowel Stacking:</strong> If a syllable needs more weight, try doubling the vowel (e.g., "Ah" instead of "a").</p>
                                <p>• <strong>Stability:</strong> Lower stability (0.6 - 0.8) allows the AI to use more natural cultural tonality, while high stability is better for clarity.</p>
                                <p>• <strong>Speed:</strong> 0.8 to 0.9 is usually the "sweet spot" for long Nigerian names.</p>
                            </div>
                        </div>

                        {/* Recent Formula History */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#F0EBE6]">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#9E958F] mb-4 flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Recent Attempts
                            </h3>
                            <div className="space-y-4">
                                {history.length === 0 ? (
                                    <div className="text-sm text-[#9E958F] italic py-4">Your tuning history will appear here...</div>
                                ) : (
                                    history.map((h, i) => (
                                        <div key={i} className="p-3 bg-[#FDFCFB] rounded-xl border border-[#F5F2EF]">
                                            <div className="font-bold text-[#4e3629] text-sm mb-1">{h.text}</div>
                                            <div className="text-xs text-[#6B6661] mb-2 font-mono">"{h.phonetic}"</div>
                                            <div className="flex gap-3 text-[10px] text-[#9E958F]">
                                                <span>STAB: {h.stability}</span>
                                                <span>SPEED: {h.speed}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

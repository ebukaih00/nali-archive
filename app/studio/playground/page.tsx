'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Volume2, Settings2, Sliders, MessageSquare, Info, History, Search, Save, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { searchTuningNames, saveTuningFormula } from '../actions';

const NIGERIAN_VOICES = [
    { id: "it5NMxoQQ2INIh4XcO44", name: "Fisayo (Deep / Warm)", description: "Great for Igbo and Yoruba male names." },
    { id: "zwbf3iHXH6YGoTCPStfx", name: "Nigerian Male (Classic)", description: "Standard clear pronunciation." },
    { id: "Lcf7u9D9tJp75Ky79YfS", name: "Ebuka (Igbo Focus)", description: "Tuned for Igbo tonality." },
];

export default function PronunciationPlayground() {
    const [text, setText] = useState('');
    const [selectedNameId, setSelectedNameId] = useState<string | null>(null);
    const [phonetic, setPhonetic] = useState('');
    const [voice, setVoice] = useState(NIGERIAN_VOICES[0].id);
    const [stability, setStability] = useState(0.8);
    const [speed, setSpeed] = useState(0.9);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [history, setHistory] = useState<{ text: string, phonetic: string, stability: number, speed: number }[]>([]);

    // Rule Logic
    const [applyRule, setApplyRule] = useState(false);
    const [ruleType, setRuleType] = useState<'prefix' | 'suffix' | 'equals'>('prefix');
    const [rulePattern, setRulePattern] = useState('');

    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (text.length >= 2 && !selectedNameId) {
                setIsSearching(true);
                try {
                    const results = await searchTuningNames(text);
                    setSearchResults(results);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [text, selectedNameId]);

    const selectName = (item: any) => {
        setSelectedNameId(item.id);
        setText(item.name);
        setPhonetic(item.phonetic_hint || '');
        if (item.tts_settings) {
            setStability(item.tts_settings.stability ?? 0.8);
            setSpeed(item.tts_settings.speed ?? 0.9);
            setVoice(item.tts_settings.voice_id ?? NIGERIAN_VOICES[0].id);
        }
        setSearchResults([]);

        // Suggest a rule pattern
        const firstThree = item.name.substring(0, 3);
        setRulePattern(firstThree);
    };

    const handleSave = async () => {
        if (!selectedNameId) {
            alert("Please select a name from the search results first.");
            return;
        }

        setIsSaving(true);
        try {
            await saveTuningFormula({
                nameId: selectedNameId,
                phonetic,
                settings: { stability, speed, voice_id: voice },
                ruleType: applyRule ? ruleType : undefined,
                rulePattern: applyRule ? rulePattern : undefined
            });
            alert("Master Formula Saved! This name is now verified and optimized.");
        } catch (error: any) {
            alert(`Error saving: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const playAudio = async (usePhonetic: boolean) => {
        setIsPlaying(true);
        try {
            const response = await fetch(`/api/pronounce?v=${Date.now()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: usePhonetic ? phonetic : text,
                    voice_id: voice,
                    stability,
                    speed,
                    name_id: selectedNameId, // Pass ID to apply rules/overrides
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
                        {/* Name Input & Search */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#F0EBE6] relative">
                            <label className="block text-sm font-bold uppercase tracking-wider text-[#9E958F] mb-4">Search a Name to Tune</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={text}
                                    onChange={(e) => {
                                        setText(e.target.value);
                                        setSelectedNameId(null);
                                    }}
                                    className="w-full text-2xl font-serif bg-transparent border-none focus:ring-0 text-[#2C2420] pl-10"
                                    placeholder="Start typing a name..."
                                />
                                <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 text-[#9E958F]" />
                                {isSearching && <Loader2 className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary" />}
                            </div>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-[#F0EBE6] z-50 max-h-64 overflow-auto py-2">
                                    {searchResults.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => selectName(item)}
                                            className="w-full px-6 py-3 text-left hover:bg-[#FDFCFB] border-b border-[#F0EBE6] last:border-0 flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="font-serif font-bold text-[#2C2420]">{item.name}</div>
                                                <div className="text-xs text-[#9E958F]">{item.origin}</div>
                                            </div>
                                            <div className="text-[10px] font-sans font-bold text-primary opacity-0 group-hover:opacity-100 uppercase tracking-widest">
                                                Select
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedNameId && (
                                <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-[#F5FEEF] text-[#2D5A27] text-xs font-bold rounded-full w-fit">
                                    <Check className="w-3 h-3" />
                                    Connected to Database
                                </div>
                            )}
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

                            {/* SAVE FORMULA SECTION */}
                            <div className="pt-6 border-t border-[#F0EBE6] space-y-4">
                                <div className="flex items-start gap-3 p-4 bg-[#FDFCFB] rounded-2xl border border-[#F0EBE6]">
                                    <input
                                        type="checkbox"
                                        id="applyRule"
                                        checked={applyRule}
                                        onChange={(e) => setApplyRule(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary"
                                    />
                                    <div className="flex-1">
                                        <label htmlFor="applyRule" className="text-sm font-bold text-[#4e3629] block mb-1">Apply to similar names</label>
                                        <p className="text-[10px] text-[#9E958F] mb-3">Save these settings as a global pattern for this prefix/suffix.</p>

                                        {applyRule && (
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <select
                                                    value={ruleType}
                                                    onChange={(e: any) => setRuleType(e.target.value)}
                                                    className="text-xs bg-white border border-[#E9E4DE] rounded-lg p-2 outline-none focus:border-primary"
                                                >
                                                    <option value="prefix">Prefix (Starts with)</option>
                                                    <option value="suffix">Suffix (Ends with)</option>
                                                    <option value="equals">Exact (Matches)</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    value={rulePattern}
                                                    onChange={(e) => setRulePattern(e.target.value)}
                                                    className="text-xs bg-white border border-[#E9E4DE] rounded-lg p-2 outline-none focus:border-primary font-bold"
                                                    placeholder="Pattern..."
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !selectedNameId}
                                    className="w-full py-4 bg-[#2C2420] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#1a1614] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[#2C2420]/20"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save as Master Formula
                                </button>
                                {!selectedNameId && (
                                    <p className="text-center text-[10px] text-red-500 font-bold uppercase tracking-widest">
                                        Select a name from results to enable saving
                                    </p>
                                )}
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

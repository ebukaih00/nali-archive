'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { Search, Play, Volume2, Volume1, Loader2, Link as LinkIcon, Check } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

interface NameEntry {
    id: number;
    name: string;
    origin_country: string;
    meaning: string;
    phonetic_hint: string;
    origin: string;
    audio_url?: string;
    verification_status?: string;
}

export default function SearchNames() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('search') || '';
    const [searchTerm, setSearchTerm] = useState(initialQuery);
    const [allNames, setAllNames] = useState<NameEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const normalizeText = (text: string) => {
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    useEffect(() => {
        const fetchNames = async () => {
            setLoading(true);
            try {
                let allData: NameEntry[] = [];
                let from = 0;
                const step = 999;
                let more = true;

                while (more) {
                    const { data, error } = await supabase
                        .from('names')
                        .select('*')
                        .eq('verification_status', 'verified')
                        .order('name', { ascending: true })
                        .range(from, from + step);

                    if (error) throw error;

                    if (data && data.length > 0) {
                        allData = [...allData, ...data];
                        from += (step + 1);
                        if (data.length < (step + 1)) more = false;
                    } else {
                        more = false;
                    }
                }
                setAllNames(allData);
                // Track initial load of names
                trackEvent('names_loaded', { count: allData.length });
            } catch (error) {
                console.error('Error fetching names:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNames();
    }, []);

    const results = useMemo(() => {
        if (!searchTerm) return allNames.slice(0, 50);

        const normalizedSearch = normalizeText(searchTerm);

        // Track search action
        if (searchTerm.trim()) {
            trackEvent('search_explore', { search_term: searchTerm.trim() });
        }

        return allNames.filter(entry => {
            const normalizedName = normalizeText(entry.name);
            const normalizedMeaning = normalizeText(entry.meaning || '');
            const normalizedOrigin = normalizeText(entry.origin || '');
            return normalizedName.includes(normalizedSearch) ||
                normalizedMeaning.includes(normalizedSearch) ||
                normalizedOrigin.includes(normalizedSearch);
        });
    }, [searchTerm, allNames]);

    const displayResults = results.slice(0, 50);

    const playPronunciation = async (entry: NameEntry) => {
        if (playingId) return;
        setPlayingId(entry.id);

        // 1. Prioritize Human Recording if available
        if (entry.audio_url) {
            try {
                // Add timestamp to bypass potential browser caching
                const audioUrl = entry.audio_url.includes('?')
                    ? `${entry.audio_url}&t=${Date.now()}`
                    : `${entry.audio_url}?t=${Date.now()}`;

                const audio = new Audio(audioUrl);
                audio.onended = () => setPlayingId(null);
                audio.play();

                // Track human audio play
                trackEvent('play_name_explore_human', {
                    name: entry.name,
                    name_id: entry.id,
                    origin: entry.origin
                });
                return;
            } catch (e) {
                console.error("Failed to play human recording, falling back to AI", e);
            }
        }

        // 2. Fallback to AI API
        try {
            const response = await fetch('/api/pronounce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: entry.phonetic_hint || entry.name,
                    voice_id: entry.origin === 'Hausa' ? 'zwbf3iHXH6YGoTCPStfx' : 'nw6EIXCsQ89uJMjytYb8',
                    name_id: entry.id
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch audio');

            // Track AI audio play
            trackEvent('play_name_explore_ai', {
                name: entry.name,
                name_id: entry.id,
                origin: entry.origin
            });

            const blob = await response.blob();
            const audio = new Audio(URL.createObjectURL(blob));
            audio.onended = () => setPlayingId(null);
            audio.play();
        } catch (error) {
            console.error('Error playing audio:', error);
            setPlayingId(null);
        }
    };

    const handleShare = async (entry: NameEntry) => {
        const shareData = {
            title: `${entry.name} | Nigerian Names`,
            text: `Hello! Learn the pronunciation of the name "${entry.name}" on Nali.`,
            url: `${window.location.origin}/?search=${encodeURIComponent(entry.name)}`
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                trackEvent('share_name_explore', { name: entry.name, method: 'native' });
            } else {
                await navigator.clipboard.writeText(shareData.url);
                setCopiedId(entry.id);
                setTimeout(() => setCopiedId(null), 2000);
                trackEvent('share_name_explore', { name: entry.name, method: 'clipboard' });
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-10">
            <div className="relative w-full max-w-2xl mx-auto">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-secondary/40" />
                </div>
                <input
                    type="text"
                    placeholder="Search by name, meaning, or origin..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-12 py-5 text-xl bg-white border border-secondary/20 rounded-2xl shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-secondary/30 text-foreground font-sans"
                />
                {loading && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center text-secondary/50 font-light px-2">
                <span className="text-sm">
                    {allNames.length > 0 ? (
                        `Browsing ${allNames.length.toLocaleString()} names`
                    ) : (
                        loading ? "Loading database..." : "Database is empty"
                    )}
                </span>
                {searchTerm && (
                    <span className="text-sm">
                        Found {results.length} results
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {displayResults.map((entry) => (
                    <div
                        key={entry.id}
                        className="group bg-white border border-white/50 rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_60px_rgba(0,0,0,0.06)] transition-all duration-300 animate-fade-in-up"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1 pr-4">
                                <h3 className="text-3xl font-serif text-foreground mb-2 group-hover:text-primary transition-colors">
                                    {entry.name}
                                </h3>
                                <div className="flex items-center gap-2 text-secondary/60">
                                    {playingId === entry.id ? (
                                        <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                                    ) : (
                                        <Volume1 className="w-4 h-4" />
                                    )}
                                    <span className="text-sm font-serif italic">{entry.phonetic_hint || entry.name}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => playPronunciation(entry)}
                                disabled={playingId !== null}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-background text-primary hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                            >
                                {playingId === entry.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Play className="w-5 h-5 fill-primary stroke-none ml-0.5" />
                                )}
                            </button>
                        </div>

                        <p className="text-foreground/70 font-light leading-relaxed font-serif mb-6 line-clamp-3">
                            {entry.meaning || "Meaning coming soon..."}
                        </p>

                        <div className="flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-background text-secondary/70 text-[10px] font-bold uppercase tracking-widest rounded-full border border-secondary/5">
                                    {entry.origin}
                                </span>
                                <button
                                    onClick={() => handleShare(entry)}
                                    className="p-1 px-2 text-secondary/40 hover:text-primary transition-colors flex items-center gap-1.5 group/share"
                                    title="Copy link"
                                >
                                    {copiedId === entry.id ? (
                                        <Check className="w-3.5 h-3.5 text-green-600" />
                                    ) : (
                                        <LinkIcon className="w-3.5 h-3.5" />
                                    )}
                                    <span className={`text-[10px] font-bold uppercase tracking-widest transition-opacity ${copiedId === entry.id ? 'opacity-100 text-green-600' : 'opacity-0 group-hover/share:opacity-100'}`}>
                                        {copiedId === entry.id ? 'Copied' : 'Link'}
                                    </span>
                                </button>
                                <span className="px-3 py-1 bg-background text-secondary/70 text-[10px] font-bold uppercase tracking-widest rounded-full border border-secondary/5">
                                    {entry.origin_country}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {displayResults.length === 0 && !loading && (
                    <div className="col-span-full text-center py-20 text-secondary/30">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-xl font-light">No names match your search</p>
                    </div>
                )}
            </div>
        </div>
    );
}

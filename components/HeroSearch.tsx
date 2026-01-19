'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { Search, Play, Volume2, ThumbsUp, ThumbsDown, X, Loader2, Plus, Copy, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tribes } from '../lib/tribes';

interface NameEntry {
    id: number;
    name: string;
    origin_country: string;
    meaning: string;
    phonetic_hint: string;
    origin: string; // Renamed from language
    voice_id?: string;
}

export default function HeroSearch() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('search') || searchParams.get('name') || '';
    const [query, setQuery] = useState(initialQuery);
    const [allNames, setAllNames] = useState<NameEntry[]>([]);
    const [result, setResult] = useState<NameEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [suggestions, setSuggestions] = useState<NameEntry[]>([]);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [copied, setCopied] = useState(false);
    const [liked, setLiked] = useState(false);

    const normalize = (text: string) =>
        text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    useEffect(() => {
        const loadDB = async () => {
            let allData: NameEntry[] = [];
            let from = 0;
            const step = 999;
            let more = true;

            try {
                while (more) {
                    const { data, error } = await supabase
                        .from('names')
                        .select('*')
                        .eq('status', 'verified')
                        .range(from, from + step);

                    if (error) throw error;
                    if (data && data.length > 0) {
                        allData = [...allData, ...data];
                        from += step + 1;
                        if (data.length < step + 1) more = false;
                    } else {
                        more = false;
                    }
                }
                setAllNames(allData);
            } catch (err) {
                console.error('Failed to load names', err);
            } finally {
                setLoading(false);
            }
        };
        loadDB();
    }, []);

    useEffect(() => {
        if (!query || result) {
            setSuggestions([]);
            return;
        }
        const q = normalize(query);
        const startsWith = allNames.filter(n => normalize(n.name).startsWith(q));
        const contains = allNames.filter(n => !normalize(n.name).startsWith(q) && normalize(n.name).includes(q));
        const matches = [...startsWith, ...contains].slice(0, 8);
        setSuggestions(matches);
    }, [query, allNames, result]);

    const handleSearch = (entry?: NameEntry) => {
        setSearching(true);
        setResult(null);
        setSuggestions([]);
        setShowFeedbackForm(false);

        const target = entry || allNames.find(n => normalize(n.name) === normalize(query));

        if (target) {
            setResult(target);
            setQuery(target.name);
        } else if (query.trim() !== '') {
            const partial = allNames.find(n => normalize(n.name).includes(normalize(query)));
            if (partial) {
                setResult(partial);
                setQuery(partial.name);
            }
        }
        setSearching(false);
    };

    // Auto-search if query is pre-filled from URL
    useEffect(() => {
        if (allNames.length > 0 && query && !result) {
            // We verify if the current query matches the URL param to avoid re-searching on user typing
            // But here we rely on the fact that initial state set query.
            // To be safe, we can just check if we have an exact match for the current query
            const target = allNames.find(n => normalize(n.name) === normalize(query));
            if (target) {
                handleSearch(target);
            }
        }
    }, [allNames, query]); // Re-run when names are loaded

    const playAudio = async () => {
        if (!result || audioPlaying) return;
        setAudioPlaying(true);

        const VOICE_MAP: Record<string, string> = {
            'Igbo': 'nw6EIXCsQ89uJMjytYb8',
            'Yoruba': 'zwbf3iHXH6YGoTCPStfx',
        };

        const targetVoiceId = result.voice_id || VOICE_MAP[result.origin] || 'zwbf3iHXH6YGoTCPStfx';

        try {
            const res = await fetch('/api/pronounce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: result.phonetic_hint || result.name,
                    voice_id: targetVoiceId,
                    name_id: result.id
                })
            });
            const blob = await res.blob();
            const audio = new Audio(URL.createObjectURL(blob));
            audio.onended = () => setAudioPlaying(false);
            audio.play();
        } catch (e) {
            console.error(e);
            setAudioPlaying(false);
        }
    };

    const [showAddModal, setShowAddModal] = useState(false);
    const [contribution, setContribution] = useState({ name: '', phonetic: '', origin: '' });



    const [submissionLoading, setSubmissionLoading] = useState(false);
    const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

    // Feedback State
    const [feedbackCategory, setFeedbackCategory] = useState('');
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isOriginDropdownOpen, setIsOriginDropdownOpen] = useState(false);

    // General Feedback State
    const [showGeneralFeedbackModal, setShowGeneralFeedbackModal] = useState(false);
    const [generalFeedback, setGeneralFeedback] = useState({ category: '', comment: '' });
    const [generalFeedbackLoading, setGeneralFeedbackLoading] = useState(false);
    const [isGeneralDropdownOpen, setIsGeneralDropdownOpen] = useState(false);

    // Basic sanitization to prevent XSS (strips HTML tags)
    const sanitizeInput = (text: string) => text.replace(/<[^>]*>?/gm, '').trim();

    const submitGeneralFeedback = async () => {
        if (!generalFeedback.category || !generalFeedback.comment) return;

        setGeneralFeedbackLoading(true);
        try {
            const { error } = await supabase.from('feedback').insert({
                category: sanitizeInput(generalFeedback.category),
                comment: sanitizeInput(generalFeedback.comment),
                name_id: null // Explicitly null for general feedback
            });

            if (error) throw error;

            setGeneralFeedback({ category: '', comment: '' });
            setShowGeneralFeedbackModal(false);
            // Ideally show a toast here, but for now we just close
        } catch (error) {
            console.error('Error submitting feedback:', error);
        } finally {
            setGeneralFeedbackLoading(false);
        }
    };

    const handleAddName = () => {
        setContribution({ name: query, phonetic: '', origin: '' });
        setSubmissionSuccess(null);
        setShowAddModal(true);
        setSuggestions([]); // Close suggestions
    };

    const submitContribution = async () => {
        if (!contribution.name || !contribution.origin) return;

        setSubmissionLoading(true);
        try {
            const safeName = sanitizeInput(contribution.name);
            const safePhonetic = sanitizeInput(contribution.phonetic);
            const safeOrigin = sanitizeInput(contribution.origin);

            const { data, error } = await supabase.from('names').insert({
                name: safeName,
                phonetic_hint: safePhonetic,
                origin: safeOrigin,
                origin_country: 'Nigeria', // Defaulting to Nigeria for this specific app context
                status: 'pending',
                is_community_contributed: true
            }).select().single();

            if (error) throw error;

            // Trigger AI processing (fire and forget)
            if (data?.id) {
                fetch('/api/process-new-name', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: data.id,
                        name: safeName,
                        origin: safeOrigin
                    })
                }).catch(console.error);
            }

            setSubmissionSuccess(`Thank you! ${safeName} has been added to our queue for review.`);
            setContribution({ name: '', phonetic: '', origin: '' });
            setTimeout(() => {
                setShowAddModal(false);
                setSubmissionSuccess(null);
                setQuery('');
            }, 3000); // Close after 3 seconds
        } catch (err) {
            console.error('Error submitting name:', JSON.stringify(err, null, 2));
            // Optionally set an error state here
        } finally {
            setSubmissionLoading(false);
        }
    };

    const submitFeedback = async () => {
        if (!result || !feedbackComment) return;

        setFeedbackLoading(true);
        try {
            const { error } = await supabase.from('feedback').insert({
                name_id: result.id,
                name: result.name, // Store the actual name string for easier reference
                category: sanitizeInput(feedbackCategory),
                comment: sanitizeInput(feedbackComment),
            });

            if (error) throw error;

            setFeedbackSuccess('Thank you for your feedback! We will review it shortly.');
            setFeedbackComment('');
            setTimeout(() => {
                setShowFeedbackForm(false);
                setFeedbackSuccess(null);
            }, 3000);
        } catch (err) {
            console.error('Error submitting feedback:', err);
        } finally {
            setFeedbackLoading(false);
        }
    };

    const clearSearch = () => {
        setQuery('');
        setResult(null);
        setSuggestions([]);
        setShowFeedbackForm(false);
        setAudioPlaying(false);
        setFeedbackSuccess(null);
    };

    return (
        <div className="w-full max-w-[680px] mx-auto flex flex-col items-center px-4 pt-16 relative">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center mb-10 w-full flex flex-col items-center"
            >
                <h1 className="text-4xl md:text-6xl font-spartan font-bold text-primary mb-4 tracking-tighter">
                    Nali
                </h1>
                <p className="text-[16px] md:text-[19px] text-primary font-light max-w-xl mx-auto mb-6 relative">
                    Learn to pronounce and understand Nigerian names
                </p>



                {/* Mobile Info Icon (Result View Only) */}
                {result && (
                    <Link href="/about" className="absolute top-0 right-0 md:hidden p-3 text-secondary hover:text-primary transition-colors" aria-label="About this project">
                        <Info className="w-6 h-6" />
                    </Link>
                )}
            </motion.div>


            {/* Search Section */}
            <div className="w-full relative mb-12">
                <div className="relative isolate group z-50">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                        <Search className="w-5 h-5 text-secondary group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (result) setResult(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search a name"
                        className="w-full pl-12 pr-14 py-4 text-lg bg-white border border-primary/20 rounded-xl focus:outline-none focus:border-primary transition-all placeholder:text-secondary/50 text-foreground font-sans"
                    />
                    <AnimatePresence>
                        {query && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={clearSearch}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary/50 hover:text-secondary group/clear"
                            >
                                <X className="w-5 h-5 transition-transform group-hover/clear:rotate-90" />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Search Results Dropdown */}
                    <AnimatePresence>
                        {query && !result && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-secondary/10 overflow-hidden z-50 origin-top max-h-[300px] overflow-y-auto"
                            >
                                {suggestions.length > 0 ? (
                                    suggestions.map((s, idx) => (
                                        <button
                                            key={s.id}
                                            onClick={() => handleSearch(s)}
                                            className="w-full px-5 py-4 text-left flex justify-between items-center hover:bg-background/50 transition-colors border-b border-secondary/5 last:border-0"
                                        >
                                            <span className="font-sans text-lg font-medium text-foreground">{s.name}</span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                                                {s.origin}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <button
                                        onClick={handleAddName}
                                        className="w-full px-5 py-6 flex items-center justify-start gap-4 hover:bg-background/50 transition-colors group/add"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover/add:bg-primary group-hover/add:text-white transition-colors">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium text-foreground">Add "{query}"</p>
                                            <p className="text-sm text-secondary/60">This name is not in our database yet</p>
                                        </div>
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Landing State About Link */}
                {!result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-col md:flex-row items-center justify-center gap-4 mt-8"
                    >
                        {!loading && allNames.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-[#F3F4F6] border border-gray-200 rounded-full">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-xs font-semibold text-gray-700 tracking-wide">
                                    {allNames.length.toLocaleString()} active names
                                </span>
                            </div>
                        )}
                        <Link href="/about" className="text-sm text-secondary hover:text-primary transition-colors underline underline-offset-4 decoration-secondary/30 hover:decoration-primary">
                            Why this exists
                        </Link>
                    </motion.div>
                )}
            </div>

            {/* Name Pronunciation Card */}
            <AnimatePresence mode="wait">
                {result && (
                    <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="w-full bg-white rounded-2xl border border-primary/20 overflow-hidden"
                    >
                        {/* Main Card Content */}
                        {/* Main Card Content */}
                        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-0">
                            <div className="flex-1 min-w-0 pr-0 sm:pr-8 w-full">
                                <div className="mb-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary uppercase tracking-wider">
                                        {result.origin}
                                    </span>
                                </div>
                                <h2 className="text-[32px] md:text-[40px] font-serif text-primary mb-3 font-medium leading-tight break-words">
                                    {result.name}
                                </h2>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10 group/hint w-fit sm:w-auto">
                                            <span className="text-[17px] text-primary font-medium font-sans whitespace-normal break-words">
                                                {result.phonetic_hint || "Pronunciation hint unavailable"}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(result.phonetic_hint || "");
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                                className="p-1 hover:bg-[#E87461]/10 rounded-md transition-colors flex-shrink-0"
                                                title="Copy pronunciation"
                                            >
                                                {copied ? (
                                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5 text-secondary/40 group-hover/hint:text-primary" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Mobile Play Button */}
                                        <button
                                            onClick={playAudio}
                                            disabled={audioPlaying}
                                            className="relative flex-shrink-0 group/play sm:hidden"
                                        >
                                            <div className={`w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 transition-all duration-300 group-hover/play:bg-primary ${audioPlaying ? 'animate-pulse' : ''}`}>
                                                {audioPlaying ? (
                                                    <Loader2 className="w-6 h-6 text-primary group-hover/play:text-white animate-spin" />
                                                ) : (
                                                    <Play className="w-5 h-5 text-primary fill-primary ml-1 group-hover/play:text-white group-hover/play:fill-white transition-colors" />
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={playAudio}
                                disabled={audioPlaying}
                                className="relative flex-shrink-0 group/play self-center hidden sm:block"
                            >
                                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 transition-all duration-300 group-hover/play:bg-primary ${audioPlaying ? 'animate-pulse' : ''}`}>
                                    {audioPlaying ? (
                                        <Loader2 className="w-7 h-7 md:w-8 md:h-8 text-primary group-hover/play:text-white animate-spin" />
                                    ) : (
                                        <Play className="w-6 h-6 md:w-7 md:h-7 text-primary fill-primary ml-1 group-hover/play:text-white group-hover/play:fill-white transition-colors" />
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Meaning Section (Added based on data structure requirement) */}



                        {/* Feedback Section */}
                        <div className="border-t border-secondary/10 p-6 bg-background/30">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <p className="text-sm text-primary font-medium">Was this pronunciation helpful?</p>
                                    <div className="flex gap-3 w-full sm:w-auto">
                                        <button
                                            onClick={() => {
                                                if (liked) {
                                                    setLiked(false);
                                                } else {
                                                    setLiked(true);
                                                    setShowFeedbackForm(false);
                                                }
                                            }}
                                            className={`flex-1 sm:flex-none justify-center px-4 py-2 border rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${liked ? 'bg-primary text-white border-primary' : 'bg-white border-primary text-primary hover:bg-primary hover:text-white'}`}
                                        >
                                            <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} /> {liked ? 'Helpful!' : 'Yes'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (showFeedbackForm) {
                                                    setShowFeedbackForm(false);
                                                } else {
                                                    setShowFeedbackForm(true);
                                                    setLiked(false);
                                                }
                                            }}
                                            className={`flex-1 sm:flex-none justify-center px-4 py-2 border rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${showFeedbackForm ? 'bg-primary text-white border-primary' : 'bg-white border-primary text-primary hover:bg-primary hover:text-white'}`}
                                        >
                                            <ThumbsDown className="w-4 h-4" /> No
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>

            {/* Add Name Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl"
                        >
                            <div className="p-6 md:p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-serif text-2xl font-medium text-foreground">Contribute a Name</h3>
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="p-2 -mr-2 text-secondary/40 hover:text-secondary transition-colors rounded-full hover:bg-secondary/5"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {submissionSuccess ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Check className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-xl font-serif font-medium text-foreground mb-2">Submission Received</h3>
                                        <p className="text-secondary">{submissionSuccess}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                                            <input
                                                type="text"
                                                value={contribution.name}
                                                onChange={(e) => setContribution({ ...contribution, name: e.target.value })}
                                                className="w-full p-4 bg-background border border-primary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-serif text-lg"
                                                placeholder="Name"
                                                disabled={submissionLoading}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Phonetic Sound</label>
                                            <input
                                                type="text"
                                                value={contribution.phonetic}
                                                onChange={(e) => setContribution({ ...contribution, phonetic: e.target.value })}
                                                className="w-full p-4 bg-background border border-primary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
                                                placeholder="e.g. CHEE-dee-buh-reh"
                                                disabled={submissionLoading}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Tribe / Origin</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={contribution.origin}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setContribution({ ...contribution, origin: val });
                                                        setIsOriginDropdownOpen(val.length > 0);
                                                    }}
                                                    onFocus={() => {
                                                        if (contribution.origin.length > 0) setIsOriginDropdownOpen(true);
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => setIsOriginDropdownOpen(false), 200);
                                                    }}
                                                    className="w-full p-4 bg-background border border-primary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
                                                    placeholder="e.g. Igbo"
                                                    disabled={submissionLoading}
                                                />

                                                <AnimatePresence>
                                                    {isOriginDropdownOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="absolute z-10 w-full mt-2 bg-white border border-secondary/10 rounded-xl shadow-lg overflow-y-auto max-h-60 top-full left-0 origin-top"
                                                        >
                                                            {tribes
                                                                .filter(tribe => tribe.toLowerCase().includes(contribution.origin.toLowerCase()))
                                                                .map((tribe) => (
                                                                    <button
                                                                        key={tribe}
                                                                        onClick={() => {
                                                                            setContribution({ ...contribution, origin: tribe });
                                                                            setIsOriginDropdownOpen(false);
                                                                        }}
                                                                        className="w-full px-4 py-3 text-left text-foreground hover:bg-secondary/5 transition-colors font-sans"
                                                                    >
                                                                        {tribe}
                                                                    </button>
                                                                ))}
                                                            {tribes
                                                                .filter(tribe => tribe.toLowerCase().includes(contribution.origin.toLowerCase())).length === 0 && (
                                                                    <div className="px-4 py-3 text-sm text-secondary/60 italic">
                                                                        No matching tribes found
                                                                    </div>
                                                                )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        <button
                                            onClick={submitContribution}
                                            disabled={!contribution.name || !contribution.origin || submissionLoading}
                                            className="w-full py-4 mt-2 bg-primary text-white font-medium text-lg rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {submissionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                                            {submissionLoading ? 'Submitting...' : 'Submit Name'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Feedback Form Card */}
            <AnimatePresence>
                {showFeedbackForm && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="w-full mt-4 bg-white rounded-2xl border border-primary/20 overflow-hidden"
                    >
                        <div className="p-6 md:p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-serif text-xl font-medium text-foreground">Help us improve</h3>
                                <button
                                    onClick={() => setShowFeedbackForm(false)}
                                    className="text-secondary/40 hover:text-secondary transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {feedbackSuccess ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-serif font-medium text-foreground mb-2">Feedback Received</h3>
                                    <p className="text-sm text-secondary">{feedbackSuccess}</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-foreground mb-2">Issue Category</label>
                                        <button
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            disabled={feedbackLoading}
                                            className="w-full p-4 bg-background border border-primary/20 rounded-xl text-foreground text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans text-sm"
                                        >
                                            <span className={!feedbackCategory ? "text-secondary/60" : ""}>
                                                {feedbackCategory || "Select an option"}
                                            </span>
                                            <svg className={`w-4 h-4 text-secondary/50 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </button>

                                        <AnimatePresence>
                                            {isDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute z-10 w-full mt-2 bg-white border border-secondary/10 rounded-xl shadow-lg overflow-hidden"
                                                >
                                                    {["Incorrect Pronunciation", "Incorrect Spelling", "Incorrect Origin", "Other"].map((option) => (
                                                        <button
                                                            key={option}
                                                            onClick={() => {
                                                                setFeedbackCategory(option);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary/5 transition-colors font-sans"
                                                        >
                                                            {option}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {feedbackCategory && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="overflow-hidden"
                                        >
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                {feedbackCategory === 'Incorrect Pronunciation' ? 'Enter correct pronunciation' :
                                                    feedbackCategory === 'Incorrect Spelling' ? 'Enter correct spelling' :
                                                        feedbackCategory === 'Incorrect Origin' ? 'Enter correct origin' :
                                                            'Details'}
                                            </label>
                                            <input
                                                type="text"
                                                value={feedbackComment}
                                                onChange={(e) => setFeedbackComment(e.target.value)}
                                                className="w-full p-4 bg-background border border-primary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-secondary/40 font-sans text-sm"
                                                placeholder={
                                                    feedbackCategory === 'Incorrect Pronunciation' ? 'e.g. CHEE-dee-buh-reh' :
                                                        feedbackCategory === 'Incorrect Spelling' ? 'e.g. Chidiebube' :
                                                            feedbackCategory === 'Incorrect Origin' ? 'e.g. Igbo' :
                                                                'Please describe the issue...'
                                                }
                                                disabled={feedbackLoading}
                                            />
                                        </motion.div>
                                    )}

                                    <button
                                        onClick={submitFeedback}
                                        disabled={!feedbackCategory || !feedbackComment || feedbackLoading}
                                        className="w-full py-4 bg-primary text-white font-medium text-base rounded-xl hover:bg-primary-dark transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {feedbackLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                                        {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Feedback Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGeneralFeedbackModal(true)}
                className="fixed bottom-6 right-6 z-40 bg-white text-primary p-4 rounded-full shadow-lg border border-primary/10 hover:shadow-xl transition-all flex items-center gap-2"
            >
                <span className="font-medium text-sm hidden sm:inline-block">Feedback</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </motion.button>

            {/* General Feedback Modal */}
            <AnimatePresence>
                {showGeneralFeedbackModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowGeneralFeedbackModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 md:p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-serif text-primary">Help us improve</h2>
                                    <button
                                        onClick={() => setShowGeneralFeedbackModal(false)}
                                        className="p-2 hover:bg-secondary/10 rounded-full transition-colors"
                                    >
                                        <X className="w-6 h-6 text-secondary" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsGeneralDropdownOpen(!isGeneralDropdownOpen)}
                                                className="w-full p-4 bg-background border border-primary/20 rounded-xl text-foreground text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
                                            >
                                                <span className={!generalFeedback.category ? "text-secondary/60" : ""}>
                                                    {generalFeedback.category || "Select a category"}
                                                </span>
                                                <svg className={`w-4 h-4 text-secondary/50 transition-transform ${isGeneralDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            <AnimatePresence>
                                                {isGeneralDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="absolute z-10 w-full mt-2 bg-white border border-primary/10 rounded-xl shadow-lg overflow-hidden"
                                                    >
                                                        {['Bug Report', 'Feature Request', 'General Comment', 'Other'].map((cat) => (
                                                            <button
                                                                key={cat}
                                                                onClick={() => {
                                                                    setGeneralFeedback({ ...generalFeedback, category: cat });
                                                                    setIsGeneralDropdownOpen(false);
                                                                }}
                                                                className="w-full px-4 py-3 text-left hover:bg-secondary/5 transition-colors text-foreground"
                                                            >
                                                                {cat}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Comments</label>
                                        <textarea
                                            value={generalFeedback.comment}
                                            onChange={(e) => setGeneralFeedback({ ...generalFeedback, comment: e.target.value })}
                                            className="w-full p-4 bg-background border border-primary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans min-h-[120px]"
                                            placeholder="Tell us what you think..."
                                        />
                                    </div>

                                    <button
                                        onClick={submitGeneralFeedback}
                                        disabled={!generalFeedback.category || !generalFeedback.comment || generalFeedbackLoading}
                                        className="w-full py-4 bg-primary text-white font-medium text-lg rounded-xl hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                                    >
                                        {generalFeedbackLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            'Submit Feedback'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Result State Footer (Desktop) */}

        </div>
    );
}

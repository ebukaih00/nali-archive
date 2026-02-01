'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { Search, Play, Volume2, ThumbsUp, ThumbsDown, X, Loader2, Plus, Copy, Check, Info, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { tribes } from '../lib/tribes';
import { trackEvent } from '../lib/analytics';

interface NameEntry {
    id: number;
    name: string;
    origin_country: string;
    meaning: string;
    phonetic_hint: string;
    origin: string; // Renamed from language
    voice_id?: string;
}

export default function HeroSearch({ popularNames = [] }: { popularNames?: string[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('search') || searchParams.get('name') || '';
    const [query, setQuery] = useState(initialQuery);
    const [result, setResult] = useState<NameEntry | null>(null);
    const [searching, setSearching] = useState(false);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [suggestions, setSuggestions] = useState<NameEntry[]>([]);
    const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [copied, setCopied] = useState(false);
    const [liked, setLiked] = useState(false);

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
    const [generalFeedback, setGeneralFeedback] = useState({ category: '', comment: '', userName: '' });
    const [generalFeedbackLoading, setGeneralFeedbackLoading] = useState(false);
    const [isGeneralDropdownOpen, setIsGeneralDropdownOpen] = useState(false);

    // Basic sanitization
    const sanitizeInput = (text: string) => text.replace(/<[^>]*>?/gm, '').trim();

    const submitGeneralFeedback = async () => {
        if (!generalFeedback.category || !generalFeedback.comment) return;

        setGeneralFeedbackLoading(true);
        try {
            const { error } = await supabase.from('feedback').insert({
                category: sanitizeInput(generalFeedback.category),
                comment: sanitizeInput(generalFeedback.comment),
                user_name: generalFeedback.userName ? sanitizeInput(generalFeedback.userName) : null,
                name_id: null
            });

            if (error) throw error;

            setGeneralFeedback({ category: '', comment: '', userName: '' });
            setShowGeneralFeedbackModal(false);
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
        setSuggestions([]);
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
                origin_country: 'Nigeria', // Default
                status: 'pending',
                is_community_contributed: true
            }).select().single();

            if (error) throw error;

            // Trigger AI processing
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
            }, 3000);
        } catch (err) {
            console.error('Error submitting name:', JSON.stringify(err, null, 2));
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
                name: result.name,
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
        router.push('/', { scroll: false });
    };

    const filteredTribesList = contribution.origin ? tribes.filter(tribe =>
        tribe.toLowerCase().includes(contribution.origin.toLowerCase())
    ) : [];

    const normalize = (text: string) =>
        text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // Optimized Search: Fetch suggestions from DB with debouncing
    useEffect(() => {
        if (!query || result) {
            setSuggestions([]);
            return;
        }

        const handler = setTimeout(async () => {
            setFetchingSuggestions(true);
            try {
                const { data, error } = await supabase
                    .from('names')
                    .select('id, name, origin, meaning, phonetic_hint, origin_country')
                    .eq('ignored', false)
                    .ilike('name', `${query}%`)
                    .limit(8);

                if (error) throw error;
                setSuggestions(data || []);
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setFetchingSuggestions(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(handler);
    }, [query, result]);


    const handleSearch = async (input?: NameEntry | string) => {
        setSearching(true);
        setSuggestions([]);
        setShowFeedbackForm(false);

        let target: NameEntry | null = null;

        if (input && typeof input === 'object') {
            target = input;
        } else {
            const searchTerm = typeof input === 'string' ? input : query;
            if (searchTerm.trim() !== '') {
                // Try to find exact match in DB
                const { data } = await supabase
                    .from('names')
                    .select('*')
                    .eq('ignored', false)
                    .ilike('name', searchTerm.trim())
                    .maybeSingle();
                target = data;
            }
        }

        if (target) {
            setResult(target);
            setQuery(target.name);
            router.push(`/?search=${encodeURIComponent(target.name)}`, { scroll: false });

            // Track successful search
            trackEvent('search', {
                search_term: target.name,
                origin: target.origin
            });
        } else {
            // Track search with no direct match (could be useful for identifying missing names)
            const term = typeof input === 'string' ? input : query;
            if (term.trim()) {
                trackEvent('search_no_match', { search_term: term.trim() });
            }
        }
        setSearching(false);
    };

    // Auto-search if query is pre-filled from URL
    useEffect(() => {
        if (query && !result) {
            handleSearch();
        }
    }, []); // Only on mount

    // ... (rest of functions)

    // Scroll down to result when it appears
    useEffect(() => {
        if (result) {
            // We do not scroll automatically anymore per user preference for separate page feel, 
            // but keeping structure clean. The 'gap' is handled via CSS.
        }
    }, [result]);

    const handleShare = async () => {
        if (!result) return;
        const shareData = {
            title: `${result.name} | Nigerian Names`,
            text: `Hello! Learn the pronunciation of the name "${result.name}" on Nali.`,
            url: `${window.location.origin}/?search=${encodeURIComponent(result.name)}`
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                trackEvent('share_name', { name: result.name, method: 'native' });
            } else {
                await navigator.clipboard.writeText(shareData.url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                trackEvent('share_name', { name: result.name, method: 'clipboard' });
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

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

            // Track audio play
            trackEvent('play_name', {
                name: result.name,
                name_id: result.id,
                origin: result.origin
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

    return (
        <div className="w-full max-w-[680px] mx-auto flex flex-col items-center relative z-20">
            {/* Search Section */}
            <div className="w-full relative">
                <div className="relative isolate group z-50">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                        {fetchingSuggestions ? (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        ) : (
                            <Search className="w-5 h-5 text-secondary group-focus-within:text-primary transition-colors" />
                        )}
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (result) setResult(null);
                        }}
                        onFocus={(e) => {
                            // Only scroll on mobile to avoid jarring desktop experience
                            if (window.innerWidth < 768) {
                                const target = e.target;
                                setTimeout(() => {
                                    const rect = target.getBoundingClientRect();
                                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                                    const targetY = rect.top + scrollTop - 20;
                                    window.scrollTo({ top: targetY, behavior: 'smooth' });
                                }, 400);
                            }
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Enter a name to hear it..."
                        className="w-full pl-12 pr-14 py-4 text-lg bg-white border border-primary/20 rounded-xl focus:outline-none focus:border-primary transition-all placeholder:text-secondary/50 text-foreground font-sans shadow-sm"
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
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-secondary/10 overflow-hidden z-50 origin-top max-h-[220px] md:max-h-[300px] overflow-y-auto"
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
            </div>

            {/* Popular Searches */}
            {!query && !result && popularNames.length > 0 && (
                <div className="mt-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-500 w-full">
                    <p className="text-[#8D6E63]/70 text-xs mb-3 font-medium uppercase tracking-wider">Popular searches</p>
                    <div className="flex flex-wrap justify-center gap-3 w-full max-w-2xl mx-auto px-4">
                        {popularNames.map((name) => (
                            <button
                                key={name}
                                onClick={() => {
                                    setQuery(name);
                                    handleSearch(name);
                                }}
                                className="px-5 py-2.5 bg-[#F3EFEC] hover:bg-[#EBE5E0] text-[#5D4037] text-sm font-medium rounded-full transition-all border border-[#E9E4DE] hover:border-[#D7CCC8] hover:shadow-sm whitespace-nowrap"
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Name Pronunciation Card */}
            <AnimatePresence mode="wait">
                {result && (
                    <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="w-full bg-white rounded-2xl border border-[#E9E4DE] overflow-hidden mt-8 shadow-none"
                    >
                        {/* Main Card Content */}
                        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-left">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#F3EFEC] text-[#5D4037] uppercase tracking-wider">
                                        {result.origin}
                                    </span>
                                    <button
                                        onClick={handleShare}
                                        className="p-1 px-2 text-[#4e3629]/40 hover:text-[#4e3629] transition-colors rounded hover:bg-[#F3EFEC] flex items-center gap-1.5 group/share"
                                        title="Copy link"
                                    >
                                        <LinkIcon className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover/share:opacity-100 transition-opacity">
                                            {copied ? 'Copied' : 'Link'}
                                        </span>
                                    </button>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-serif text-[#4e3629] mb-4 leading-tight break-words">
                                    {result.name}
                                </h2>

                                <div className="flex items-center gap-4 mt-2">
                                    <div className="inline-flex items-center gap-3 px-4 py-3 bg-[#F8F6F4] rounded-lg border border-[#E9E4DE] group/hint">
                                        <span className="text-lg md:text-xl text-[#4e3629] font-sans">
                                            {result.phonetic_hint || result.name}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(result.phonetic_hint || "");
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className="ml-2 text-[#4e3629] hover:text-[#4e3629] transition-colors"
                                            title="Copy pronunciation"
                                        >
                                            {copied ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Mobile Play Button */}
                                    <button
                                        onClick={playAudio}
                                        disabled={audioPlaying}
                                        className="md:hidden flex-shrink-0 w-16 h-16 rounded-full bg-[#F3EFEC] flex items-center justify-center hover:bg-[#4e3629] transition-all duration-300 active:scale-95 border border-[#E9E4DE] group/play"
                                    >
                                        {audioPlaying ? (
                                            <Loader2 className="w-6 h-6 text-[#4e3629] group-hover/play:text-white animate-spin" />
                                        ) : (
                                            <Play className="w-7 h-7 text-[#5D4037] fill-[#5D4037] ml-1 group-hover/play:text-white group-hover/play:fill-white transition-colors" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Desktop Play Button */}
                            <button
                                onClick={playAudio}
                                disabled={audioPlaying}
                                className="hidden md:flex flex-shrink-0 w-20 h-20 rounded-full bg-[#F3EFEC] flex items-center justify-center hover:bg-[#4e3629] transition-all duration-300 active:scale-95 border border-[#E9E4DE] group/play"
                            >
                                {audioPlaying ? (
                                    <Loader2 className="w-8 h-8 text-[#4e3629] group-hover/play:text-white animate-spin" />
                                ) : (
                                    <Play className="w-8 h-8 text-[#5D4037] fill-[#5D4037] ml-1 group-hover/play:text-white group-hover/play:fill-white transition-colors" />
                                )}
                            </button>
                        </div>

                        {/* Feedback Section */}
                        <div
                            className="border-t border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                            style={{ backgroundColor: 'color-mix(in oklab, var(--background) 30%, transparent)' }}
                        >
                            <p className="text-[#4e3629] font-medium text-base text-left">Was this pronunciation helpful?</p>
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
                                    className={`flex-1 sm:flex-none sm:w-24 py-3.5 border rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium ${liked ? 'bg-[#4e3629] text-white border-[#4e3629]' : 'bg-white border-[#8D6E63] text-[#4e3629] hover:bg-[#F3EFEC]'}`}
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
                                    className={`flex-1 sm:flex-none sm:w-24 py-3.5 border rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium ${showFeedbackForm ? 'bg-[#4e3629] text-white border-[#4e3629]' : 'bg-white border-[#8D6E63] text-[#4e3629] hover:bg-[#F3EFEC]'}`}
                                >
                                    <ThumbsDown className="w-4 h-4" /> No
                                </button>
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
                                    <div className="space-y-5 text-left">
                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">Name</label>
                                            <input
                                                type="text"
                                                value={contribution.name}
                                                onChange={(e) => setContribution({ ...contribution, name: e.target.value })}
                                                className="w-full p-4 bg-background border border-primary/20 rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-serif text-lg"
                                                placeholder="Name"
                                                disabled={submissionLoading}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">Phonetic Sound</label>
                                            <input
                                                type="text"
                                                value={contribution.phonetic}
                                                onChange={(e) => setContribution({ ...contribution, phonetic: e.target.value })}
                                                className="w-full p-4 bg-background border border-primary/20 rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
                                                placeholder="e.g. CHEE-dee-buh-reh"
                                                disabled={submissionLoading}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">Tribe / Origin</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={contribution.origin}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setContribution({ ...contribution, origin: val });
                                                        setIsOriginDropdownOpen(val.length > 0);
                                                    }}
                                                    onFocus={(e) => {
                                                        if (contribution.origin.length > 0) setIsOriginDropdownOpen(true);
                                                        // Scroll into view to prevent keyboard covering
                                                        setTimeout(() => {
                                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                        }, 300);
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => setIsOriginDropdownOpen(false), 200);
                                                    }}
                                                    className="w-full p-4 bg-background border border-primary/20 rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-sans"
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
                                                            {filteredTribesList.length > 0 ? (
                                                                filteredTribesList.map((tribe) => (
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
                                                                ))
                                                            ) : (
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
                        className="w-full mt-4 bg-white rounded-2xl border border-primary/20"
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
                                <div className="space-y-6 text-left">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-foreground mb-2">What went wrong?</label>
                                        <button
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
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
                                                    {["Incorrect pronunciation", "Incorrect spelling", "Incorrect origin", "Other"].map((option) => (
                                                        <button
                                                            key={option}
                                                            onClick={() => {
                                                                setFeedbackCategory(option);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-[#F3EFEC] transition-colors font-sans"
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
                                        <label className="block text-sm font-medium text-primary mb-2 text-left">Category</label>
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

                                    {generalFeedback.category === 'General Comment' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="overflow-hidden"
                                        >
                                            <label className="block text-sm font-medium text-foreground mb-2 text-left">
                                                Your Name <span className="text-secondary/40 font-normal">(Optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={generalFeedback.userName}
                                                onChange={(e) => setGeneralFeedback({ ...generalFeedback, userName: e.target.value })}
                                                className="w-full p-4 bg-background border border-primary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-secondary/40 font-sans text-sm"
                                                placeholder="e.g. Ebuka"
                                            />
                                        </motion.div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2 text-left">Comments</label>
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
        </div >
    );
}


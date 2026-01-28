'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { tribes } from '@/lib/tribes';
import { Loader2, Mic, Square, Play, Check, AlertCircle, Plus, Trash2, Search, ChevronDown, ChevronUp, X, HandHeart, Speech } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface LanguageRow {
    id: string;
    language: string;
    fluency: string;
}

// Sub-component for individual Language Row to manage its own search state
const LanguageRowItem = ({
    row,
    index,
    updateRow,
    removeRow,
    isRemovable
}: {
    row: LanguageRow,
    index: number,
    updateRow: (id: string, field: 'language' | 'fluency', value: string) => void,
    removeRow: (id: string) => void,
    isRemovable: boolean
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFluencyOpen, setIsFluencyOpen] = useState(false);
    const [query, setQuery] = useState(row.language);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const fluencyRef = useRef<HTMLDivElement>(null);

    // Sync query if parent state changes externally (optional, but good practice)
    useEffect(() => {
        setQuery(row.language);
    }, [row.language]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // Close Language Dropdown
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
            // Close Fluency Dropdown
            if (fluencyRef.current && !fluencyRef.current.contains(event.target as Node)) {
                setIsFluencyOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef, fluencyRef]);

    const filteredTribes = tribes.filter(t =>
        t.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col md:flex-row gap-4 items-end bg-[#f8f6f4] p-5 rounded-xl border border-[#E9E4DE] relative"
            style={{ zIndex: 50 - index }} // Ensure dropdowns stack correctly
        >
            {/* Searchable Language Input */}
            <div className="flex-1 w-full relative" ref={wrapperRef}>
                <label className="block text-sm font-medium text-[#4e3629] mb-2">Enter a language you speak</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <Search className="w-4 h-4 text-[#4e3629]/50" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                            // If cleared, clear parent and reset fluency
                            if (e.target.value === '') {
                                updateRow(row.id, 'language', '');
                                updateRow(row.id, 'fluency', '');
                            }
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder="Select Language..."
                        className="w-full pl-10 pr-10 py-3 bg-white border border-[#E9E4DE] rounded-xl focus:outline-none focus:border-[#4e3629] text-sm transition-all text-[#4e3629]"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#4e3629]/40">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-[#E9E4DE] overflow-hidden z-50 max-h-[240px] overflow-y-auto"
                        >
                            {filteredTribes.length > 0 ? (
                                filteredTribes.map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => {
                                            updateRow(row.id, 'language', t);
                                            setQuery(t);
                                            setIsOpen(false);
                                        }}
                                        className="w-full px-5 py-3 text-left hover:bg-[#f8f6f4] transition-colors border-b border-[#E9E4DE] last:border-0 text-sm text-[#4e3629]"
                                    >
                                        {t}
                                    </button>
                                ))
                            ) : (
                                <div className="px-5 py-3 text-sm text-secondary/60 italic">
                                    No matching languages found
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Fluency Custom Dropdown */}
            <div className="w-full md:w-1/3 relative" ref={fluencyRef}>
                <label className="block text-sm font-medium text-[#4e3629] mb-2">Fluency</label>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => row.language && setIsFluencyOpen(!isFluencyOpen)}
                        disabled={!row.language}
                        className={`w-full pl-4 pr-10 py-3 bg-white border border-[#E9E4DE] rounded-xl text-left text-sm text-[#4e3629] focus:outline-none focus:border-[#4e3629] transition-all relative ${!row.language ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}`}
                    >
                        <span className={!row.fluency ? 'text-[#4e3629]/50' : ''}>
                            {row.fluency || 'Select Level...'}
                        </span>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#4e3629]/40">
                            <ChevronDown className={`w-4 h-4 transition-transform ${isFluencyOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    <AnimatePresence>
                        {isFluencyOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-[#E9E4DE] overflow-hidden z-50 py-1"
                            >
                                {['Native', 'Fluent', 'Conversational'].map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => {
                                            updateRow(row.id, 'fluency', level);
                                            setIsFluencyOpen(false);
                                        }}
                                        className="w-full px-5 py-3 text-left hover:bg-[#f8f6f4] transition-colors text-sm text-[#4e3629]"
                                    >
                                        {level}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {isRemovable && (
                <div className="pb-1">
                    <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="p-3 text-[#4e3629]/50 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove language"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default function ContributorApplication() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                window.location.href = '/studio/library';
            } else {
                setCheckingAuth(false);
            }
        };
        checkAuth();
    }, []);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
    });

    const [languages, setLanguages] = useState<LanguageRow[]>([
        { id: '1', language: '', fluency: '' }
    ]);

    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    // Terms & Conditions States
    const [agreed, setAgreed] = useState(false);
    const [showTerms, setShowTerms] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const addLanguageRow = () => {
        setLanguages([...languages, { id: Date.now().toString(), language: '', fluency: '' }]);
    };

    const removeLanguageRow = (id: string) => {
        if (languages.length > 1) {
            setLanguages(languages.filter(l => l.id !== id));
        }
    };

    const updateLanguageRow = (id: string, field: 'language' | 'fluency', value: string) => {
        setLanguages(languages.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const startRecording = async () => {
        setErrorMessage('');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setErrorMessage("Audio recording is not supported in this browser. Please use a modern browser.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err: any) {
            console.error("Error accessing microphone:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setErrorMessage("Microphone permission denied. Please reset permissions in your browser settings and try again.");
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setErrorMessage("No microphone found on this device.");
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setErrorMessage("Microphone is in use by another application.");
            } else {
                setErrorMessage("Could not access microphone. If you are on mobile or a non-secure connection (HTTP), recording may be blocked.");
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const playRecording = () => {
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!agreed) {
            setErrorMessage("Please agree to the Terms & Conditions.");
            return;
        }

        if (!audioBlob) {
            setErrorMessage("Please record an audio sample.");
            return;
        }

        // Validate languages
        const validLanguages = languages.filter(l => l.language && l.fluency);
        if (validLanguages.length === 0) {
            setErrorMessage("Please add at least one language with fluency level.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            // 1. Upload Audio
            const fileName = `application_${Date.now()}_${formData.email.replace(/[^a-z0-9]/gi, '_')}.webm`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vetting_samples')
                .upload(fileName, audioBlob);

            if (uploadError) throw uploadError;

            // 2. Insert Application
            const { error: dbError } = await supabase
                .from('contributor_applications')
                .insert({
                    full_name: formData.fullName,
                    email: formData.email,
                    languages: validLanguages.map(l => ({ language: l.language, fluency: l.fluency })),
                    audio_sample_url: uploadData.path,
                    status: 'pending_review'
                });

            if (dbError) throw dbError;

            // Success! 
            // We no longer send the email automatically. 
            // The admin will review the application in Supabase and then trigger the invite.

            setSubmitStatus('success');
        } catch (err: any) {
            console.error("Submission error:", err);
            setErrorMessage(err.message || "An error occurred during submission. Please try again.");
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitStatus === 'success') {
        const handleEnterStudio = () => {
            window.location.href = '/studio/library';
        };

        return (
            <div className="min-h-screen bg-[#F8F7F5] flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-[#E9E4DE]"
                >
                    <div className="w-16 h-16 bg-[#F8F7F5] text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-serif text-[#4e3629] mb-4">Application Received!</h2>
                    <p className="text-secondary mb-8 leading-relaxed">
                        Thank you for applying! Your application has been received and is now under review.
                        <strong> We will send you an email with your access link </strong> once your application has been verified by our team.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link href="/" className="px-6 py-4 bg-[#4e3629] text-white rounded-xl font-medium hover:bg-[#3d2b21] transition-colors shadow-lg text-center">
                            Back to Home
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#F8F7F5] font-sans text-foreground">
            {/* HEADER */}
            <header className="w-full flex justify-between items-center py-6 px-6 md:px-12 max-w-7xl mx-auto">
                <Link href="/" className="text-3xl font-serif font-bold text-[#4e3629]">
                    Nali
                </Link>
                <div className="flex items-center gap-6">
                    <span className="text-secondary text-sm hidden md:inline">Already a member?</span>
                    <Link href="/login" className="px-5 py-2.5 rounded-full bg-white border border-[#E9E4DE] text-[#4e3629] text-sm font-medium hover:bg-[#F3EFEC] hover:border-[#D7CCC8] transition-colors">
                        Sign in
                    </Link>
                </div>
            </header>

            <div className="py-12 px-4 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl w-full bg-white rounded-2xl overflow-hidden border border-[#E9E4DE] shadow-none"
                >
                    <div className="bg-[#f8f6f4] p-8 border-b border-[#E9E4DE] text-center">
                        <div className="w-14 h-14 bg-[#EDE9E4] rounded-full flex items-center justify-center mx-auto mb-6 text-[#4e3629]">
                            <HandHeart className="w-7 h-7" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-serif text-[#4e3629] font-medium mb-3">Become a Contributor</h1>
                        <p className="text-[#4e3629]/80 font-medium">Help us preserve and correct African name pronunciations.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* Personal Info Group - INLINE */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-[#4e3629] border-b border-[#E9E4DE] pb-2">Personal Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-[#4e3629] mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full p-4 bg-[#F7F5F3] border border-[#E9E4DE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4e3629]/10 focus:border-[#4e3629] transition-all font-serif text-[#4e3629]"
                                        placeholder="e.g. Adebayo Ogunlesi"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#4e3629] mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full p-4 bg-[#F7F5F3] border border-[#E9E4DE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4e3629]/10 focus:border-[#4e3629] transition-all font-sans text-[#4e3629]"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Language Skills Group */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-[#E9E4DE] pb-2">
                                <h3 className="text-lg font-medium text-[#4e3629]">Language Proficiency</h3>
                            </div>

                            <div className="space-y-3">
                                <AnimatePresence>
                                    {languages.map((row, index) => (
                                        <LanguageRowItem
                                            key={row.id}
                                            row={row}
                                            index={index}
                                            updateRow={updateLanguageRow}
                                            removeRow={removeLanguageRow}
                                            isRemovable={languages.length > 1}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>

                            <button
                                type="button"
                                onClick={addLanguageRow}
                                className="flex items-center gap-2 text-sm font-medium text-[#4e3629] hover:text-[#3d2b21] transition-colors px-2 py-1"
                            >
                                <Plus className="w-4 h-4" />
                                Add Another Language
                            </button>
                        </div>

                        {/* Audio Recorder */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-[#4e3629]">Voice Sample Verification</label>
                            <div className="p-6 bg-[#f8f6f4] rounded-xl border border-[#E9E4DE] flex flex-col items-center gap-4">
                                <p className="text-secondary text-center text-sm mb-2">
                                    Please record <strong>one</strong> audio clip saying:<br />
                                    <span className="font-medium text-[#4e3629] text-base block mt-2">"My name is {formData.fullName || '[Name]'}. I am a native speaker of {languages.map(l => l.language).filter(Boolean).join(' / ') || '[Language]'} language, and I am committed to preserving the authentic sounds of our heritage."</span>
                                </p>

                                <div className="flex items-center gap-4">
                                    {!isRecording && !audioBlob && (
                                        <button
                                            type="button"
                                            onClick={startRecording}
                                            className="flex items-center gap-2 px-6 py-3 bg-[#4e3629] text-white rounded-full hover:bg-[#3d2b21] transition-colors"
                                        >
                                            <Mic className="w-5 h-5" />
                                            Start Recording
                                        </button>
                                    )}

                                    {isRecording && (
                                        <button
                                            type="button"
                                            onClick={stopRecording}
                                            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors animate-pulse"
                                        >
                                            <Square className="w-5 h-5" />
                                            Stop Recording
                                        </button>
                                    )}

                                    {audioBlob && !isRecording && (
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={playRecording}
                                                className="p-3 bg-[#4e3629]/10 text-[#4e3629] rounded-full hover:bg-[#4e3629]/20 transition-colors"
                                            >
                                                <Play className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAudioBlob(null);
                                                    setAudioUrl(null);
                                                }}
                                                className="text-sm text-red-500 hover:text-red-700 underline"
                                            >
                                                Retake
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {audioBlob && <p className="text-xs text-green-600 font-medium mt-1">✓ Audio captured</p>}
                            </div>
                        </div>

                        {/* Terms & Conditions */}
                        <div className="flex items-start gap-3">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    type="checkbox"
                                    required
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-[#4e3629] focus:ring-[#4e3629] accent-[#4e3629]"
                                />
                            </div>
                            <div className="text-sm">
                                <label htmlFor="terms" className="font-medium text-[#4e3629]">
                                    I agree to the <button type="button" onClick={() => setShowTerms(true)} className="underline hover:text-[#3d2b21] font-bold">Terms & Conditions</button> and confirm that I will provide accurate information.
                                </label>
                            </div>
                        </div>

                        {/* Error Message */}
                        {errorMessage && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {errorMessage}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !audioBlob || !agreed}
                            className="w-full py-4 bg-[#4e3629] text-white font-medium text-lg rounded-xl hover:bg-[#3d2b21] transition-colors shadow-lg shadow-[#4e3629]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Submitting Application...
                                </>
                            ) : (
                                'Submit Application'
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>

            {/* Terms Modal */}
            <AnimatePresence>
                {showTerms && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTerms(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden max-h-[60vh] flex flex-col"
                        >
                            <div className="p-6 md:p-8 border-b border-[#E9E4DE] flex justify-between items-center bg-[#f8f6f4]">
                                <h3 className="font-serif text-2xl font-medium text-[#4e3629]">Terms & Conditions</h3>
                                <button
                                    onClick={() => setShowTerms(false)}
                                    className="p-2 -mr-2 text-[#4e3629]/40 hover:text-[#4e3629] transition-colors rounded-full hover:bg-[#4e3629]/5"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 md:p-8 overflow-y-auto text-[#4e3629]/80 text-sm leading-relaxed space-y-4">
                                <p><strong>1. Introduction</strong><br />By applying to become a contributor for Nali, you agree to these terms regarding the collection, usage, and display of the data and media you provide.</p>

                                <p><strong>2. Data Collection & Usage</strong><br />We collect your name, email, and voice recordings ("Audio Samples"). This data is used for:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Verifying your proficiency in the selected languages.</li>
                                    <li>Reviewing and approving your contributor application.</li>
                                    <li>Improving our pronunciation database and training speech synthesis models to better represent African names.</li>
                                </ul>

                                <p><strong>3. Public Display</strong><br />Upon approval, the name pronunciations you contribute may be publicly displayed on the Nali platform, accessible to users worldwide giving you full credit as the speaker.</p>

                                <p><strong>4. Privacy</strong><br />Your email address will remain private and will only be used for communication regarding your application and contributions. We will never sell your personal contact information.</p>

                                <p><strong>5. Intellectual Property</strong><br />By submitting audio samples, you grant Nali a perpetual, non-exclusive, royalty-free license to use, reproduce, and distribute these recordings for the purposes of education and heritage preservation.</p>

                                <p><strong>6. Contact</strong><br />If you have questions about these terms, please contact our support team.</p>
                            </div>

                            <div className="p-6 border-t border-[#E9E4DE] flex justify-end">
                                <button
                                    onClick={() => {
                                        setAgreed(true);
                                        setShowTerms(false);
                                    }}
                                    className="px-6 py-3 bg-[#4e3629] text-white rounded-xl font-medium hover:bg-[#3d2b21] transition-colors"
                                >
                                    I Agree
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
}

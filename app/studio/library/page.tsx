'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
// import { useRouter } from 'next/navigation'; // Not currently used
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle2, ChevronLeft, Pencil, List, Mic, Square, RotateCcw, X, Loader2, LogOut, RefreshCcw, PartyPopper, Ban, Volume2 } from 'lucide-react';
import { getPendingBatches, claimBatch as claimBatchAction, submitReview, updateSubmission, releaseLocks, resetSubmission, ignoreName, type BatchCard, type Task } from '../actions';
import confetti from 'canvas-confetti';

export default function DashboardPage() {
    // --- State ---
    const [view, setView] = useState<'library' | 'focus' | 'summary'>('library');
    const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
    const [lockExpiry, setLockExpiry] = useState<number | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    // Visibility Management
    // We keep completed tasks in 'tasks' but mark them as 'vanishing' to show the undo state.
    // 'hiddenIds' are completely removed from view (passed the 5s window).
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    const [vanishingTimers, setVanishingTimers] = useState<Record<string, NodeJS.Timeout>>({});

    // Edit Mode State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ phonetic: '', audioBlob: null as Blob | null });
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

    // Language Groups
    const [languageGroups, setLanguageGroups] = useState<Record<string, BatchCard[]>>({});

    // Derived State
    const totalTasks = tasks.length;
    // Completed = Approved/Edited/Rejected AND potentially hidden
    // We count anything not pending as "done" for progress, regardless of visibility
    const completedCount = tasks.filter(t => t.status !== 'pending').length;

    // Visible Tasks: Not in hiddenIds
    const visibleTasks = tasks.filter(t => !hiddenIds.has(t.id));

    // --- Init ---
    useEffect(() => {
        loadBatches();
    }, []);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            Object.values(vanishingTimers).forEach(clearTimeout);
        };
    }, [vanishingTimers]);

    // Auto-trigger celebration when all tasks are done
    useEffect(() => {
        if (totalTasks > 0 && completedCount === totalTasks && !showCelebration && view === 'focus') {
            setShowCelebration(true);
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#4e3629', '#EDE9E4', '#F06A6A', '#ffffff']
            });
        }
    }, [completedCount, totalTasks, showCelebration, view]);

    const loadBatches = async () => {
        setIsLoading(true);
        try {
            const groups = await getPendingBatches();
            setLanguageGroups(groups);

            const lockedBatch = Object.values(groups).flat().find(batch => batch.isLockedByMe);

            if (lockedBatch) {
                await handleClaimBatch(lockedBatch.language);
            }
        } catch (error) {
            console.error("Failed to load batches", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Actions ---

    const handleClaimBatch = async (language: string) => {
        setIsLoading(true);
        try {
            const { tasks: claimedTasks, expiry } = await claimBatchAction(language);
            setTasks(claimedTasks);
            setHiddenIds(new Set()); // Reset hidden
            setLockExpiry(expiry);
            setActiveBatchId(`active-${language}`);
            setView('focus');
        } catch (error) {
            console.error("Failed to claim batch", error);
            alert("Could not claim batch. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const scheduleVanish = (id: string) => {
        // clear existing if any
        if (vanishingTimers[id]) clearTimeout(vanishingTimers[id]);

        const timer = setTimeout(() => {
            setHiddenIds(prev => new Set(prev).add(id));
            setVanishingTimers(prev => {
                const newTimers = { ...prev };
                delete newTimers[id];
                return newTimers;
            });
        }, 5000);

        setVanishingTimers(prev => ({ ...prev, [id]: timer }));
    };

    const cancelVanish = (id: string) => {
        if (vanishingTimers[id]) {
            clearTimeout(vanishingTimers[id]);
            setVanishingTimers(prev => {
                const newTimers = { ...prev };
                delete newTimers[id];
                return newTimers;
            });
        }
    };

    const handleApprove = async (id: string) => {
        // Optimistic UI
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'approved' } : t));
        scheduleVanish(id);

        try {
            await submitReview(id, 'approved');
            // Continuous Play: Play next pending task after small delay
            const nextTask = tasks.find(t => t.id !== id && t.status === 'pending');
            if (nextTask?.audioUrl) {
                setTimeout(() => playAudio(nextTask.audioUrl), 500);
            }
        } catch (error) {
            console.error("Failed to approve", error);
            cancelVanish(id);
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' } : t));
        }
    };

    const handleIgnore = async (id: string) => {
        // Optimistic UI
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'rejected' } : t));
        scheduleVanish(id);

        try {
            await ignoreName(id);
        } catch (error) {
            console.error("Failed to ignore", error);
            cancelVanish(id);
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' } : t));
        }
    };

    const handleUndo = async (id: string) => {
        cancelVanish(id);
        // Optimistic Revert
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' } : t));

        try {
            // New action to reset
            await resetSubmission(id);
        } catch (error) {
            console.error("Failed to undo", error);
            // Revert the revert? Complexity... let's just alert for now or implement robust sync
        }
    };

    const startEditing = (task: Task) => {
        cancelVanish(task.id); // If it was vanishing (e.g. from 'Edited' state), stop it so we can re-edit
        setEditingId(task.id);
        setEditForm({ phonetic: task.phonetic_hint || '', audioBlob: null });
        setIsRecording(false);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditForm({ phonetic: '', audioBlob: null });
        setIsRecording(false);
        stopRecording();

        // If the task was already edited/approved, should we resume vanish?
        // Logic: If I click "Edit Again" on a vanishing card, I am interrupting logic.
        // If I cancel, I should probably re-schedule vanish if status is not pending.
        const task = tasks.find(t => t.id === editingId);
        if (task && task.status !== 'pending') {
            scheduleVanish(task.id);
        }
    };

    const saveEdit = async (id: string) => {
        // Optimistic
        setTasks(prev => prev.map(t => t.id === id ? {
            ...t,
            phonetic_hint: editForm.phonetic,
            status: 'edited'
        } : t));
        setEditingId(null);
        scheduleVanish(id);

        try {
            const formData = new FormData();
            formData.append('phonetic', editForm.phonetic);
            if (editForm.audioBlob) {
                formData.append('audio', editForm.audioBlob, 'recording.webm');
            }
            const task = tasks.find(t => t.id === id);
            if (task?.isDirectName) {
                formData.append('isDirectName', 'true');
            }
            await updateSubmission(id, formData);
            // Continuous Play
            const nextTask = tasks.find(t => t.id !== id && t.status === 'pending');
            if (nextTask?.audioUrl) {
                setTimeout(() => playAudio(nextTask.audioUrl), 500);
            }
        } catch (error) {
            console.error("Failed to save edit", error);
            cancelVanish(id);
            // Revert?
        }
    };

    const handleReset = async (id: string) => {
        // Reset to default (Undo edits)
        cancelVanish(id);
        setEditingId(null); // Exit edit mode if in it

        setTasks(prev => prev.map(t => t.id === id ? {
            ...t,
            status: 'pending',
            phonetic_hint: t.original_phonetics || ''
        } : t));

        try {
            await resetSubmission(id);
        } catch (error) {
            console.error("Failed to reset", error);
        }
    };

    // Recording Logic
    const toggleRecording = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setEditForm(prev => ({ ...prev, audioBlob: blob }));
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            setMediaRecorder(null);
        }
    };

    const playRecordedAudio = () => {
        if (editForm.audioBlob) {
            const url = URL.createObjectURL(editForm.audioBlob);
            const audio = new Audio(url);
            audio.play().catch(e => console.error("Playback error", e));
        }
    };

    // Play Audio
    const playAudio = (url?: string) => {
        if (!url) return;
        // Cache bust to ensure we get re-generated audio after tuning
        const buster = url.includes('?') ? `&v=${Date.now()}` : `?v=${Date.now()}`;
        const audio = new Audio(url + buster);
        audio.play().catch(e => console.error("Play error", e));
    };

    const handleExitBatch = async () => {
        // Just release locks and go to summary/library.
        // No "Submit" needed as items are synced one-by-one.
        try {
            await releaseLocks();
            setActiveBatchId(null);
            setLockExpiry(null);
            setView('summary');
            loadBatches();
        } catch (error) {
            console.error("Error exiting batch", error);
        }
    };

    const handleExit = async () => {
        // Confirmation if not finished? User said "Refined Exit: simple 'Close Batch'".
        // Maybe we just close it.
        await handleExitBatch();
    };

    // --- Views ---

    if (view === 'summary') {
        return (
            <div className="min-h-screen bg-[#F8F7F5] flex flex-col items-center justify-center p-6 text-center font-serif">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-4xl text-[#2C2420] mb-4">Session Closed</h2>
                <p className="text-[#4e3629]/60 font-sans text-lg mb-8 max-w-md mx-auto">
                    You've contributed to {completedCount} names this session.
                </p>
                <button
                    onClick={() => setView('library')}
                    className="px-8 py-3 bg-[#4e3629] text-white rounded-full font-sans font-medium hover:bg-[#3d2b21] transition-colors shadow-lg active:scale-95"
                >
                    Return to Library
                </button>
            </div>
        );
    }

    if (view === 'focus') {
        return (
            <main className="min-h-screen bg-[#F8F7F5] font-serif">
                {/* Sticky Header */}
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E9E4DE] px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={handleExit}
                            className="text-[#4e3629]/60 hover:text-[#4e3629] flex items-center gap-2 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            <span className="font-sans text-sm font-medium hidden md:inline">Library</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-sans text-[#4e3629]/60 uppercase tracking-wider mb-1 hidden md:block">Progress</span>
                            <div className="flex items-center gap-2 md:gap-3">
                                <span className="text-sm font-sans font-bold text-[#4e3629]">{completedCount}/{totalTasks}</span>
                                <div className="w-16 md:w-32 h-2 bg-[#E9E4DE] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#4e3629] transition-all duration-500 ease-out"
                                        style={{ width: `${(completedCount / Math.max(totalTasks, 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleExit}
                            className="px-6 py-2 bg-[#4e3629] text-white rounded-full text-sm font-sans font-medium transition-all shadow-lg active:scale-95 hover:bg-[#3d2b21]"
                        >
                            {completedCount === totalTasks ? 'Finish' : 'Exit Batch'}
                        </button>
                    </div>
                </header>

                <AnimatePresence>
                    {showCelebration && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#F8F7F5]/80 backdrop-blur-sm"
                        >
                            <div className="bg-white rounded-[32px] p-10 md:p-16 border border-[#E9E4DE] shadow-2xl text-center max-w-xl">
                                <div className="w-20 h-20 bg-[#EDE9E4] rounded-full flex items-center justify-center mx-auto mb-8 text-[#4e3629]">
                                    <PartyPopper className="w-10 h-10" />
                                </div>
                                <h2 className="text-4xl md:text-5xl font-serif text-[#2C2420] mb-4">Batch Complete!</h2>
                                <p className="text-[#4e3629] text-lg font-sans mb-10 leading-relaxed">
                                    Amazing work! You've successfully verified all names in this batch. Your contributions are helping preserve our culture.
                                </p>
                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={handleExitBatch}
                                        className="px-8 py-4 bg-[#4e3629] text-white rounded-full font-sans font-bold text-lg hover:bg-[#3d2b21] transition-all shadow-xl active:scale-95"
                                    >
                                        Finish & Return
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="max-w-4xl mx-auto p-6 pb-32">
                    <div className="mb-8 pl-2">
                        <h1 className="text-3xl font-serif text-[#2C2420] mb-2">
                            Review & Verify
                        </h1>
                        <p className="text-[#4e3629] font-sans text-sm md:text-base">
                            Listen to names and update the pronunciation as needed. Your changes are saved as you verify or edit them.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <AnimatePresence>
                            {visibleTasks.map((task) => (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`bg-white rounded-xl border ${task.status === 'approved' || task.status === 'edited'
                                        ? 'border-[#4e3629]/20 bg-[#4e3629]/5'
                                        : 'border-[#E9E4DE] hover:border-[#4e3629]'
                                        } shadow-sm transition-colors overflow-hidden`}
                                >
                                    {editingId === task.id ? (
                                        // --- EDIT MODE ---
                                        <div className="p-5 flex flex-col gap-4 bg-white">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-sm font-sans font-bold text-[#4e3629]/60 uppercase tracking-widest mb-1">Edit Name</h3>
                                                    <h2 className="text-2xl font-serif text-[#2C2420]">{task.name}</h2>
                                                </div>
                                                <button onClick={cancelEditing} className="p-1 hover:bg-[#E9E4DE] rounded-full"><X className="w-4 h-4 text-[#4e3629]" /></button>
                                            </div>

                                            <div className="flex gap-4 items-end">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-sans font-bold text-[#4e3629]/40 mb-1.5 uppercase tracking-wider">
                                                        Pronunciation
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editForm.phonetic}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, phonetic: e.target.value }))}
                                                        placeholder="Enter phonetic spelling..."
                                                        className="w-full p-3 rounded-lg border border-[#E9E4DE] font-serif text-lg text-[#2C2420] focus:ring-2 focus:ring-[#4e3629]/20 outline-none"
                                                    />
                                                </div>

                                                <div className="flex flex-col items-center gap-2">
                                                    {!editForm.audioBlob && !isRecording && (
                                                        <span className="text-[10px] font-sans font-bold text-[#4e3629]/40 uppercase tracking-widest animate-pulse">
                                                            Record
                                                        </span>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={toggleRecording}
                                                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm ${isRecording
                                                                ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-100'
                                                                : editForm.audioBlob
                                                                    ? 'bg-[#E9E4DE] text-[#4e3629]'
                                                                    : 'bg-white border-2 border-[#4e3629] text-[#4e3629] ring-4 ring-[#4e3629]/5'
                                                                }`}
                                                        >
                                                            {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                                                        </button>
                                                        {editForm.audioBlob && !isRecording && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={playRecordedAudio}
                                                                    className="p-2 bg-[#4e3629] text-white rounded-full hover:bg-[#3d2b21] transition-colors shadow-sm"
                                                                    title="Play recording"
                                                                >
                                                                    <Play className="w-3 h-3 ml-0.5" />
                                                                </button>
                                                                <div className="text-xs font-sans text-[#4e3629] font-medium px-2 py-1 bg-[#E9E4DE] rounded">Recorded</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between gap-3 pt-2">
                                                <div className="flex-1" />

                                                <div className="flex gap-2">
                                                    <button onClick={cancelEditing} className="px-4 py-2 text-sm font-sans font-medium text-[#4e3629] hover:bg-[#E9E4DE] rounded-lg transition-colors">Cancel</button>
                                                    <button
                                                        onClick={() => saveEdit(task.id)}
                                                        className="px-6 py-2 bg-[#4e3629] text-white text-sm font-sans font-medium rounded-lg hover:bg-[#3d2b21] transition-colors shadow-md"
                                                    >
                                                        Submit
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // --- NORMAL MODE ---
                                        <div className="p-5 flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 text-[#2C2420]">
                                                    <h3 className="text-xl font-serif">
                                                        {task.name}
                                                    </h3>
                                                    {task.audioUrl && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const audio = new Audio(task.audioUrl);
                                                                audio.play();
                                                            }}
                                                            className="p-1.5 rounded-lg bg-[#F8F7F5] text-[#4e3629]/70 hover:text-[#4e3629] hover:bg-[#E9E4DE] transition-colors border border-[#E9E4DE]"
                                                            title="Listen"
                                                        >
                                                            <Volume2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Status Indicators & Actions */}
                                                {(task.status === 'approved' || task.status === 'edited' || task.status === 'rejected') && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleUndo(task.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-sans font-bold text-[#4e3629]/60 hover:text-[#4e3629] transition-colors"
                                                            title="Undo"
                                                        >
                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                            Undo
                                                        </button>
                                                    </div>
                                                )}

                                                {task.status === 'pending' || task.status === 'approved' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleIgnore(task.id)}
                                                            className="p-3 rounded-xl border border-red-100 text-red-100/10 text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                            title="Ignore / Skip"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => startEditing(task)}
                                                            className="p-3 rounded-xl border border-[#E9E4DE] text-[#4e3629]/70 hover:text-[#4e3629] hover:bg-[#F3EFEC] transition-colors"
                                                            title="Edit / Record"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(task.id)}
                                                            className="px-4 py-2 bg-transparent border border-[#4e3629]/20 text-[#4e3629] rounded-xl hover:bg-[#4e3629]/5 font-sans text-sm font-medium transition-colors flex items-center gap-2"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" /> Approve
                                                        </button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        );
    }

    // --- LIBRARY VIEW ---
    return (
        <main className="min-h-screen bg-[#F8F7F5] p-6 md:p-12 font-serif">
            <header className="max-w-5xl mx-auto mb-16">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-sans font-bold bg-[#E9E4DE] text-[#5D4037] uppercase tracking-wider mb-4">
                            Contributor Studio
                        </span>
                        <h1 className="text-4xl md:text-5xl text-[#2C2420] mb-4">The Library</h1>
                        <p className="text-[#4e3629] font-sans text-lg md:whitespace-nowrap">
                            Select a batch to verify. Batches are locked to you for 2 hours once claimed.
                        </p>
                    </div>

                </div>
            </header>

            <div className="max-w-5xl mx-auto space-y-12">
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#4e3629]/40" />
                    </div>
                ) : Object.keys(languageGroups).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-[#E9E4DE] rounded-full flex items-center justify-center mb-6">
                            <List className="w-8 h-8 text-[#4e3629]/40" />
                        </div>
                        <h3 className="text-2xl font-serif text-[#2C2420] mb-2">All Caught Up!</h3>
                        <p className="text-[#4e3629]/60 font-sans max-w-md">
                            There are no pending names to review at the moment. Great job! Check back later for new contributions.
                        </p>
                    </div>
                ) : (
                    Object.entries(languageGroups).map(([language, batches]) => (
                        <section key={language}>
                            <div className="flex items-center gap-4 mb-6 border-b border-[#E9E4DE] pb-4">
                                <h2 className="text-2xl font-serif text-[#2C2420]">{language} Batches</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {batches.map(batch => (
                                    <button
                                        key={batch.id}
                                        onClick={() => handleClaimBatch(batch.language)}
                                        className={`bg-white p-6 rounded-2xl border ${batch.isLockedByMe ? 'border-orange-300 ring-2 ring-orange-100' : 'border-[#E9E4DE] hover:border-[#4e3629]'} hover:shadow-xl hover:shadow-[#4e3629]/5 hover:bg-[#F9F8F7] transition-all duration-300 text-left group relative overflow-hidden w-full`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-2 rounded-lg bg-[#F8F7F5] text-[#4e3629] group-hover:bg-[#4e3629] group-hover:text-white transition-colors">
                                                <List className="w-5 h-5" />
                                            </div>
                                            <span className="text-xs font-sans font-bold text-[#4e3629]/40 bg-[#F8F7F5] px-2 py-1 rounded">
                                                {batch.count} Names
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-serif text-[#2C2420] mb-1">{batch.title}</h3>
                                        <p className="text-[#4e3629]/50 font-sans text-sm mb-6">
                                            {batch.isLockedByMe ? 'You have an active session.' : 'Unverified entries awaiting review.'}
                                        </p>

                                        <div className="flex items-center text-[#4e3629] font-medium text-sm group-hover:underline decoration-[#4e3629]/30">
                                            {batch.isLockedByMe ? 'Resume Review' : 'Claim & Start'} <ChevronLeft className="w-4 h-4 rotate-180 ml-1" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </div>
        </main>
    );
}





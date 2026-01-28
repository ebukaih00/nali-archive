'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export interface BatchCard {
    id: string;
    language: string;
    title: string;
    count: number;
    lockedBy: string | null;
    isLockedByMe: boolean;
}

export interface Task {
    id: string; // audio_submission id
    name: string;
    origin: string;
    meaning: string;
    audioUrl: string;
    phonetic_hint?: string;
    original_phonetics?: string; // Cache the published version for "Reset"
    status: 'pending' | 'approved' | 'rejected' | 'edited';
}

export async function getPendingBatches(): Promise<Record<string, BatchCard[]>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Logic: Fetch all pending audio submissions
    // In a real app with millions of rows, use a summary table or view. here we fetch id and origin.

    // We need to know language. Assuming join on names table.
    const { data, error } = await supabase
        .from('audio_submissions')
        .select(`
            id, 
            locked_by, 
            locked_at, 
            status,
            names!inner (origin)
        `)
        .eq('status', 'pending')
        .limit(2000);

    if (error) {
        console.error("Error fetching batches:", error);
        return {};
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).getTime();
    const groups: Record<string, typeof data> = {};

    data.forEach((item: any) => {
        // Filter out items locked by others (helper check)
        // If locked by someone else AND lock is valid (newer than 2 hours), skip counting it as "Available".
        // UNLESS it is locked by ME.
        const lockedAt = item.locked_at ? new Date(item.locked_at).getTime() : 0;
        const isLockedByOther = item.locked_by && item.locked_by !== user?.id && lockedAt > twoHoursAgo;

        console.log(`Debug Item: ID=${item.id}, LockedBy=${item.locked_by}, Me=${user?.id}, IsLockedByOther=${isLockedByOther}`);

        if (!isLockedByOther) {
            const lang = item.names?.origin || 'Uncategorized';
            if (!groups[lang]) groups[lang] = [];
            groups[lang].push(item);
        }
    });

    // Create batches of 50
    const result: Record<string, BatchCard[]> = {};

    Object.entries(groups).forEach(([lang, items]) => {
        const batchCount = Math.ceil(items.length / 50);
        const cards: BatchCard[] = [];

        for (let i = 0; i < batchCount; i++) {
            // Check if this chunk has items locked by me
            const chunk = items.slice(i * 50, (i + 1) * 50);
            const lockedByMe = chunk.some((x: any) => x.locked_by === user?.id);

            cards.push({
                id: `batch-${lang}-${i}`, // Virtual ID logic
                language: lang,
                title: `${lang} Batch #${i + 1}`,
                count: chunk.length,
                lockedBy: lockedByMe ? user?.id || 'me' : null,
                isLockedByMe: lockedByMe
            });
        }
        if (cards.length > 0) result[lang] = cards;
    });

    return result;
}

export async function claimBatch(language: string): Promise<{ tasks: Task[], expiry: number }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    // 1. Check if user already has locked items for this language (Resume)
    // Attempt to fetch items already locked by me
    const { data: myLocked, error: myLockedError } = await supabase
        .from('audio_submissions')
        .select(`
            id, audio_url, status, phonetic_hint,
            names!inner (id, name, origin, meaning)
        `)
        .eq('locked_by', user.id)
        .eq('status', 'pending');

    if (myLockedError) throw myLockedError;

    let tasksData = myLocked;

    if (!tasksData || tasksData.length === 0) {
        // 2. Lock new items
        // Find top 50 available
        const { data: available, error: availError } = await supabase
            .from('audio_submissions')
            .select(`id, names!inner(origin)`)
            .eq('status', 'pending')
            .eq('names.origin', language)
            .or(`locked_by.is.null,locked_at.lt.${twoHoursAgo}`)
            .limit(50);

        if (availError) throw availError;

        if (!available || available.length === 0) {
            return { tasks: [], expiry: 0 };
        }

        const idsToLock = available.map((x: any) => x.id);

        // Perform Lock
        const { error: lockError } = await supabase
            .from('audio_submissions')
            .update({
                locked_by: user.id,
                locked_at: now.toISOString()
            })
            .in('id', idsToLock);

        if (lockError) throw lockError;

        // Fetch details
        const { data: newLocked, error: fetchError } = await supabase
            .from('audio_submissions')
            .select(`
                id, audio_url, status, phonetic_hint,
                names!inner (id, name, origin, meaning)
            `)
            .in('id', idsToLock);

        if (fetchError) throw fetchError;
        tasksData = newLocked;
    }

    // Map to Task
    const tasks: Task[] = tasksData.map((d: any) => ({
        id: d.id,
        name: d.names.name,
        origin: d.names.origin,
        meaning: d.names.meaning || "No meaning provided",
        audioUrl: d.audio_url,
        status: d.status,
        phonetic_hint: d.phonetic_hint || '',
        original_phonetics: d.names.phonetic_hint || '',
    }));

    return {
        tasks,
        expiry: now.getTime() + (2 * 60 * 60 * 1000)
    };
}

export async function submitReview(taskId: string, action: 'approved' | 'rejected', data?: { phonetic?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // First get current count and name_id
    const { data: current, error: fetchError } = await supabase
        .from('audio_submissions')
        .select('verification_count, name_id')
        .eq('id', taskId)
        .single();

    if (fetchError) throw fetchError;

    // Increment verification count if approved
    const newCount = (current?.verification_count || 0) + (action === 'approved' ? 1 : 0);

    const updatePayload: any = {
        status: action === 'approved' ? 'approved' : 'rejected',
        verification_count: newCount
    };

    const { error } = await supabase
        .from('audio_submissions')
        .update(updatePayload)
        .eq('id', taskId)
        .eq('locked_by', user.id);

    if (error) throw error;

    // If approved, instantly verify the name so it goes live
    if (action === 'approved' && current.name_id) {
        await supabase
            .from('names')
            .update({ verification_status: 'verified' })
            .eq('id', current.name_id);
    }

    revalidatePath('/studio/library');
}

export async function updateSubmission(taskId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const phonetic = formData.get('phonetic') as string;
    const audioFile = formData.get('audio') as File;

    let audioUrl = null;

    if (audioFile) {
        const path = `submissions/${taskId}_${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('vetting_samples')
            .upload(path, audioFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('vetting_samples').getPublicUrl(path);
        audioUrl = publicUrl;
    }

    // Editing implies approval/verification of the changes
    const updates: any = {
        status: 'edited'
    };
    if (audioUrl) updates.audio_url = audioUrl;
    if (phonetic) updates.phonetic_hint = phonetic;

    const { error } = await supabase
        .from('audio_submissions')
        .update(updates)
        .eq('id', taskId)
        .eq('locked_by', user.id);

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true };
}

export async function resetSubmission(taskId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch current to decrement count if it was approved
    const { data: current, error: fetchError } = await supabase
        .from('audio_submissions')
        .select('verification_count, status, name_id')
        .eq('id', taskId)
        .single();

    if (fetchError) throw fetchError;

    let newCount = current.verification_count;
    if (current.status === 'approved' && newCount > 0) {
        newCount = newCount - 1;
    }
    // If 'edited', we didn't strictly increment count in updateSubmission (current implementation)
    // so we don't decrement. But if we change logic later, revisit.

    // Fetch the original phonetic hint from the names table
    const { data: nameData, error: nameError } = await supabase
        .from('names')
        .select('phonetic_hint')
        .eq('id', current.name_id)
        .single();

    if (nameError) throw nameError;

    const { error } = await supabase
        .from('audio_submissions')
        .update({
            status: 'pending',
            verification_count: newCount,
            phonetic_hint: nameData.phonetic_hint
        })
        .eq('id', taskId)
        .eq('locked_by', user.id);

    if (error) throw error;
    revalidatePath('/studio/library');
}

export async function releaseLocks() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
        .from('audio_submissions')
        .update({ locked_by: null, locked_at: null })
        .eq('locked_by', user.id);

    revalidatePath('/studio/library');
}

'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

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
    isDirectName?: boolean;
}

/**
 * Shared Auth Helper: Handles real users and Demo Mode bypass
 */
async function getAuth() {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const cookieStore = await cookies();
    const isDemoMode = cookieStore.get('nali_demo_mode')?.value === 'true';

    if (!authUser && !isDemoMode) {
        return { supabase, user: null, isAdmin: false };
    }

    // Mock for Demo Mode
    const user = authUser || { id: '00000000-0000-0000-0000-000000000000', email: 'dev@nali.org' };

    // Fetch profile for role/languages
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, languages')
        .eq('id', user.id)
        .single();

    // FALLBACK: If profile languages are missing, fetch from application
    let languages: string[] = [];
    if (profile?.languages) {
        languages = (profile.languages as any[]).map(l => l.language.toLowerCase());
    } else {
        const { data: application } = await supabase
            .from('contributor_applications')
            .select('languages')
            .ilike('email', user.email!)
            .eq('status', 'approved')
            .single();

        if (application?.languages) {
            languages = (application.languages as any[]).map(l => l.language.toLowerCase());
        }
    }

    const isAdmin = isDemoMode || profile?.role === 'admin';

    return { supabase, user, isAdmin, languages };
}

export async function getPendingBatches(): Promise<Record<string, BatchCard[]>> {
    const { supabase, user, isAdmin, languages: allowedLanguages } = await getAuth();
    if (!user) return {};

    // 2. Fetch Assigned Names First (Highest Priority)
    const { data: assignedItems } = await supabase
        .from('names')
        .select('id, origin, status')
        .ilike('assigned_to', user.email!)
        .or('status.eq.pending,status.eq.unverified')
        .eq('ignored', false);

    // 3. Fetch all pending audio submissions (Open Queue) - ADMIN ONLY
    let data: any[] = [];
    if (isAdmin) {
        const { data: openQueue, error } = await supabase
            .from('audio_submissions')
            .select(`
                id, 
                locked_by, 
                locked_at, 
                status,
                names!inner (id, origin, assigned_to, ignored)
            `)
            .eq('status', 'pending')
            .is('names.assigned_to', null) // Only show unassigned in open queue
            .eq('names.ignored', false)
            .limit(2000);

        if (error) {
            console.error("Error fetching batches:", error);
        } else {
            data = openQueue || [];
        }
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).getTime();
    const groups: Record<string, any[]> = {};

    // A. Handle Assigned Names as a priority batch
    if (assignedItems && assignedItems.length > 0) {
        groups['My Assignments'] = assignedItems.map(item => ({
            id: item.id,
            names: item,
            is_direct_name: true // Flag to indicate these are names, not existing submissions
        }));
    }

    // B. Handle Open Queue
    data.forEach((item: any) => {
        const lockedAt = item.locked_at ? new Date(item.locked_at).getTime() : 0;
        const isLockedByOther = item.locked_by && item.locked_by !== user.id && lockedAt > twoHoursAgo;

        if (!isLockedByOther) {
            const lang = item.names?.origin || 'Uncategorized';

            // FILTER LOGIC
            if (!isAdmin) {
                if (allowedLanguages.length === 0) return; // Show nothing if no expertise identified
                const isAllowed = allowedLanguages.some(al => lang.toLowerCase().includes(al));
                if (!isAllowed) return;
            }

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
            const chunk = items.slice(i * 50, (i + 1) * 50);
            const lockedByMe = chunk.some((x: any) => x.locked_by === user.id);

            cards.push({
                id: `batch-${lang}-${i}`,
                language: lang,
                title: `${lang} Batch #${i + 1}`,
                count: chunk.length,
                lockedBy: lockedByMe ? user.id : null,
                isLockedByMe: lockedByMe
            });
        }
        if (cards.length > 0) result[lang] = cards;
    });

    return result;
}

export async function claimBatch(language: string): Promise<{ tasks: Task[], expiry: number }> {
    const { supabase, user } = await getAuth();
    if (!user) throw new Error("Unauthorized");

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    // 1. Check for Assigned Names first
    if (language === 'My Assignments') {
        const { data: assigned } = await supabase
            .from('names')
            .select('id, name, origin, meaning, phonetic_hint')
            .ilike('assigned_to', user.email!)
            .or('status.eq.pending,status.eq.unverified')
            .eq('ignored', false)
            .limit(50);

        if (assigned && assigned.length > 0) {
            const tasks: Task[] = assigned.map(d => ({
                id: d.id, // Using name_id as taskId for assigned names
                name: d.name,
                origin: d.origin,
                meaning: d.meaning || "No meaning provided",
                audioUrl: '', // No audio yet for assigned names
                status: 'pending',
                phonetic_hint: d.phonetic_hint || '',
                original_phonetics: d.phonetic_hint || '',
                isDirectName: true // UI helper
            }));
            return { tasks, expiry: now.getTime() + (2 * 60 * 60 * 1000) };
        }
    }

    // 2. Clear previous locks if any
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
        const { data: available, error: availError } = await supabase
            .from('audio_submissions')
            .select(`id, names!inner(origin)`)
            .eq('status', 'pending')
            .eq('names.origin', language)
            .is('names.assigned_to', null) // Only unassigned
            .eq('names.ignored', false)
            .or(`locked_by.is.null,locked_at.lt.${twoHoursAgo}`)
            .limit(50);

        if (availError) throw availError;

        if (!available || available.length === 0) {
            return { tasks: [], expiry: 0 };
        }

        const idsToLock = available.map((x: any) => x.id);

        const { error: lockError } = await supabase
            .from('audio_submissions')
            .update({
                locked_by: user.id,
                locked_at: now.toISOString()
            })
            .in('id', idsToLock);

        if (lockError) throw lockError;

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

export async function submitReview(taskId: string, action: 'approved' | 'rejected') {
    const { supabase, user } = await getAuth();
    if (!user) throw new Error("Unauthorized");

    // Attempt to find as audio_submission first
    const { data: submission } = await supabase
        .from('audio_submissions')
        .select('id, verification_count, name_id')
        .eq('id', taskId)
        .single();

    if (submission) {
        const newCount = (submission.verification_count || 0) + (action === 'approved' ? 1 : 0);
        const { error } = await supabase
            .from('audio_submissions')
            .update({
                status: action === 'approved' ? 'approved' : 'rejected',
                verification_count: newCount
            })
            .eq('id', taskId)
            .eq('locked_by', user.id);

        if (error) throw error;

        if (action === 'approved' && submission.name_id) {
            await supabase
                .from('names')
                .update({ verification_status: 'verified' })
                .eq('id', submission.name_id);
        }
    } else {
        // Direct name assignment (taskId is name_id)
        const { error: nameError } = await supabase
            .from('names')
            .update({
                verification_status: action === 'approved' ? 'verified' : 'pending',
                status: action === 'approved' ? 'verified' : 'pending',
                ignored: action === 'rejected'
            })
            .eq('id', taskId)
            .eq('assigned_to', user.email!);

        if (nameError) {
            // If it's not a name either, then we fail
            throw new Error("Task not found");
        }
    }

    revalidatePath('/studio/library');
}

export async function updateSubmission(taskId: string, formData: FormData) {
    const { supabase, user } = await getAuth();
    if (!user) throw new Error("Unauthorized");

    const phonetic = formData.get('phonetic') as string;
    const audioFile = formData.get('audio') as File;
    const isDirectName = formData.get('isDirectName') === 'true';

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

    if (isDirectName) {
        // Direct assignment recording: Create submission AND update name status
        const updates: any = {
            verification_status: 'verified',
            status: 'verified'
        };
        if (audioUrl) updates.audio_url = audioUrl;
        if (phonetic) updates.phonetic_hint = phonetic;

        const { error: nameError } = await supabase
            .from('names')
            .update(updates)
            .eq('id', taskId)
            .ilike('assigned_to', user.email!);

        if (nameError) throw nameError;

        // Also create a record in audio_submissions for tracking
        await supabase.from('audio_submissions').insert({
            name_id: taskId,
            audio_url: audioUrl,
            status: 'approved',
            contributor_id: user.id,
            phonetic_hint: phonetic,
            verification_count: 1
        });
    } else {
        // Standard review update
        const updates: any = { status: 'edited' };
        if (audioUrl) updates.audio_url = audioUrl;
        if (phonetic) updates.phonetic_hint = phonetic;

        const { error } = await supabase
            .from('audio_submissions')
            .update(updates)
            .eq('id', taskId)
            .eq('locked_by', user.id);

        if (error) throw error;
    }

    revalidatePath('/studio/library');
    return { success: true };
}

export async function ignoreName(nameId: string) {
    const { supabase, user } = await getAuth();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from('names')
        .update({ ignored: true })
        .eq('id', nameId)
        .eq('assigned_to', user.email!);

    if (error) throw error;

    // Also clear lock if it was an audio_submission
    await supabase.from('audio_submissions').update({ status: 'rejected' }).eq('id', nameId).eq('locked_by', user.id);

    revalidatePath('/studio/library');
    return { success: true };
}

export async function resetSubmission(taskId: string) {
    const { supabase, user } = await getAuth();
    if (!user) throw new Error("Unauthorized");

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
    const { supabase, user } = await getAuth();
    if (!user) return;

    await supabase
        .from('audio_submissions')
        .update({ locked_by: null, locked_at: null })
        .eq('locked_by', user.id);

    revalidatePath('/studio/library');
}

export async function searchTuningNames(query: string) {
    const { supabase, isAdmin } = await getAuth();
    if (!isAdmin) throw new Error("Unauthorized");

    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
        .from('names')
        .select('id, name, origin, phonetic_hint, tts_settings')
        .ilike('name', `%${query}%`)
        .limit(10);

    if (error) throw error;
    return data;
}

export async function saveTuningFormula(data: {
    nameId: string,
    phonetic: string,
    settings: any,
    ruleType?: 'prefix' | 'suffix' | 'equals',
    rulePattern?: string
}) {
    const { supabase, isAdmin } = await getAuth();
    if (!isAdmin) throw new Error("Unauthorized");

    // 1. Update the specific name
    const { error: nameError } = await supabase
        .from('names')
        .update({
            phonetic_hint: data.phonetic,
            tts_settings: data.settings,
            verification_status: 'verified', // Tuning also verifies it
            audio_url: null // CLEAR CACHE in names table
        })
        .eq('id', data.nameId);

    if (nameError) throw nameError;

    // Clear matching submissions too
    await supabase
        .from('audio_submissions')
        .update({ audio_url: null })
        .eq('name_id', data.nameId);

    // 2. Create Global Rule if requested
    if (data.ruleType && data.rulePattern) {
        const fullPattern = `${data.ruleType}:${data.rulePattern.toLowerCase()}`;
        const { error: ruleError } = await supabase
            .from('pronunciation_rules')
            .upsert({
                pattern: fullPattern,
                phonetic_replacement: data.phonetic,
                settings: data.settings
            }, {
                onConflict: 'pattern'
            });

        if (ruleError) {
            console.error("Error saving global rule:", ruleError);
        } else {
            // Apply rule to ALL matching names by clearing their audio_url
            console.log(`🧹 Clearing cache for names matching rule: ${fullPattern}`);
            const pattern = data.rulePattern.toLowerCase();

            // A. Get affected name IDs
            let nameQuery = supabase.from('names').select('id');
            if (data.ruleType === 'prefix') nameQuery = nameQuery.ilike('name', `${pattern}%`);
            else if (data.ruleType === 'suffix') nameQuery = nameQuery.ilike('name', `%${pattern}`);
            else if (data.ruleType === 'equals') nameQuery = nameQuery.ilike('name', pattern);

            const { data: affectedNames } = await nameQuery;
            const nameIds = affectedNames?.map(n => n.id) || [];

            if (nameIds.length > 0) {
                // B. Clear names cache
                await supabase.from('names').update({ audio_url: null }).in('id', nameIds);
                // C. Clear submissions cache
                await supabase.from('audio_submissions').update({ audio_url: null }).in('name_id', nameIds);
            }
        }
    }

    revalidatePath('/studio/playground');
    return { success: true };
}

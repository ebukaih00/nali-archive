-- Migration to update contributor_applications for multiple languages

-- 1. Add 'languages' column (JSONB) to store array of { language: string, fluency: string }
alter table public.contributor_applications 
add column if not exists languages jsonb;

-- 2. (Optional) Migrate existing data if needed. 
-- Since we just started, we can assume data is effectively empty or we can map it.
-- update public.contributor_applications 
-- set languages = jsonb_build_array(jsonb_build_object('language', primary_tribe, 'fluency', 'Native'))
-- where languages is null;

-- 3. Drop 'primary_tribe' as it is replaced by 'languages'
alter table public.contributor_applications 
drop column if exists primary_tribe;

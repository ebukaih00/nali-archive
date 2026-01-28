-- Migration to add languages to profiles for contributor filtering

alter table public.profiles 
add column if not exists languages jsonb;

-- Comment for clarity
comment on column public.profiles.languages is 'Array of objects { language: string, fluency: string } synchronized from contributor applications';

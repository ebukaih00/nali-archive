-- Add tts_settings to names table for specific overrides
alter table public.names 
add column if not exists tts_settings jsonb default '{}'::jsonb;

-- Create pronunciation_rules table for pattern-based reuse
create table if not exists public.pronunciation_rules (
    id uuid primary key default gen_random_uuid(),
    pattern text not null unique, -- e.g. 'prefix:Olu', 'suffix:chukwu', 'equals:Ada'
    phonetic_replacement text,
    settings jsonb default '{}'::jsonb, -- { stability: number, speed: number, voice_id: string }
    created_at timestamptz default now()
);

-- Enable RLS (though standard studio actions use service role, it's good practice)
alter table public.pronunciation_rules enable row level security;

-- Admin can do everything
create policy "Admins can manage rules" 
on public.pronunciation_rules 
for all 
to authenticated 
using (
    exists (
        select 1 from public.profiles 
        where profiles.id = auth.uid() 
        and profiles.role = 'admin'
    )
);

-- Public/Authenticated read
create policy "Authenticated users can read rules" 
on public.pronunciation_rules 
for select 
to authenticated 
using (true);

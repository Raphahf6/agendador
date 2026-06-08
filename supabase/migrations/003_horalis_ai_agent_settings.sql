create table if not exists public.ai_agent_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  enabled boolean not null default false,
  attendant_name text not null default 'Atendente Horalis',
  persona_summary text not null default '',
  tone_instructions text not null default '',
  business_rules text not null default '',
  sample_dialogues jsonb not null default '[]'::jsonb,
  fallback_message text not null default 'Vou confirmar essa informacao com a equipe e ja retorno com seguranca.',
  handoff_message text not null default 'Vou chamar uma pessoa da equipe para continuar seu atendimento.',
  model text not null default 'gpt-5.4-mini',
  max_output_tokens integer not null default 450,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id),
  constraint ai_agent_settings_sample_dialogues_array check (jsonb_typeof(sample_dialogues) = 'array'),
  constraint ai_agent_settings_tokens_check check (max_output_tokens between 120 and 1200)
);

drop trigger if exists ai_agent_settings_set_updated_at on public.ai_agent_settings;
create trigger ai_agent_settings_set_updated_at before update on public.ai_agent_settings
  for each row execute function app_private.set_updated_at();

create index if not exists ai_agent_settings_clinic_id_idx on public.ai_agent_settings(clinic_id);

alter table public.ai_agent_settings enable row level security;

drop policy if exists "ai_agent_settings_member_select" on public.ai_agent_settings;
drop policy if exists "ai_agent_settings_insert_admin" on public.ai_agent_settings;
drop policy if exists "ai_agent_settings_update_admin" on public.ai_agent_settings;
drop policy if exists "ai_agent_settings_delete_admin" on public.ai_agent_settings;

create policy "ai_agent_settings_member_select" on public.ai_agent_settings
  for select to authenticated using (app_private.is_clinic_member(clinic_id));

create policy "ai_agent_settings_insert_admin" on public.ai_agent_settings
  for insert to authenticated with check (app_private.is_clinic_admin(clinic_id));

create policy "ai_agent_settings_update_admin" on public.ai_agent_settings
  for update to authenticated using (app_private.is_clinic_admin(clinic_id)) with check (app_private.is_clinic_admin(clinic_id));

create policy "ai_agent_settings_delete_admin" on public.ai_agent_settings
  for delete to authenticated using (app_private.is_clinic_admin(clinic_id));

grant select, insert, update, delete on public.ai_agent_settings to authenticated;

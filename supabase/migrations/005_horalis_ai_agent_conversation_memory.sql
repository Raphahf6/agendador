create table if not exists public.ai_agent_conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  channel text not null default 'preview',
  external_id text,
  customer_phone text,
  customer_name text,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_agent_conversations(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists ai_agent_conversations_set_updated_at on public.ai_agent_conversations;
create trigger ai_agent_conversations_set_updated_at before update on public.ai_agent_conversations
  for each row execute function app_private.set_updated_at();

create index if not exists ai_agent_conversations_clinic_idx on public.ai_agent_conversations(clinic_id, updated_at desc);
create unique index if not exists ai_agent_conversations_external_idx
  on public.ai_agent_conversations(clinic_id, channel, external_id)
  where external_id is not null;
create index if not exists ai_agent_messages_conversation_idx on public.ai_agent_messages(conversation_id, created_at);
create index if not exists ai_agent_messages_clinic_idx on public.ai_agent_messages(clinic_id, created_at desc);

alter table public.ai_agent_conversations enable row level security;
alter table public.ai_agent_messages enable row level security;

drop policy if exists "ai_agent_conversations_member_select" on public.ai_agent_conversations;
drop policy if exists "ai_agent_conversations_member_insert" on public.ai_agent_conversations;
drop policy if exists "ai_agent_conversations_member_update" on public.ai_agent_conversations;
drop policy if exists "ai_agent_conversations_member_delete" on public.ai_agent_conversations;
drop policy if exists "ai_agent_messages_member_select" on public.ai_agent_messages;
drop policy if exists "ai_agent_messages_member_insert" on public.ai_agent_messages;
drop policy if exists "ai_agent_messages_member_update" on public.ai_agent_messages;
drop policy if exists "ai_agent_messages_member_delete" on public.ai_agent_messages;

create policy "ai_agent_conversations_member_select" on public.ai_agent_conversations
  for select to authenticated using (app_private.is_clinic_member(clinic_id));
create policy "ai_agent_conversations_member_insert" on public.ai_agent_conversations
  for insert to authenticated with check (app_private.is_clinic_member(clinic_id));
create policy "ai_agent_conversations_member_update" on public.ai_agent_conversations
  for update to authenticated using (app_private.is_clinic_member(clinic_id)) with check (app_private.is_clinic_member(clinic_id));
create policy "ai_agent_conversations_member_delete" on public.ai_agent_conversations
  for delete to authenticated using (app_private.is_clinic_admin(clinic_id));

create policy "ai_agent_messages_member_select" on public.ai_agent_messages
  for select to authenticated using (app_private.is_clinic_member(clinic_id));
create policy "ai_agent_messages_member_insert" on public.ai_agent_messages
  for insert to authenticated with check (
    app_private.is_clinic_member(clinic_id)
    and exists (
      select 1 from public.ai_agent_conversations c
      where c.id = conversation_id and c.clinic_id = ai_agent_messages.clinic_id
    )
  );
create policy "ai_agent_messages_member_update" on public.ai_agent_messages
  for update to authenticated using (app_private.is_clinic_member(clinic_id)) with check (app_private.is_clinic_member(clinic_id));
create policy "ai_agent_messages_member_delete" on public.ai_agent_messages
  for delete to authenticated using (app_private.is_clinic_admin(clinic_id));

grant select, insert, update, delete on public.ai_agent_conversations to authenticated;
grant select, insert, update, delete on public.ai_agent_messages to authenticated;

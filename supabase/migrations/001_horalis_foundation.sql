create schema if not exists app_private;

create extension if not exists pgcrypto with schema extensions;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  nome_salao text not null,
  tagline text,
  telefone text,
  email text,
  cpf text,
  endereco_completo text,
  url_logo text,
  cor_primaria text not null default '#0E7490',
  cor_secundaria text not null default '#FFFFFF',
  email_footer_message text not null default 'Powered by Horalis',
  formas_pagamento text,
  comodidades jsonb not null default '{}'::jsonb,
  redes_sociais jsonb not null default '{}'::jsonb,
  fotos_carousel jsonb not null default '[]'::jsonb,
  horario_trabalho_detalhado jsonb not null default '{}'::jsonb,
  setup_completed boolean not null default false,
  subscription_status text not null default 'trialing',
  trial_ends_at timestamptz not null default now() + interval '7 days',
  mp_public_key text,
  mp_access_token text,
  sinal_valor numeric(10,2) not null default 0,
  google_sync_enabled boolean not null default false,
  google_calendar_id text,
  google_tokens jsonb,
  marketing_cota_total integer not null default 100,
  marketing_cota_usada integer not null default 0,
  marketing_cota_reset_em timestamptz,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinics_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (clinic_id, user_id),
  constraint clinic_members_role_check check (role in ('owner', 'admin', 'staff'))
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  nome_servico text not null,
  duracao_minutos integer not null default 30,
  preco numeric(10,2) not null default 0,
  descricao text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  nome text not null,
  cargo text,
  foto_url text,
  descricao text,
  email text,
  telefone text,
  comissao numeric(5,2) not null default 0,
  horario_trabalho jsonb not null default '{}'::jsonb,
  servicos uuid[] not null default '{}'::uuid[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  nome text not null,
  email text,
  whatsapp text,
  data_cadastro timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, whatsapp)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  professional_id uuid references public.professionals(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmado',
  service_name text,
  service_price numeric(10,2) not null default 0,
  duration_minutes integer not null default 30,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  professional_name text,
  payment_status text,
  payment_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_check check (end_time > start_time)
);

create table if not exists public.customer_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  tipo text not null,
  dados jsonb not null default '{}'::jsonb,
  data_evento timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  description text not null,
  amount numeric(10,2) not null default 0,
  category text not null default 'fixa',
  date date not null default current_date,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_products (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  nome text not null,
  categoria text not null default 'Geral',
  quantidade_atual integer not null default 0,
  quantidade_minima integer not null default 5,
  preco_custo numeric(10,2) not null default 0,
  preco_venda numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  public_data jsonb not null default '{}'::jsonb,
  secret_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, provider)
);

create or replace function app_private.is_clinic_member(target_clinic_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = target_clinic_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function app_private.is_clinic_admin(target_clinic_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = target_clinic_id
      and cm.user_id = auth.uid()
      and cm.role in ('owner', 'admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated, public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
drop trigger if exists clinics_set_updated_at on public.clinics;
drop trigger if exists services_set_updated_at on public.services;
drop trigger if exists professionals_set_updated_at on public.professionals;
drop trigger if exists customers_set_updated_at on public.customers;
drop trigger if exists appointments_set_updated_at on public.appointments;
drop trigger if exists expenses_set_updated_at on public.expenses;
drop trigger if exists stock_products_set_updated_at on public.stock_products;
drop trigger if exists integration_accounts_set_updated_at on public.integration_accounts;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function app_private.set_updated_at();
create trigger clinics_set_updated_at before update on public.clinics
  for each row execute function app_private.set_updated_at();
create trigger services_set_updated_at before update on public.services
  for each row execute function app_private.set_updated_at();
create trigger professionals_set_updated_at before update on public.professionals
  for each row execute function app_private.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
  for each row execute function app_private.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments
  for each row execute function app_private.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function app_private.set_updated_at();
create trigger stock_products_set_updated_at before update on public.stock_products
  for each row execute function app_private.set_updated_at();
create trigger integration_accounts_set_updated_at before update on public.integration_accounts
  for each row execute function app_private.set_updated_at();

create index if not exists clinics_owner_id_idx on public.clinics(owner_id);
create index if not exists clinics_slug_idx on public.clinics(slug);
create index if not exists clinic_members_user_id_idx on public.clinic_members(user_id);
create index if not exists services_clinic_id_idx on public.services(clinic_id);
create index if not exists professionals_clinic_id_idx on public.professionals(clinic_id);
create index if not exists customers_clinic_id_idx on public.customers(clinic_id);
create index if not exists appointments_clinic_start_idx on public.appointments(clinic_id, start_time);
create index if not exists appointments_service_id_idx on public.appointments(service_id);
create index if not exists appointments_customer_id_idx on public.appointments(customer_id);
create index if not exists appointments_professional_id_idx on public.appointments(professional_id);
create index if not exists customer_events_clinic_id_idx on public.customer_events(clinic_id);
create index if not exists customer_events_customer_id_idx on public.customer_events(customer_id);
create index if not exists customer_events_created_by_idx on public.customer_events(created_by);
create index if not exists expenses_clinic_date_idx on public.expenses(clinic_id, date);
create index if not exists stock_products_clinic_id_idx on public.stock_products(clinic_id);

alter table public.profiles enable row level security;
alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.services enable row level security;
alter table public.professionals enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.customer_events enable row level security;
alter table public.expenses enable row level security;
alter table public.stock_products enable row level security;
alter table public.integration_accounts enable row level security;

create policy "profiles_select_self" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_self" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "clinics_public_select" on public.clinics
  for select to anon, authenticated using (is_public = true or app_private.is_clinic_member(id));
create policy "clinics_insert_owner" on public.clinics
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "clinics_update_admin" on public.clinics
  for update to authenticated using (app_private.is_clinic_admin(id)) with check (app_private.is_clinic_admin(id));

create policy "clinic_members_select_related" on public.clinic_members
  for select to authenticated using (user_id = (select auth.uid()) or app_private.is_clinic_member(clinic_id));
create policy "clinic_members_insert_owner_signup" on public.clinic_members
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "clinic_members_manage_admin" on public.clinic_members
  for update to authenticated using (app_private.is_clinic_admin(clinic_id)) with check (app_private.is_clinic_admin(clinic_id));
create policy "clinic_members_delete_admin" on public.clinic_members
  for delete to authenticated using (app_private.is_clinic_admin(clinic_id));

create policy "services_public_select" on public.services
  for select to anon, authenticated using (
    active = true and exists (select 1 from public.clinics c where c.id = clinic_id and c.is_public = true)
    or app_private.is_clinic_member(clinic_id)
  );
create policy "services_insert_admin" on public.services
  for insert to authenticated with check (app_private.is_clinic_admin(clinic_id));
create policy "services_update_admin" on public.services
  for update to authenticated using (app_private.is_clinic_admin(clinic_id)) with check (app_private.is_clinic_admin(clinic_id));
create policy "services_delete_admin" on public.services
  for delete to authenticated using (app_private.is_clinic_admin(clinic_id));

create policy "professionals_public_select" on public.professionals
  for select to anon, authenticated using (
    active = true and exists (select 1 from public.clinics c where c.id = clinic_id and c.is_public = true)
    or app_private.is_clinic_member(clinic_id)
  );
create policy "professionals_insert_admin" on public.professionals
  for insert to authenticated with check (app_private.is_clinic_admin(clinic_id));
create policy "professionals_update_admin" on public.professionals
  for update to authenticated using (app_private.is_clinic_admin(clinic_id)) with check (app_private.is_clinic_admin(clinic_id));
create policy "professionals_delete_admin" on public.professionals
  for delete to authenticated using (app_private.is_clinic_admin(clinic_id));

create policy "customers_member_select" on public.customers
  for select to authenticated using (app_private.is_clinic_member(clinic_id));
create policy "customers_public_insert" on public.customers
  for insert to anon, authenticated with check (exists (select 1 from public.clinics c where c.id = clinic_id and c.is_public = true));
create policy "customers_member_manage" on public.customers
  for update to authenticated using (app_private.is_clinic_member(clinic_id)) with check (app_private.is_clinic_member(clinic_id));

create policy "appointments_member_select" on public.appointments
  for select to authenticated using (app_private.is_clinic_member(clinic_id));
create policy "appointments_public_insert" on public.appointments
  for insert to anon, authenticated with check (exists (select 1 from public.clinics c where c.id = clinic_id and c.is_public = true));
create policy "appointments_member_manage" on public.appointments
  for update to authenticated using (app_private.is_clinic_member(clinic_id)) with check (app_private.is_clinic_member(clinic_id));
create policy "appointments_member_delete" on public.appointments
  for delete to authenticated using (app_private.is_clinic_member(clinic_id));

create policy "customer_events_member_select" on public.customer_events
  for select to authenticated using (app_private.is_clinic_member(clinic_id));
create policy "customer_events_member_insert" on public.customer_events
  for insert to authenticated with check (app_private.is_clinic_member(clinic_id));

create policy "expenses_member_all" on public.expenses
  for all to authenticated using (app_private.is_clinic_member(clinic_id)) with check (app_private.is_clinic_member(clinic_id));

create policy "stock_products_member_all" on public.stock_products
  for all to authenticated using (app_private.is_clinic_member(clinic_id)) with check (app_private.is_clinic_member(clinic_id));

create policy "integration_accounts_member_select" on public.integration_accounts
  for select to authenticated using (app_private.is_clinic_member(clinic_id));
create policy "integration_accounts_insert_admin" on public.integration_accounts
  for insert to authenticated with check (app_private.is_clinic_admin(clinic_id));
create policy "integration_accounts_update_admin" on public.integration_accounts
  for update to authenticated using (app_private.is_clinic_admin(clinic_id)) with check (app_private.is_clinic_admin(clinic_id));
create policy "integration_accounts_delete_admin" on public.integration_accounts
  for delete to authenticated using (app_private.is_clinic_admin(clinic_id));

grant usage on schema public to anon, authenticated;
grant usage on schema app_private to authenticated;
grant select on public.clinics, public.services, public.professionals to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant insert on public.customers, public.appointments to anon;

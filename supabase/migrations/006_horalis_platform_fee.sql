alter table public.clinics
  add column if not exists platform_fee_percent numeric(5,2) not null default 0;

alter table public.clinics
  drop constraint if exists clinics_platform_fee_percent_check;

alter table public.clinics
  add constraint clinics_platform_fee_percent_check
  check (platform_fee_percent >= 0 and platform_fee_percent <= 100);

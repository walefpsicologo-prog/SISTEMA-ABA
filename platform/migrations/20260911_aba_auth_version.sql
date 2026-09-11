alter table public.aba_professionals add column if not exists auth_version text;
alter table public.aba_guardian_access add column if not exists auth_version text;

create or replace function private.aba_auth_version_matches(p_expected text)
returns boolean
language sql
stable
set search_path to ''
as $$
  select p_expected is null
    or p_expected = coalesce(auth.jwt()->'app_metadata'->>'aba_auth_version','')
$$;

create or replace function private.aba_can_access_client(p_client uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.aba_professionals a
      where a.user_id=auth.uid() and a.active=true and a.role='admin'
        and private.aba_auth_version_matches(a.auth_version)
    )
    or exists (
      select 1 from public.aba_client_professionals cp
      join public.aba_professionals p on p.id=cp.professional_id
      where cp.client_id=p_client and cp.active=true and p.user_id=auth.uid() and p.active=true
        and private.aba_auth_version_matches(p.auth_version)
    )
    or exists (
      select 1
      from public.aba_supervision_links sl
      join public.aba_professionals sup on sup.id=sl.supervisor_id
      join public.aba_client_professionals cp on cp.professional_id=sl.supervisee_id and cp.active=true
      where sl.active=true and sup.user_id=auth.uid() and sup.active=true and cp.client_id=p_client
        and private.aba_auth_version_matches(sup.auth_version)
    )
  )
$$;

create or replace function private.aba_can_manage_clinical()
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.aba_professionals p
    where p.user_id=auth.uid()
      and p.active=true
      and p.role in ('admin','supervisor','professional')
      and private.aba_auth_version_matches(p.auth_version)
  )
$$;

create or replace function private.aba_current_professional_id()
returns uuid
language sql
stable security definer
set search_path to ''
as $$
  select p.id from public.aba_professionals p
  where p.user_id = auth.uid()
    and p.active = true
    and private.aba_auth_version_matches(p.auth_version)
  limit 1
$$;

create or replace function private.aba_is_admin()
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.aba_professionals p
    where p.user_id = auth.uid()
      and p.active = true
      and p.role = 'admin'
      and private.aba_auth_version_matches(p.auth_version)
  )
$$;

create or replace function private.aba_is_supervisor()
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.aba_professionals p
    where p.user_id = auth.uid()
      and p.active = true
      and p.role in ('admin','supervisor')
      and private.aba_auth_version_matches(p.auth_version)
  )
$$;

drop policy if exists aba_guardian_self_select on public.aba_guardian_access;
create policy aba_guardian_self_select on public.aba_guardian_access
for select to authenticated
using (user_id = auth.uid() and active = true and private.aba_auth_version_matches(auth_version));

drop policy if exists aba_prof_select on public.aba_professionals;
create policy aba_prof_select on public.aba_professionals
for select to authenticated
using (
  private.aba_can_manage_clinical()
  or (user_id = auth.uid() and active = true and private.aba_auth_version_matches(auth_version))
);

create extension if not exists "pgcrypto";

create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.pool_competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pool_memberships (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pool_competitions(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (pool_id, user_id),
  constraint membership_status check (status in ('pending', 'approved', 'rejected'))
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text not null,
  flag_url text
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  team_a_id uuid not null references public.teams(id) on delete restrict,
  team_b_id uuid not null references public.teams(id) on delete restrict,
  group_name text,
  stage text not null,
  starts_at timestamptz not null,
  score_a int,
  score_b int,
  is_finished boolean not null default false,
  constraint different_teams check (team_a_id <> team_b_id),
  constraint score_a_non_negative check (score_a is null or score_a >= 0),
  constraint score_b_non_negative check (score_b is null or score_b >= 0)
);

create table if not exists public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pool_competitions(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_score_a int not null,
  predicted_score_b int not null,
  points int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pool_id, user_id, match_id),
  constraint predicted_score_a_non_negative check (predicted_score_a >= 0),
  constraint predicted_score_b_non_negative check (predicted_score_b >= 0)
);

create table if not exists public.group_predictions (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pool_competitions(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  group_name text not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  position int not null,
  points int not null default 0,
  locked boolean not null default true,
  created_at timestamptz not null default now(),
  unique (pool_id, user_id, group_name, position)
);

create table if not exists public.final_predictions (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pool_competitions(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  champion_id uuid not null references public.teams(id) on delete restrict,
  runner_up_id uuid not null references public.teams(id) on delete restrict,
  third_place_id uuid not null references public.teams(id) on delete restrict,
  champion_points int not null default 0,
  runner_up_points int not null default 0,
  third_place_points int not null default 0,
  locked boolean not null default true,
  created_at timestamptz not null default now(),
  unique (pool_id, user_id),
  constraint podium_unique check (
    champion_id <> runner_up_id
    and champion_id <> third_place_id
    and runner_up_id <> third_place_id
  )
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);

create index if not exists idx_matches_starts_at on public.matches(starts_at);
create index if not exists idx_memberships_user on public.pool_memberships(user_id);
create index if not exists idx_memberships_pool_status on public.pool_memberships(pool_id, status);
create index if not exists idx_match_predictions_pool_user on public.match_predictions(pool_id, user_id);
create index if not exists idx_group_predictions_pool_user on public.group_predictions(pool_id, user_id);

create or replace function public.is_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users_profile
    where id = target_user_id
      and is_admin = true
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users_profile (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists match_predictions_touch_updated_at on public.match_predictions;
create trigger match_predictions_touch_updated_at
before update on public.match_predictions
for each row execute function public.touch_updated_at();

create or replace function public.calculate_match_prediction_points(
  predicted_a int,
  predicted_b int,
  real_a int,
  real_b int
)
returns int
language sql
immutable
as $$
  select case
    when predicted_a = real_a and predicted_b = real_b then 3
    when sign(predicted_a - predicted_b) = sign(real_a - real_b) then 1
    else 0
  end;
$$;

create or replace function public.recalculate_match_points(target_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem recalcular pontos.';
  end if;

  update public.match_predictions prediction
  set points = public.calculate_match_prediction_points(
    prediction.predicted_score_a,
    prediction.predicted_score_b,
    match.score_a,
    match.score_b
  )
  from public.matches match
  where prediction.match_id = match.id
    and match.id = target_match_id
    and match.is_finished = true
    and match.score_a is not null
    and match.score_b is not null;
end;
$$;

create or replace function public.recalculate_all_points()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  real_groups jsonb := coalesce(
    (select value from public.app_settings where key = 'real_group_classified'),
    '{}'::jsonb
  );
  real_podium jsonb := coalesce(
    (select value from public.app_settings where key = 'real_podium'),
    '{}'::jsonb
  );
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem recalcular pontos.';
  end if;

  update public.match_predictions prediction
  set points = public.calculate_match_prediction_points(
    prediction.predicted_score_a,
    prediction.predicted_score_b,
    match.score_a,
    match.score_b
  )
  from public.matches match
  where prediction.match_id = match.id
    and match.is_finished = true
    and match.score_a is not null
    and match.score_b is not null;

  update public.group_predictions prediction
  set points = case
    when (real_groups -> prediction.group_name) ? prediction.team_id::text then 1
    else 0
  end;

  update public.final_predictions
  set
    champion_points = case when champion_id::text = real_podium->>'champion_id' then 10 else 0 end,
    runner_up_points = case when runner_up_id::text = real_podium->>'runner_up_id' then 7 else 0 end,
    third_place_points = case when third_place_id::text = real_podium->>'third_place_id' then 5 else 0 end;
end;
$$;

create or replace view public.ranking
with (security_invoker = true)
as
select
  membership.pool_id,
  profile.id as user_id,
  profile.name,
  profile.email,
  coalesce(match_points.points, 0)::int as match_points,
  coalesce(group_points.points, 0)::int as group_points,
  coalesce(final_points.points, 0)::int as final_points,
  (
    coalesce(match_points.points, 0)
    + coalesce(group_points.points, 0)
    + coalesce(final_points.points, 0)
  )::int as total_points
from public.users_profile profile
join public.pool_memberships membership
  on membership.user_id = profile.id
 and membership.status = 'approved'
left join (
  select pool_id, user_id, sum(points) as points
  from public.match_predictions
  group by pool_id, user_id
) match_points on match_points.user_id = profile.id
 and match_points.pool_id = membership.pool_id
left join (
  select pool_id, user_id, sum(points) as points
  from public.group_predictions
  group by pool_id, user_id
) group_points on group_points.user_id = profile.id
 and group_points.pool_id = membership.pool_id
left join (
  select
    pool_id,
    user_id,
    sum(champion_points + runner_up_points + third_place_points) as points
  from public.final_predictions
  group by pool_id, user_id
) final_points on final_points.user_id = profile.id
 and final_points.pool_id = membership.pool_id
order by total_points desc, match_points desc, profile.name asc;

alter table public.users_profile enable row level security;
alter table public.pool_competitions enable row level security;
alter table public.pool_memberships enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.match_predictions enable row level security;
alter table public.group_predictions enable row level security;
alter table public.final_predictions enable row level security;
alter table public.app_settings enable row level security;

insert into public.pool_competitions (id, name, description, is_active) values
  (
    '10000000-0000-0000-0000-000000000001',
    'Resenha sem regras',
    'Bolão principal da turma.',
    true
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Amigos de papinha',
    'Núcleo paralelo para outra roda de amigos.',
    true
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Comunidade Top Eleven Brasil',
    'Bolao da comunidade Top Eleven Brasil.',
    true
  )
on conflict (id) do nothing;

drop policy if exists "profiles_select_authenticated" on public.users_profile;
create policy "profiles_select_authenticated"
on public.users_profile for select
to authenticated
using (true);

drop policy if exists "profiles_update_own" on public.users_profile;
create policy "profiles_update_own"
on public.users_profile for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id and is_admin = false);

drop policy if exists "profiles_admin_all" on public.users_profile;
create policy "profiles_admin_all"
on public.users_profile for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "pool_competitions_select_authenticated" on public.pool_competitions;
create policy "pool_competitions_select_authenticated"
on public.pool_competitions for select
to authenticated
using (is_active = true or public.is_admin());

drop policy if exists "pool_competitions_admin_all" on public.pool_competitions;
create policy "pool_competitions_admin_all"
on public.pool_competitions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "pool_memberships_select_own_or_admin" on public.pool_memberships;
create policy "pool_memberships_select_own_or_admin"
on public.pool_memberships for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "pool_memberships_insert_own_pending" on public.pool_memberships;
create policy "pool_memberships_insert_own_pending"
on public.pool_memberships for insert
to authenticated
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "pool_memberships_update_own_request" on public.pool_memberships;
create policy "pool_memberships_update_own_request"
on public.pool_memberships for update
to authenticated
using (auth.uid() = user_id and status = 'rejected')
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "pool_memberships_admin_all" on public.pool_memberships;
create policy "pool_memberships_admin_all"
on public.pool_memberships for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "teams_select_authenticated" on public.teams;
create policy "teams_select_authenticated"
on public.teams for select
to authenticated
using (true);

drop policy if exists "teams_admin_all" on public.teams;
create policy "teams_admin_all"
on public.teams for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "matches_select_authenticated" on public.matches;
create policy "matches_select_authenticated"
on public.matches for select
to authenticated
using (true);

drop policy if exists "matches_admin_all" on public.matches;
create policy "matches_admin_all"
on public.matches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "match_predictions_select_authenticated" on public.match_predictions;
create policy "match_predictions_select_authenticated"
on public.match_predictions for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.pool_memberships
    where pool_memberships.pool_id = match_predictions.pool_id
      and pool_memberships.user_id = auth.uid()
      and pool_memberships.status = 'approved'
  )
);

drop policy if exists "match_predictions_insert_own_open" on public.match_predictions;
create policy "match_predictions_insert_own_open"
on public.match_predictions for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.pool_memberships
    where pool_memberships.pool_id = match_predictions.pool_id
      and pool_memberships.user_id = auth.uid()
      and pool_memberships.status = 'approved'
  )
  and exists (
    select 1 from public.matches
    where matches.id = match_id
      and matches.starts_at > now() + interval '1 hour'
      and matches.starts_at <= now() + interval '24 hours'
  )
);

drop policy if exists "match_predictions_update_own_open" on public.match_predictions;
create policy "match_predictions_update_own_open"
on public.match_predictions for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.pool_memberships
    where pool_memberships.pool_id = match_predictions.pool_id
      and pool_memberships.user_id = auth.uid()
      and pool_memberships.status = 'approved'
  )
  and exists (
    select 1 from public.matches
    where matches.id = match_id
      and matches.starts_at > now() + interval '1 hour'
      and matches.starts_at <= now() + interval '24 hours'
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.matches
    where matches.id = match_id
      and matches.starts_at > now() + interval '1 hour'
      and matches.starts_at <= now() + interval '24 hours'
  )
);

drop policy if exists "match_predictions_admin_all" on public.match_predictions;
create policy "match_predictions_admin_all"
on public.match_predictions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "group_predictions_select_authenticated" on public.group_predictions;
create policy "group_predictions_select_authenticated"
on public.group_predictions for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.pool_memberships
    where pool_memberships.pool_id = group_predictions.pool_id
      and pool_memberships.user_id = auth.uid()
      and pool_memberships.status = 'approved'
  )
);

drop policy if exists "group_predictions_insert_own" on public.group_predictions;
create policy "group_predictions_insert_own"
on public.group_predictions for insert
to authenticated
with check (
  auth.uid() = user_id
  and locked = true
  and exists (
    select 1 from public.pool_memberships
    where pool_memberships.pool_id = group_predictions.pool_id
      and pool_memberships.user_id = auth.uid()
      and pool_memberships.status = 'approved'
  )
);

drop policy if exists "group_predictions_admin_all" on public.group_predictions;
create policy "group_predictions_admin_all"
on public.group_predictions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "final_predictions_select_authenticated" on public.final_predictions;
create policy "final_predictions_select_authenticated"
on public.final_predictions for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.pool_memberships
    where pool_memberships.pool_id = final_predictions.pool_id
      and pool_memberships.user_id = auth.uid()
      and pool_memberships.status = 'approved'
  )
);

drop policy if exists "final_predictions_insert_own" on public.final_predictions;
create policy "final_predictions_insert_own"
on public.final_predictions for insert
to authenticated
with check (
  auth.uid() = user_id
  and locked = true
  and exists (
    select 1 from public.pool_memberships
    where pool_memberships.pool_id = final_predictions.pool_id
      and pool_memberships.user_id = auth.uid()
      and pool_memberships.status = 'approved'
  )
);

drop policy if exists "final_predictions_admin_all" on public.final_predictions;
create policy "final_predictions_admin_all"
on public.final_predictions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "settings_select_authenticated" on public.app_settings;
create policy "settings_select_authenticated"
on public.app_settings for select
to authenticated
using (true);

drop policy if exists "settings_admin_all" on public.app_settings;
create policy "settings_admin_all"
on public.app_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.teams (id, name, group_name, flag_url) values
  ('00000000-0000-0000-0000-0000000000a1', 'Brasil', 'A', null),
  ('00000000-0000-0000-0000-0000000000a2', 'Alemanha', 'A', null),
  ('00000000-0000-0000-0000-0000000000a3', 'Japão', 'A', null),
  ('00000000-0000-0000-0000-0000000000a4', 'Marrocos', 'A', null),
  ('00000000-0000-0000-0000-0000000000b1', 'Argentina', 'B', null),
  ('00000000-0000-0000-0000-0000000000b2', 'França', 'B', null),
  ('00000000-0000-0000-0000-0000000000b3', 'Estados Unidos', 'B', null),
  ('00000000-0000-0000-0000-0000000000b4', 'Senegal', 'B', null)
on conflict (id) do nothing;

insert into public.matches (
  id,
  team_a_id,
  team_b_id,
  group_name,
  stage,
  starts_at
) values
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-0000000000a2',
    'A',
    'Fase de grupos',
    '2026-06-11 19:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4',
    'A',
    'Fase de grupos',
    '2026-06-12 19:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-0000000000b1',
    '00000000-0000-0000-0000-0000000000b2',
    'B',
    'Fase de grupos',
    '2026-06-13 22:00:00+00'
  )
on conflict (id) do nothing;

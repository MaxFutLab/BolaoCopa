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

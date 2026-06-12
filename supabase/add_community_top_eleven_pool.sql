insert into public.pool_competitions (id, name, description, is_active)
values (
  '10000000-0000-0000-0000-000000000003',
  'Comunidade Top Eleven Brasil',
  'Bolao da comunidade Top Eleven Brasil.',
  true
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active;

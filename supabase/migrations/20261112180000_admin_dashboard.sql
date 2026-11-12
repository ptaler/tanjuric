-- Administracija: popis administratora i funkcije za admin dashboard (admin.html).
--
-- RLS i dalje svakom korisniku dopušta samo vlastite retke. Admin dashboard ne
-- čita tablice izravno nego zove funkcije ispod (security definer), koje prvo
-- provjere je li pozivatelj u public.admins, a vraćaju samo zbirne podatke i
-- brojke po korisniku: nikad imena djece, jela, bilješke ni fotografije.
--
-- Administrator se dodaje ručno (SQL editor u Supabaseu), npr.:
--   insert into public.admins (user_id, note)
--   select id, 'vlasnik' from auth.users where email = '<email>';

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

-- Bez pravila (policy): tablici se ne može pristupiti preko API-ja, samo kroz funkcije.
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

-- Zbirni pregled aplikacije za zadnjih p_days dana (7–365).
-- Dani se računaju po hrvatskom vremenu. "Aktivnost" = svaki upis ili izmjena
-- podataka (dijete, obrok, lijek, doza, temperatura, termin terapije).
create function public.admin_overview(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tz    constant text := 'Europe/Zagreb';
  ndays integer := least(greatest(coalesce(p_days, 30), 7), 365);
  today date := (now() at time zone tz)::date;
  since date := today - (ndays - 1);
  since_ts timestamptz := (since::timestamp at time zone tz);
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Nemaš administratorska prava.' using errcode = '42501';
  end if;

  with
  usr as (
    select u.id, u.created_at, u.last_sign_in_at from auth.users u where u.deleted_at is null
  ),
  act as (
    select user_id, created_at as ts from public.children  union all select user_id, updated_at from public.children
    union all select user_id, created_at from public.meals     union all select user_id, updated_at from public.meals
    union all select user_id, created_at from public.meds      union all select user_id, updated_at from public.meds
    union all select user_id, created_at from public.doses     union all select user_id, updated_at from public.doses
    union all select user_id, created_at from public.temps     union all select user_id, updated_at from public.temps
    union all select user_id, created_at from public.med_slots union all select user_id, updated_at from public.med_slots
  ),
  entries as (   -- upisi u dnevnik (bez djece i popisa lijekova)
    select user_id, 'meals' as kind, created_at from public.meals
    union all select user_id, 'doses', created_at from public.doses
    union all select user_id, 'temps', created_at from public.temps
  ),
  photo as (
    select o.name, coalesce((o.metadata->>'size')::bigint, 0) as bytes
    from storage.objects o where o.bucket_id = 'photos'
  ),
  days as (
    select g::date as d from generate_series(since, today, interval '1 day') g
  ),
  entry_days as (   -- broj različitih dana s upisom, po korisniku
    select user_id, count(distinct (created_at at time zone tz)::date) as n from entries group by user_id
  ),
  child_count as (
    select u.id, (select count(*) from public.children c where c.user_id = u.id) as n from usr u
  ),
  react as (
    select * from public.meals where reaction
  )
  select jsonb_build_object(
    'generated_at', now(),
    'days', ndays,
    'since', since,
    'totals', jsonb_build_object(
      'users',          (select count(*) from usr),
      'children',       (select count(*) from public.children),
      'meals',          (select count(*) from public.meals),
      'reactions',      (select count(*) from react),
      'meds',           (select count(*) from public.meds),
      'scheduled_meds', (select count(*) from public.meds where cardinality(times) > 0),
      'doses',          (select count(*) from public.doses),
      'planned_doses',  (select count(*) from public.doses where slot is not null),
      'skipped_slots',  (select count(*) from public.med_slots where skipped),
      'temps',          (select count(*) from public.temps),
      'fevers',         (select count(*) from public.temps where value >= 38),
      'photos',         (select count(*) from photo where name not like '%\_t.jpg'),
      'photo_bytes',    (select coalesce(sum(bytes), 0) from photo),
      'inline_photos',  (select count(*) from public.meals where photo like 'data:%')
    ),
    'users', jsonb_build_object(
      'new_7',        (select count(*) from usr where created_at >= now() - interval '7 days'),
      'new_period',   (select count(*) from usr where created_at >= since_ts),
      'active_1',     (select count(distinct user_id) from act where ts >= now() - interval '1 day'),
      'active_7',     (select count(distinct user_id) from act where ts >= now() - interval '7 days'),
      'active_30',    (select count(distinct user_id) from act where ts >= now() - interval '30 days'),
      'active_period',(select count(distinct user_id) from act where ts >= since_ts),
      'signed_in_7',  (select count(*) from usr where last_sign_in_at >= now() - interval '7 days'),
      'entries_period', (select count(*) from entries where created_at >= since_ts)
    ),
    'funnel', jsonb_build_array(
      jsonb_build_object('key', 'registered', 'n', (select count(*) from usr)),
      jsonb_build_object('key', 'child',      'n', (select count(*) from child_count where n > 0)),
      jsonb_build_object('key', 'entry',      'n', (select count(*) from entry_days)),
      jsonb_build_object('key', 'three_days', 'n', (select count(*) from entry_days where n >= 3)),
      jsonb_build_object('key', 'active_7',   'n', (select count(distinct user_id) from act where ts >= now() - interval '7 days'))
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'd', d.d,
        'signups', (select count(*) from usr u where (u.created_at at time zone tz)::date = d.d),
        'meals',   (select count(*) from entries e where e.kind = 'meals' and (e.created_at at time zone tz)::date = d.d),
        'doses',   (select count(*) from entries e where e.kind = 'doses' and (e.created_at at time zone tz)::date = d.d),
        'temps',   (select count(*) from entries e where e.kind = 'temps' and (e.created_at at time zone tz)::date = d.d),
        'active',  (select count(distinct a.user_id) from act a where (a.ts at time zone tz)::date = d.d)
      ) order by d.d), '[]'::jsonb)
      from days d
    ),
    'hours', (   -- kada korisnici upisuju (sat u danu, hrvatsko vrijeme), u odabranom razdoblju
      select jsonb_agg(coalesce(x.n, 0) order by h)
      from generate_series(0, 23) h
      left join (
        select extract(hour from created_at at time zone tz)::int as hr, count(*) as n
        from entries where created_at >= since_ts group by 1
      ) x on x.hr = h
    ),
    'weekdays', (   -- 1 = ponedjeljak … 7 = nedjelja
      select jsonb_agg(coalesce(x.n, 0) order by w)
      from generate_series(1, 7) w
      left join (
        select extract(isodow from created_at at time zone tz)::int as wd, count(*) as n
        from entries where created_at >= since_ts group by 1
      ) x on x.wd = w
    ),
    'allergens', (
      select coalesce(jsonb_agg(jsonb_build_object('name', a, 'meals', n, 'reactions', r) order by r desc, n desc, a), '[]'::jsonb)
      from (
        select a, count(*) as n, count(*) filter (where m.reaction) as r
        from public.meals m, unnest(m.allergens) a group by a
      ) s
    ),
    'symptoms', (
      select coalesce(jsonb_agg(jsonb_build_object('name', s, 'n', n) order by n desc, s), '[]'::jsonb)
      from (select s, count(*) as n from react m, unnest(m.symptoms) s group by s) x
    ),
    'severity', (
      select coalesce(jsonb_object_agg(coalesce(nullif(severity, ''), '—'), n), '{}'::jsonb)
      from (select severity, count(*) as n from react group by severity) x
    ),
    'meal_types', (
      select coalesce(jsonb_agg(jsonb_build_object('name', t, 'n', n) order by n desc, t), '[]'::jsonb)
      from (select coalesce(nullif(type, ''), '—') as t, count(*) as n from public.meals group by 1) x
    ),
    'temp_methods', (
      select coalesce(jsonb_agg(jsonb_build_object('name', t, 'n', n) order by n desc, t), '[]'::jsonb)
      from (select coalesce(nullif(method, ''), '—') as t, count(*) as n from public.temps group by 1) x
    ),
    'children_per_user', (
      select jsonb_build_object(
        '0',  count(*) filter (where n = 0),
        '1',  count(*) filter (where n = 1),
        '2',  count(*) filter (where n = 2),
        '3+', count(*) filter (where n >= 3))
      from child_count
    )
  ) into result;

  return result;
end;
$$;

-- Popis korisnika s brojem zapisa po vrsti i vremenom zadnje aktivnosti.
create function public.admin_users() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tz constant text := 'Europe/Zagreb';
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Nemaš administratorska prava.' using errcode = '42501';
  end if;

  with
  act as (
    select user_id, updated_at as ts from public.children
    union all select user_id, updated_at from public.meals
    union all select user_id, updated_at from public.meds
    union all select user_id, updated_at from public.doses
    union all select user_id, updated_at from public.temps
    union all select user_id, updated_at from public.med_slots
  ),
  last_act as (
    select user_id, max(ts) as last_ts,
      count(distinct (ts at time zone tz)::date) filter (where ts >= now() - interval '30 days') as days_30
    from act group by user_id
  ),
  c  as (select user_id, count(*) as n from public.children group by user_id),
  m  as (select user_id, count(*) as n, count(*) filter (where reaction) as r from public.meals group by user_id),
  md as (select user_id, count(*) as n from public.meds group by user_id),
  d  as (select user_id, count(*) as n from public.doses group by user_id),
  t  as (select user_id, count(*) as n from public.temps group by user_id),
  p  as (
    select split_part(name, '/', 1) as uid,
      count(*) filter (where name not like '%\_t.jpg') as n,
      sum(coalesce((metadata->>'size')::bigint, 0)) as bytes
    from storage.objects where bucket_id = 'photos' group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'name', coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
    'provider', coalesce(u.raw_app_meta_data->>'provider', ''),
    'created_at', u.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'last_activity', la.last_ts,
    'active_days_30', coalesce(la.days_30, 0),
    'children', coalesce(c.n, 0),
    'meals', coalesce(m.n, 0),
    'reactions', coalesce(m.r, 0),
    'meds', coalesce(md.n, 0),
    'doses', coalesce(d.n, 0),
    'temps', coalesce(t.n, 0),
    'photos', coalesce(p.n, 0),
    'photo_bytes', coalesce(p.bytes, 0),
    'is_admin', exists (select 1 from public.admins a where a.user_id = u.id)
  ) order by u.created_at desc), '[]'::jsonb)
  into result
  from auth.users u
  left join last_act la on la.user_id = u.id
  left join c  on c.user_id  = u.id
  left join m  on m.user_id  = u.id
  left join md on md.user_id = u.id
  left join d  on d.user_id  = u.id
  left join t  on t.user_id  = u.id
  left join p  on p.uid = u.id::text
  where u.deleted_at is null;

  return result;
end;
$$;

-- Supabase funkcijama u public shemi daje EXECUTE i ulogama anon/authenticated.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.admin_overview(integer) from public, anon;
revoke execute on function public.admin_users() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_overview(integer) to authenticated;
grant execute on function public.admin_users() to authenticated;

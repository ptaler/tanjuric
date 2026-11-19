-- Podsjetnik za svakodnevnu terapiju nakon pomaka termina.
--
-- Ključ obavijesti (private.push_sent) sadržavao je samo izvorni termin (npr. 16:00). Ako je
-- termin za taj dan pomaknut nakon što je podsjetnik već poslan, novi termin dijelio je isti
-- ključ i podsjetnik u novo vrijeme nije stigao. Ključ sada sadrži i stvarno vrijeme za taj
-- dan, pa svaki pomak dobiva svoj podsjetnik (i dalje samo jednom po vremenu).

create or replace function public.push_due() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  res jsonb;
begin
  delete from private.push_sent where sent_at < now() - interval '2 days';

  with subs as (
    select s.id, s.user_id, s.tz, s.daily, s.partner, (now() at time zone s.tz)::date as today
    from public.push_subscriptions s
  ),
  access as (
    select s.id as sub_id, c.user_id as owner_id, c.id as child_id, c.name as child_name
    from subs s
    join public.children c
      on c.user_id = s.user_id
      or exists (select 1 from public.child_members m
                 where m.owner_id = c.user_id and m.child_id = c.id and m.member_id = s.user_id)
  ),
  daily as (
    select s.id as sub_id,
      'd|' || a.owner_id || '|' || md.id || '|' || d.day || '|' || t.slot || '|' || coalesce(ms.time, t.slot) as key,
      jsonb_build_object('kind', 'daily', 'child', a.child_name, 'child_id', a.child_id, 'med', md.name,
        'dose', md.dose, 'unit', md.unit, 'time', coalesce(ms.time, t.slot)) as msg
    from subs s
    join access a on a.sub_id = s.id
    join public.meds md on md.user_id = a.owner_id and md.child_id = a.child_id and cardinality(md.times) > 0
    cross join lateral (values (s.today), (s.today - 1)) as d (day)
    cross join lateral unnest(md.times) as t (slot)
    left join public.med_slots ms
      on ms.user_id = a.owner_id and ms.med_id = md.id and ms.date = d.day and ms.slot = t.slot
    where s.daily
      and (md.since is null or md.since <= d.day)
      and (md.until is null or d.day <= md.until)
      and not coalesce(ms.skipped, false)
      and ((d.day + coalesce(ms.time, t.slot)::time) at time zone s.tz) between now() - interval '15 minutes' and now()
      and not exists (select 1 from public.doses x
                      where x.user_id = a.owner_id and x.med_id = md.id and x.slot_date = d.day and x.slot = t.slot)
  ),
  gap as (
    select s.id as sub_id, 'g|' || x.user_id || '|' || x.id as key,
      jsonb_build_object('kind', 'gap', 'child', a.child_name, 'child_id', a.child_id,
        'med', coalesce(md.name, x.med_name), 'hours', md.interval_h, 'time', x.time) as msg
    from subs s
    join access a on a.sub_id = s.id
    join public.doses x on x.user_id = a.owner_id and x.child_id = a.child_id
    left join public.meds md on md.user_id = x.user_id and md.id = x.med_id
    where x.remind_by = s.user_id
      and x.remind_at between now() - interval '15 minutes' and now()
      -- u međuvremenu je dana nova doza istog lijeka: podsjetnik više nema smisla
      and not exists (select 1 from public.doses y
                      where y.user_id = x.user_id and y.med_id = x.med_id and y.id <> x.id
                        and y.date + y.time::time > x.date + x.time::time)
  ),
  partner as (
    select s.id as sub_id, 'p|' || x.user_id || '|' || x.id as key,
      jsonb_build_object('kind', 'partner', 'child', a.child_name, 'child_id', a.child_id, 'med', x.med_name,
        'dose', x.dose, 'unit', x.unit, 'time', x.time,
        'who', coalesce(nullif(split_part(coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), u.raw_user_meta_data->>'name', ''), ' ', 1), ''),
                        split_part(coalesce(u.email, ''), '@', 1))) as msg
    from subs s
    join access a on a.sub_id = s.id
    join public.doses x on x.user_id = a.owner_id and x.child_id = a.child_id
    join auth.users u on u.id = x.created_by
    where s.partner
      and x.created_by <> s.user_id
      and x.created_at between now() - interval '15 minutes' and now()
      -- naknadno upisane stare doze ne javljaju se
      and ((x.date + x.time::time) at time zone s.tz) > now() - interval '6 hours'
  ),
  due as (
    select distinct on (sub_id, key) sub_id, key, msg
    from (select * from daily union all select * from gap union all select * from partner) q
  ),
  claimed as (
    insert into private.push_sent (sub_id, key)
    select sub_id, key from due
    on conflict do nothing
    returning sub_id, key
  )
  select coalesce(jsonb_agg(d.msg || jsonb_build_object('sub', s.id, 'key', c.key, 'endpoint', s.endpoint,
           'p256dh', s.p256dh, 'auth', s.auth, 'lang', s.lang)), '[]'::jsonb)
  into res
  from claimed c
  join due d on d.sub_id = c.sub_id and d.key = c.key
  join public.push_subscriptions s on s.id = c.sub_id;

  return res;
end;
$$;

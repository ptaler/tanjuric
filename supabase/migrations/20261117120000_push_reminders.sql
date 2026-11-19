-- Podsjetnici (Web Push).
--
-- Uređaj se pretplati na obavijesti (push_subscribe) i postaje redak u push_subscriptions.
-- pg_cron svake minute poziva Edge Function push-reminders, koja preko push_due() dobije
-- obavijesti koje treba poslati i pošalje ih servisu preglednika (FCM, Apple, Mozilla, Windows).
--
-- Tri vrste obavijesti:
--   daily   — termin svakodnevne terapije je došao, a nije potvrđen ni preskočen;
--   gap     — prošao je najmanji razmak od doze za koju je korisnik tražio podsjetnik (doses.remind_at);
--   partner — netko drugi s pristupom djetetu upisao je dozu.
--
-- Ključevi VAPID (za potpis prema servisima) nastaju u Edge Functionu pri prvom pozivu i čuvaju
-- se u private.push_config, kao i tajna kojom cron dokazuje da poziv dolazi iz baze.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.push_config (
  id            boolean primary key default true check (id),
  cron_secret   text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  vapid_public  text,
  vapid_private jsonb,
  created_at    timestamptz not null default now()
);
insert into private.push_config default values;

-- ---------- doze: tko je upisao, podsjetnik nakon razmaka ----------

alter table public.doses
  add column created_by uuid,
  add column remind_at  timestamptz,
  add column remind_by  uuid;

create index doses_remind_idx on public.doses (remind_at) where remind_at is not null;

-- created_by i remind_by postavlja baza (klijent ih ne šalje i ne može ih podmetnuti).
create function public.doses_authorship() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
  else
    new.created_by := old.created_by;
  end if;
  if new.remind_at is null then
    new.remind_by := null;
  elsif tg_op = 'INSERT' or new.remind_at is distinct from old.remind_at then
    new.remind_by := (select auth.uid());
  else
    new.remind_by := old.remind_by;
  end if;
  return new;
end;
$$;

create trigger doses_authorship before insert or update on public.doses
  for each row execute function public.doses_authorship();

-- ---------- pretplate uređaja ----------

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- samo servisi preglednika: Edge Function šalje zahtjev na ovu adresu
  endpoint   text not null unique check (char_length(endpoint) <= 1000 and endpoint ~
    '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'),
  p256dh     text not null check (p256dh ~ '^[A-Za-z0-9_-]{80,100}$'),
  auth       text not null check (auth ~ '^[A-Za-z0-9_-]{16,32}$'),
  tz         text not null default 'Europe/Zagreb',
  lang       text not null default 'hr' check (lang in ('hr', 'en')),
  daily      boolean not null default true,
  partner    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;
create policy "push: own" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "push: remove own" on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Upis i promjena postavki uređaja. Isti uređaj (endpoint) prelazi na korisnika koji je
-- trenutno prijavljen, pa nakon promjene računa obavijesti ne idu prethodnom korisniku.
create function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_tz text, p_lang text,
  p_daily boolean, p_partner boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me  uuid := (select auth.uid());
  v_tz text := case when exists (select 1 from pg_catalog.pg_timezone_names n where n.name = p_tz) then p_tz else 'Europe/Zagreb' end;
  rec public.push_subscriptions;
begin
  if me is null then
    raise exception 'Potrebna je prijava.' using errcode = '42501';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, tz, lang, daily, partner)
  values (me, p_endpoint, p_p256dh, p_auth, v_tz, case when p_lang = 'en' then 'en' else 'hr' end,
          coalesce(p_daily, true), coalesce(p_partner, true))
  on conflict (endpoint) do update set
    user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, tz = excluded.tz,
    lang = excluded.lang, daily = excluded.daily, partner = excluded.partner, updated_at = now()
  returning * into rec;
  return jsonb_build_object('daily', rec.daily, 'partner', rec.partner);
end;
$$;

-- Javni ključ VAPID za pretplatu u pregledniku (null dok ga Edge Function prvi put ne napravi).
create function public.push_public_key() returns text
language sql stable security definer set search_path = '' as $$
  select c.vapid_public from private.push_config c;
$$;

revoke execute on function public.push_subscribe(text, text, text, text, text, boolean, boolean) from public, anon;
revoke execute on function public.push_public_key() from public, anon;
grant execute on function public.push_subscribe(text, text, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.push_public_key() to authenticated;

-- ---------- slanje (samo Edge Function, ključem service_role) ----------

create table private.push_sent (
  sub_id  uuid not null references public.push_subscriptions (id) on delete cascade,
  key     text not null,
  sent_at timestamptz not null default now(),
  primary key (sub_id, key)
);

create function public.push_job_config() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('cron_secret', c.cron_secret, 'vapid_public', c.vapid_public, 'vapid_private', c.vapid_private)
  from private.push_config c;
$$;

-- Prvi poziv postavlja ključeve; ako su već postavljeni, ostaju (istodobni pozivi).
create function public.push_set_vapid(p_public text, p_private jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  update private.push_config set vapid_public = p_public, vapid_private = p_private where vapid_public is null;
  return public.push_job_config();
end;
$$;

-- Obavijesti koje treba poslati sada. Svaku (uređaj + ključ) zauzme u push_sent, pa je
-- istodobni ili ponovljeni poziv ne vrati drugi put. Gleda 15 minuta unatrag, za slučaj
-- da je koji poziv crona izostao.
create function public.push_due() returns jsonb
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
      'd|' || a.owner_id || '|' || md.id || '|' || d.day || '|' || t.slot as key,
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

-- Slanje nije uspjelo zbog privremene greške: oslobodi ključeve za sljedeći pokušaj.
create function public.push_unclaim(p_items jsonb) returns void
language sql volatile security definer set search_path = '' as $$
  delete from private.push_sent p
  using jsonb_to_recordset(p_items) as i (sub uuid, key text)
  where p.sub_id = i.sub and p.key = i.key;
$$;

-- Servis je javio da pretplata više ne postoji (404/410): ukloni uređaj.
create function public.push_drop(p_ids uuid[]) returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.push_subscriptions s where s.id = any (p_ids);
$$;

do $$
declare f text;
begin
  foreach f in array array['push_job_config()', 'push_set_vapid(text, jsonb)', 'push_due()', 'push_unclaim(jsonb)', 'push_drop(uuid[])'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;

-- ---------- cron: svake minute ----------
-- Poziva se samo kad ima pretplata (ili dok još nema ključeva VAPID, da nastanu).

select cron.schedule('push-reminders', '* * * * *', $job$
  select net.http_post(
    url := 'https://winipyhywkgcdmekkfct.supabase.co/functions/v1/push-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', c.cron_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000)
  from private.push_config c
  where c.vapid_public is null or exists (select 1 from public.push_subscriptions);
$job$);

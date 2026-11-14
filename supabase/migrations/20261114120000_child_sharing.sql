-- Dijeljenje djeteta između više korisnika (npr. oba roditelja).
--
-- Vlasnik djeteta ostaje children.user_id i svi zapisi djeteta (obroci, lijekovi,
-- doze, temperature, termini) i dalje nose user_id vlasnika, bez obzira na to tko
-- ih je upisao. Drugi korisnik dobiva pristup preko public.child_members.
--
-- Tijek: vlasnik napravi pozivnicu (create_child_invite) i pošalje poveznicu
-- ?pozivnica=<token>. Pozvani se prijavi, vidi o kojem je djetetu riječ
-- (child_invite_info) i prihvati je (accept_child_invite). Pozivnica vrijedi
-- 7 dana i može se iskoristiti jednom.
--
-- Prava člana: vidi i mijenja sve zapise djeteta, mijenja ime i alergije, ali ne
-- može obrisati dijete ni pozivati druge. Vlasnik može ukloniti člana, a član
-- sebe (ukloni dijete sa svog računa); zapisi pritom ostaju vlasniku.

create table public.child_members (
  owner_id   uuid not null,
  child_id   text not null,
  member_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, child_id, member_id),
  foreign key (owner_id, child_id) references public.children (user_id, id) on delete cascade on update cascade,
  check (member_id <> owner_id)
);

create index child_members_member_idx on public.child_members (member_id);

alter table public.child_members enable row level security;
revoke all on public.child_members from anon, authenticated;
grant select, delete on public.child_members to authenticated;

-- Članstvo vide vlasnik i član; upis ide samo kroz accept_child_invite().
create policy "members: read" on public.child_members for select to authenticated
  using (owner_id = (select auth.uid()) or member_id = (select auth.uid()));
create policy "members: remove" on public.child_members for delete to authenticated
  using (owner_id = (select auth.uid()) or member_id = (select auth.uid()));

create table public.child_invites (
  token      text primary key check (token ~ '^[0-9a-f]{32}$'),
  owner_id   uuid not null,
  child_id   text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  foreign key (owner_id, child_id) references public.children (user_id, id) on delete cascade on update cascade
);

create index child_invites_child_idx on public.child_invites (owner_id, child_id);

-- Vlasnik vidi i poništava svoje pozivnice; nastaju samo kroz create_child_invite().
alter table public.child_invites enable row level security;
revoke all on public.child_invites from anon, authenticated;
grant select, delete on public.child_invites to authenticated;
create policy "invites: own" on public.child_invites for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "invites: cancel own" on public.child_invites for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------- RLS: vlastiti ili podijeljeni retci ----------
-- Podupit ne ovisi o retku pa ga Postgres izračuna jednom (hashed subplan).

drop policy "own rows" on public.children;
create policy "children: read own or shared" on public.children for select to authenticated
  using (user_id = (select auth.uid())
    or (user_id, id) in (select m.owner_id, m.child_id from public.child_members m where m.member_id = (select auth.uid())));
create policy "children: update own or shared" on public.children for update to authenticated
  using (user_id = (select auth.uid())
    or (user_id, id) in (select m.owner_id, m.child_id from public.child_members m where m.member_id = (select auth.uid())))
  with check (user_id = (select auth.uid())
    or (user_id, id) in (select m.owner_id, m.child_id from public.child_members m where m.member_id = (select auth.uid())));
create policy "children: insert own" on public.children for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "children: delete own" on public.children for delete to authenticated
  using (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['meals', 'meds', 'doses', 'temps', 'med_slots'] loop
    execute format('drop policy "own rows" on public.%I', t);
    execute format($p$
      create policy "own or shared child" on public.%I for all to authenticated
        using (user_id = (select auth.uid())
          or (user_id, child_id) in (select m.owner_id, m.child_id from public.child_members m where m.member_id = (select auth.uid())))
        with check (user_id = (select auth.uid())
          or (user_id, child_id) in (select m.owner_id, m.child_id from public.child_members m where m.member_id = (select auth.uid())))
    $p$, t);
  end loop;
end;
$$;

-- ---------- fotografije ----------
-- Fotografija obroka spremljena je u mapi vlasnika djeteta (<owner_id>/<id>.jpg), pa i
-- član sprema u vlasnikovu mapu. Član smije čitati samo slike obroka koje vidi.

create policy "photos: read shared" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and exists (
    select 1 from public.meals m
    where m.user_id::text = (storage.foldername(name))[1]
      and m.photo in (name, regexp_replace(name, '_t\.jpg$', '.jpg'))));

create policy "photos: upload shared" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] in (
    select m.owner_id::text from public.child_members m where m.member_id = (select auth.uid())));

-- ---------- funkcije ----------

create function public.user_label(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', u.id,
    'name', coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), nullif(u.raw_user_meta_data->>'name', ''), ''),
    'email', coalesce(u.email, ''))
  from auth.users u where u.id = p_id;
$$;
revoke execute on function public.user_label(uuid) from public, anon, authenticated;

-- Nova pozivnica za dijete; prethodne neiskorištene pozivnice za to dijete prestaju vrijediti.
create function public.create_child_invite(p_child_id text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me  uuid := (select auth.uid());
  inv public.child_invites;
begin
  if me is null or not exists (select 1 from public.children c where c.user_id = me and c.id = p_child_id) then
    raise exception 'Pozivnicu može napraviti samo vlasnik djeteta.' using errcode = '42501';
  end if;
  delete from public.child_invites i where i.owner_id = me and (i.child_id = p_child_id or i.expires_at < now());
  insert into public.child_invites (token, owner_id, child_id)
  values (replace(gen_random_uuid()::text, '-', ''), me, p_child_id)
  returning * into inv;
  return jsonb_build_object('token', inv.token, 'child_id', inv.child_id, 'expires_at', inv.expires_at);
end;
$$;

-- Što piše u pozivnici (prije prihvaćanja). status: ok | own | member | invalid
create function public.child_invite_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me  uuid := (select auth.uid());
  inv public.child_invites;
  child_name text;
begin
  select * into inv from public.child_invites i where i.token = p_token and i.expires_at > now();
  if me is null or not found then
    return jsonb_build_object('status', 'invalid');
  end if;
  select c.name into child_name from public.children c where c.user_id = inv.owner_id and c.id = inv.child_id;
  return jsonb_build_object(
    'status', case
      when inv.owner_id = me then 'own'
      when exists (select 1 from public.child_members m
                   where m.owner_id = inv.owner_id and m.child_id = inv.child_id and m.member_id = me) then 'member'
      else 'ok' end,
    'child_id', inv.child_id,
    'child_name', child_name,
    'owner', public.user_label(inv.owner_id));
end;
$$;

create function public.accept_child_invite(p_token text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me  uuid := (select auth.uid());
  inv public.child_invites;
begin
  select * into inv from public.child_invites i where i.token = p_token and i.expires_at > now() for update;
  if me is null or not found then
    raise exception 'Pozivnica ne postoji ili je istekla.' using errcode = 'P0002';
  end if;
  if inv.owner_id = me then
    raise exception 'Ovo je tvoje dijete.' using errcode = '22023';
  end if;
  insert into public.child_members (owner_id, child_id, member_id)
  values (inv.owner_id, inv.child_id, me)
  on conflict do nothing;
  if found then
    delete from public.child_invites i where i.token = inv.token;
  end if;
  return jsonb_build_object('owner_id', inv.owner_id, 'child_id', inv.child_id);
end;
$$;

-- Za svako podijeljeno dijete koje korisnik vidi: vlasnik i svi članovi (ime i email).
create function public.child_shares() returns jsonb
language sql stable security definer set search_path = '' as $$
  with mine as (
    select distinct m.owner_id, m.child_id
    from public.child_members m
    where m.owner_id = (select auth.uid()) or m.member_id = (select auth.uid())
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'owner_id', s.owner_id,
    'child_id', s.child_id,
    'owner', public.user_label(s.owner_id),
    'members', (
      select jsonb_agg(public.user_label(m.member_id) || jsonb_build_object('since', m.created_at) order by m.created_at)
      from public.child_members m where m.owner_id = s.owner_id and m.child_id = s.child_id)
  )), '[]'::jsonb)
  from mine s;
$$;

revoke execute on function public.create_child_invite(text) from public, anon;
revoke execute on function public.child_invite_info(text) from public, anon;
revoke execute on function public.accept_child_invite(text) from public, anon;
revoke execute on function public.child_shares() from public, anon;
grant execute on function public.create_child_invite(text) to authenticated;
grant execute on function public.child_invite_info(text) to authenticated;
grant execute on function public.accept_child_invite(text) to authenticated;
grant execute on function public.child_shares() to authenticated;

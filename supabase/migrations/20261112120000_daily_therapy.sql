-- Svakodnevne terapije u zadano vrijeme.
-- meds.times: termini u danu ("HH:MM"); since/until: razdoblje u kojem raspored vrijedi.
-- doses.slot_date/slot: koji termin rasporeda ova doza potvrđuje (null = obična, neplanirana doza).
-- med_slots: promjene za pojedini dan (pomaknuto vrijeme ili preskočeno).

alter table public.meds
  add column times text[] not null default '{}'
    check (cardinality(times) <= 12
      and array_to_string(times, ',') ~ '^([0-2][0-9]:[0-5][0-9](,[0-2][0-9]:[0-5][0-9])*)?$'),
  add column since date,
  add column until date,
  add constraint meds_period_order_check check (until is null or since is null or until >= since);

alter table public.doses
  add column slot_date date,
  add column slot text check (slot ~ '^[0-2][0-9]:[0-5][0-9]$'),
  add constraint doses_slot_pair_check check ((slot is null) = (slot_date is null));

create table public.med_slots (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 100),
  child_id   text not null,
  med_id     text not null,
  date       date not null,
  slot       text not null check (slot ~ '^[0-2][0-9]:[0-5][0-9]$'),
  time       text check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  skipped    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, child_id) references public.children (user_id, id) on delete cascade
);

create index med_slots_child_idx on public.med_slots (user_id, child_id);

create trigger med_slots_touch before update on public.med_slots
  for each row execute function public.touch_updated_at();
alter table public.med_slots enable row level security;
create policy "own rows" on public.med_slots for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.med_slots from anon;
grant select, insert, update, delete on public.med_slots to authenticated;

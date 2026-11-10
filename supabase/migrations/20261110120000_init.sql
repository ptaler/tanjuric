-- Tanjurić: početna shema.
-- Svaki redak pripada jednom korisniku (user_id). ID-jeve generira klijent (tekst),
-- pa je primarni ključ (user_id, id). RLS: korisnik vidi i mijenja samo svoje retke.

create table public.children (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 64),
  name       text not null check (char_length(name) between 1 and 40),
  allergies  text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.meals (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 64),
  child_id   text not null,
  date       date not null,
  time       text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  type       text not null default '',
  food       text not null check (char_length(food) between 1 and 300),
  allergens  text[] not null default '{}',
  reaction   boolean not null default false,
  symptoms   text[] not null default '{}',
  severity   text not null default '',
  onset      integer check (onset between 0 and 1440),
  note       text not null default '' check (char_length(note) <= 2000),
  photo      text not null default '' check (char_length(photo) <= 400000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, child_id) references public.children (user_id, id) on delete cascade
);

create table public.meds (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 64),
  child_id   text not null,
  name       text not null check (char_length(name) between 1 and 80),
  unit       text not null default 'ml',
  dose       numeric check (dose > 0),
  interval_h numeric check (interval_h > 0 and interval_h <= 168),
  note       text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, child_id) references public.children (user_id, id) on delete cascade
);

-- med_id namjerno nema strani ključ: lijek se smije ukloniti iz popisa,
-- a već upisane doze ostaju (med_name i unit su kopija u trenutku upisa).
create table public.doses (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 64),
  child_id   text not null,
  med_id     text,
  med_name   text not null check (char_length(med_name) between 1 and 80),
  unit       text not null default '',
  date       date not null,
  time       text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  dose       numeric not null check (dose > 0),
  note       text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, child_id) references public.children (user_id, id) on delete cascade
);

create table public.temps (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 64),
  child_id   text not null,
  date       date not null,
  time       text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  value      numeric(3,1) not null check (value between 34 and 43),
  method     text not null default '',
  note       text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, child_id) references public.children (user_id, id) on delete cascade
);

create index meals_child_idx on public.meals (user_id, child_id);
create index meds_child_idx  on public.meds  (user_id, child_id);
create index doses_child_idx on public.doses (user_id, child_id);
create index temps_child_idx on public.temps (user_id, child_id);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['children', 'meals', 'meds', 'doses', 'temps'] loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

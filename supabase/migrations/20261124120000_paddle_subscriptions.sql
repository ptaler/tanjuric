-- Pretplate (Paddle).
--
-- Paddle je prodavač (Merchant of Record): naplaćuje, obračunava PDV i izdaje račune kupcima.
-- Stanje pretplate javlja webhookom Edge Functionu paddle-webhook, koja ga preko
-- paddle_apply_subscription() upisuje ovdje. Klijent tablicu samo čita (vlastite retke).
--
-- Pretplata se s računom povezuje preko custom_data.user_id, koji klijent šalje pri otvaranju
-- Paddle Checkouta, a Paddle ga prenosi na pretplatu. Podatak dolazi iz preglednika, pa
-- najgore što netko može je platiti pretplatu tuđem računu.
--
-- Paddle ne jamči redoslijed webhooka: svaki redak pamti occurred_at zadnjeg primijenjenog
-- događaja (event_at), a stariji događaj ga ne prepisuje. Ponovljeni događaj ne mijenja ništa.

create table public.subscriptions (
  id                 text primary key check (id ~ '^sub_[a-z0-9]{1,60}$'),
  user_id            uuid references auth.users (id) on delete set null,
  customer_id        text not null check (customer_id ~ '^ctm_[a-z0-9]{1,60}$'),
  status             text not null check (status in ('active', 'trialing', 'past_due', 'paused', 'canceled')),
  price_id           text check (char_length(price_id) <= 64),
  product_id         text check (char_length(product_id) <= 64),
  billing_interval   text check (billing_interval in ('day', 'week', 'month', 'year')),
  current_period_end timestamptz,
  trial_end          timestamptz,
  cancel_at          timestamptz,   -- otkazana na kraju razdoblja: do tada vrijedi
  canceled_at        timestamptz,
  event_at           timestamptz not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
create policy "subscriptions: own" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- Ima li prijavljeni korisnik premium. past_due: Paddle još pokušava naplatiti, pa pristup
-- ostaje dok ne odustane (tada status prelazi u canceled ili paused).
-- TODO: kad se odluči, proširiti na roditelje s kojima je dijete podijeljeno (child_members).
create function public.has_premium() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.subscriptions s
                 where s.user_id = (select auth.uid())
                   and s.status in ('active', 'trialing', 'past_due'));
$$;

-- Upis stanja pretplate iz webhooka (samo Edge Function, ključem service_role).
-- p: redak koji složi paddle.ts (subscriptionRow). Vraća {result, linked}:
-- result = inserted | updated | stale (stariji događaj, ništa nije promijenjeno),
-- linked = je li pretplata povezana s računom.
create function public.paddle_apply_subscription(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_user   uuid;
  v_result text;
  v_linked boolean;
begin
  -- korisnik iz custom_data: samo ispravan UUID postojećeg računa
  if coalesce(p->>'user_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select u.id into v_user from auth.users u where u.id = (p->>'user_id')::uuid;
  end if;

  insert into public.subscriptions as s (id, user_id, customer_id, status, price_id, product_id, billing_interval,
    current_period_end, trial_end, cancel_at, canceled_at, event_at)
  values (p->>'id', v_user, p->>'customer_id', p->>'status', p->>'price_id', p->>'product_id', p->>'billing_interval',
    (p->>'current_period_end')::timestamptz, (p->>'trial_end')::timestamptz, (p->>'cancel_at')::timestamptz,
    (p->>'canceled_at')::timestamptz, (p->>'event_at')::timestamptz)
  on conflict (id) do update set
    -- prvi povezani račun ostaje; kasniji događaji bez custom_data ga ne brišu
    user_id            = coalesce(s.user_id, excluded.user_id),
    customer_id        = excluded.customer_id,
    status             = excluded.status,
    price_id           = excluded.price_id,
    product_id         = excluded.product_id,
    billing_interval   = excluded.billing_interval,
    current_period_end = excluded.current_period_end,
    trial_end          = excluded.trial_end,
    cancel_at          = excluded.cancel_at,
    canceled_at        = excluded.canceled_at,
    event_at           = excluded.event_at,
    updated_at         = now()
  where s.event_at <= excluded.event_at
  returning case when xmax = 0 then 'inserted' else 'updated' end, user_id is not null
  into v_result, v_linked;

  if v_result is null then
    select 'stale', s.user_id is not null into v_result, v_linked from public.subscriptions s where s.id = p->>'id';
  end if;
  return jsonb_build_object('result', v_result, 'linked', v_linked);
end;
$$;

revoke execute on function public.has_premium() from public, anon;
grant execute on function public.has_premium() to authenticated;
revoke execute on function public.paddle_apply_subscription(jsonb) from public, anon, authenticated;
grant execute on function public.paddle_apply_subscription(jsonb) to service_role;

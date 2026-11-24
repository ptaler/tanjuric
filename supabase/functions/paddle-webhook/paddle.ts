// Čisti dijelovi webhooka (bez Denoa i baze), da se mogu testirati i u Nodeu:
//   node --test supabase/functions/paddle-webhook/paddle.test.ts
//
// Potpis: zaglavlje Paddle-Signature: ts=<unix sekunde>;h1=<hex HMAC-SHA256>
// nad "<ts>:<sirovo tijelo zahtjeva>", ključ je tajni ključ odredišta webhooka (pdl_ntfset_...).
// Pri zamjeni ključa Paddle šalje više h1 vrijednosti; dovoljna je jedna ispravna.

const enc = new TextEncoder();

function hex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

// usporedba u stalnom vremenu (ne otkriva koliko se znakova poklapa)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sign(secret: string, ts: string, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(ts + ':' + rawBody))));
}

// Odbija i ispravno potpisan zahtjev stariji od toleranceSec (ponovljeno slanje presretnutog zahtjeva).
export async function verifySignature(rawBody: string, header: string | null, secret: string,
  nowSec: number = Math.floor(Date.now() / 1000), toleranceSec = 300): Promise<boolean> {
  if (!header || !secret) return false;
  let ts = '';
  const h1: string[] = [];
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === 'ts') ts = v;
    else if (k === 'h1') h1.push(v.toLowerCase());
  }
  if (!/^\d{1,12}$/.test(ts) || !h1.length) return false;
  if (Math.abs(nowSec - Number(ts)) > toleranceSec) return false;
  const expected = await sign(secret, ts, rawBody);
  return h1.some((sig) => safeEqual(sig, expected));
}

// Događaji čiji je data cijela pretplata (entitet subscription).
export const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created', 'subscription.updated', 'subscription.activated', 'subscription.trialing',
  'subscription.past_due', 'subscription.paused', 'subscription.resumed', 'subscription.canceled',
  'subscription.imported'
]);

export type SubscriptionRow = {
  id: string; customer_id: string; status: string; user_id: string | null;
  price_id: string | null; product_id: string | null; billing_interval: string | null;
  current_period_end: string | null; trial_end: string | null; cancel_at: string | null;
  canceled_at: string | null; event_at: string;
};

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

// Redak za paddle_apply_subscription(); null za događaje koji nisu o pretplati.
export function subscriptionRow(ev: any): SubscriptionRow | null {
  if (!ev || !SUBSCRIPTION_EVENTS.has(ev.event_type)) return null;
  const d = ev.data || {};
  const id = str(d.id), customer = str(d.customer_id), status = str(d.status);
  const eventAt = str(ev.occurred_at) || str(d.updated_at);
  if (!id || !customer || !status || !eventAt) throw new Error('Nepotpuna pretplata u događaju ' + str(ev.event_id));
  const items: any[] = Array.isArray(d.items) ? d.items : [];
  const item = items.find((i) => i && i.status !== 'inactive' && i.price) || items[0] || {};
  const price = item.price || {};
  const change = d.scheduled_change;
  return {
    id,
    customer_id: customer,
    status,
    user_id: str(d.custom_data?.user_id),
    price_id: str(price.id),
    product_id: str(price.product_id),
    billing_interval: str(d.billing_cycle?.interval),
    current_period_end: str(d.current_billing_period?.ends_at),
    trial_end: str(item.trial_dates?.ends_at),
    cancel_at: change?.action === 'cancel' ? str(change.effective_at) : null,
    canceled_at: str(d.canceled_at),
    event_at: eventAt
  };
}

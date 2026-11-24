// Poveznica na Paddleov portal za kupce: ondje korisnik vidi račune, mijenja karticu i otkazuje
// pretplatu (zakonska funkcija za raskid ugovora sklopljenog na daljinu).
//
// Poziva je prijavljeni korisnik (sb.functions.invoke('paddle-portal')); funkcija nađe njegovu
// pretplatu u public.subscriptions i od Paddlea zatraži jednokratnu poveznicu (vrijedi kratko).
//
// Deploy: verify_jwt = false; funkcija sama provjerava korisnikov token (auth.getUser), što radi
//   i s novim (asimetričnim) ključevima za potpis JWT-a.
// Tajna: PADDLE_API_KEY = API ključ iz Paddlea (Developer tools > Authentication), s dopuštenjem
//   „Customer portal sessions: write”. Sandbox ključ (pdl_sdbx_...) ide na sandbox API,
//   ostali na produkcijski; PADDLE_ENV=sandbox|production to može nadjačati.

import { createClient } from 'npm:@supabase/supabase-js@2';

function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    if (keys.default) return keys.default;
  } catch { /* stari ključevi */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}

const API_KEY = Deno.env.get('PADDLE_API_KEY') || '';
const ENV = Deno.env.get('PADDLE_ENV') || (API_KEY.includes('_sdbx_') ? 'sandbox' : 'production');
const API = ENV === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
const db = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

// Najprije pretplata koja vrijedi, inače zadnja promijenjena.
const RANK: Record<string, number> = { active: 0, trialing: 0, past_due: 0, paused: 1, canceled: 2 };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);
  if (!API_KEY) {
    console.error('PADDLE_API_KEY nije postavljen');
    return reply({ error: 'config' }, 500);
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: auth, error: authErr } = await db.auth.getUser(token);
  if (authErr || !auth?.user) return reply({ error: 'auth' }, 401);

  const { data: subs, error } = await db.from('subscriptions')
    .select('id, customer_id, status, updated_at').eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false }).limit(20);
  if (error) {
    console.error('paddle-portal: čitanje pretplate', error.message);
    return reply({ error: 'db' }, 500);
  }
  const sub = (subs || []).slice().sort((a, b) => (RANK[a.status] ?? 3) - (RANK[b.status] ?? 3))[0];
  if (!sub) return reply({ error: 'none' }, 404);

  const res = await fetch(`${API}/customers/${encodeURIComponent(sub.customer_id)}/portal-sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription_ids: [sub.id] })
  });
  const body = await res.json().catch(() => null);
  const urls = body?.data?.urls;
  if (!res.ok || !urls?.general?.overview) {
    console.error('paddle-portal: Paddle', res.status, JSON.stringify(body?.error || body).slice(0, 300));
    return reply({ error: 'paddle' }, 502);
  }
  const s = (urls.subscriptions || []).find((x: any) => x.id === sub.id) || {};
  return reply({
    url: urls.general.overview,
    cancel: s.cancel_subscription || null,
    payment: s.update_subscription_payment_method || null
  });
});

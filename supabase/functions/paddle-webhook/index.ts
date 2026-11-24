// Paddle webhook: Paddle javlja promjene pretplate (nova, obnovljena, neplaćena, otkazana...),
// a funkcija ih upisuje u public.subscriptions (migracija 20261124120000_paddle_subscriptions).
//
// Deploy: verify_jwt = false (Paddle ne šalje Supabase JWT; provjerava se potpis Paddle-Signature).
// Tajna: PADDLE_WEBHOOK_SECRET = tajni ključ odredišta webhooka iz Paddlea
//   (Developer tools > Notifications), posebno za sandbox i za produkciju.
//
// Odgovor 2xx znači da je događaj obrađen; na sve ostalo Paddle ponavlja slanje.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { subscriptionRow, verifySignature } from './paddle.ts';

function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    if (keys.default) return keys.default;
  } catch { /* stari ključevi */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}

const WEBHOOK_SECRET = Deno.env.get('PADDLE_WEBHOOK_SECRET') || '';
const db = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!WEBHOOK_SECRET) {
    console.error('PADDLE_WEBHOOK_SECRET nije postavljen');
    return new Response('Not configured', { status: 500 });
  }

  const raw = await req.text();
  if (!(await verifySignature(raw, req.headers.get('paddle-signature'), WEBHOOK_SECRET))) {
    return new Response('Invalid signature', { status: 401 });
  }

  let ev: any, row;
  try {
    ev = JSON.parse(raw);
    row = subscriptionRow(ev);
  } catch (e) {
    console.error('paddle: neispravan događaj', String(e));
    return new Response('Bad request', { status: 400 });
  }
  if (!row) return Response.json({ ignored: ev.event_type });

  const { data, error } = await db.rpc('paddle_apply_subscription', { p: row });
  if (error) {
    console.error('paddle: upis nije uspio', ev.event_id, ev.event_type, error.message);
    return new Response('Error', { status: 500 });
  }
  if (data && data.linked === false) {
    // npr. pretplata napravljena bez custom_data.user_id ili za obrisani račun: poveži ručno
    console.warn('paddle: pretplata nije povezana s računom', row.id, row.customer_id);
  }
  return Response.json({ event: ev.event_type, ...data });
});

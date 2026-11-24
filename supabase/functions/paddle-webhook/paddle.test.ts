// node --test supabase/functions/paddle-webhook/paddle.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sign, subscriptionRow, verifySignature } from './paddle.ts';

const SECRET = 'pdl_ntfset_01test_secret';
const NOW = 1764000000;
const BODY = '{"event_type":"subscription.created"}';

test('ispravan potpis prolazi', async () => {
  const h = await sign(SECRET, String(NOW), BODY);
  assert.equal(await verifySignature(BODY, `ts=${NOW};h1=${h}`, SECRET, NOW), true);
});

test('pri zamjeni ključa dovoljan je jedan ispravan h1', async () => {
  const h = await sign(SECRET, String(NOW), BODY);
  assert.equal(await verifySignature(BODY, `ts=${NOW};h1=${'0'.repeat(64)};h1=${h}`, SECRET, NOW), true);
});

test('promijenjeno tijelo, krivi ključ, staro vrijeme i loše zaglavlje ne prolaze', async () => {
  const h = await sign(SECRET, String(NOW), BODY);
  assert.equal(await verifySignature(BODY + ' ', `ts=${NOW};h1=${h}`, SECRET, NOW), false);
  assert.equal(await verifySignature(BODY, `ts=${NOW};h1=${h}`, 'drugi', NOW), false);
  assert.equal(await verifySignature(BODY, `ts=${NOW};h1=${h}`, SECRET, NOW + 301), false);
  assert.equal(await verifySignature(BODY, `h1=${h}`, SECRET, NOW), false);
  assert.equal(await verifySignature(BODY, null, SECRET, NOW), false);
  assert.equal(await verifySignature(BODY, `ts=${NOW};h1=${h}`, '', NOW), false);
});

// skraćeni primjer događaja iz Paddle dokumentacije
const event = {
  event_id: 'evt_01hv8x2acma2gz3tdmn9a20dpn',
  event_type: 'subscription.updated',
  occurred_at: '2026-11-24T10:00:00.123456Z',
  data: {
    id: 'sub_01hv8x29kz0t586xy6zn1a62ny',
    status: 'active',
    customer_id: 'ctm_01hv6y1jedq4p1n0yqn5ba3ky4',
    custom_data: { user_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7' },
    billing_cycle: { interval: 'month', frequency: 1 },
    current_billing_period: { starts_at: '2026-11-24T10:00:00Z', ends_at: '2026-12-24T10:00:00Z' },
    scheduled_change: { action: 'cancel', effective_at: '2026-12-24T10:00:00Z', resume_at: null },
    canceled_at: null,
    items: [{
      status: 'active',
      trial_dates: { starts_at: '2026-11-10T10:00:00Z', ends_at: '2026-11-24T10:00:00Z' },
      price: { id: 'pri_01hv0vax6rv18t4tamj848ne4d', product_id: 'pro_01htz88xpr0mm7b3ta2pjkr7w2' }
    }]
  }
};

test('pretplata se pretvara u redak', () => {
  assert.deepEqual(subscriptionRow(event), {
    id: 'sub_01hv8x29kz0t586xy6zn1a62ny',
    customer_id: 'ctm_01hv6y1jedq4p1n0yqn5ba3ky4',
    status: 'active',
    user_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    price_id: 'pri_01hv0vax6rv18t4tamj848ne4d',
    product_id: 'pro_01htz88xpr0mm7b3ta2pjkr7w2',
    billing_interval: 'month',
    current_period_end: '2026-12-24T10:00:00Z',
    trial_end: '2026-11-24T10:00:00Z',
    cancel_at: '2026-12-24T10:00:00Z',
    canceled_at: null,
    event_at: '2026-11-24T10:00:00.123456Z'
  });
});

test('pauza nije otkazivanje; bez custom_data nema korisnika', () => {
  const ev = structuredClone(event);
  ev.data.scheduled_change = { action: 'pause', effective_at: '2026-12-24T10:00:00Z', resume_at: null } as any;
  delete (ev.data as any).custom_data;
  const row = subscriptionRow(ev)!;
  assert.equal(row.cancel_at, null);
  assert.equal(row.user_id, null);
});

test('ostali događaji se preskaču, nepotpuni odbijaju', () => {
  assert.equal(subscriptionRow({ event_type: 'transaction.completed', data: {} }), null);
  assert.equal(subscriptionRow(null), null);
  assert.throws(() => subscriptionRow({ event_type: 'subscription.created', occurred_at: 'x', data: { id: 'sub_1' } }));
});

// Podsjetnici: pg_cron (migracija 20261117120000_push_reminders) poziva ovu funkciju svake minute.
// Funkcija od baze dobije obavijesti koje treba poslati (push_due) i pošalje ih na uređaje.
//
// Poziv mora imati zaglavlje x-cron-secret iz private.push_config. Rad je idempotentan:
// push_due() svaku obavijest zauzme samo jednom, pa ni ponovljeni poziv ne šalje dvaput.
// Deploy: verify_jwt = false (provjerava se x-cron-secret).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { generateVapidKeys, sendPush } from './webpush.js';

const SUBJECT = 'mailto:info@tanjuric.com';

function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    if (keys.default) return keys.default;
  } catch { /* stari ključevi */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}

const db = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), { auth: { persistSession: false } });

type Msg = {
  sub: string; key: string; endpoint: string; p256dh: string; auth: string; lang: 'hr' | 'en';
  kind: 'daily' | 'gap' | 'partner'; child: string; child_id: string; med: string;
  dose?: number | null; unit?: string; time: string; hours?: number | null; who?: string;
};

// ---------- tekst obavijesti ----------

// [jednina, 2–4, 5+] kao u app.js; engleski [one, other]
const UNITS: Record<string, { hr: [string, string, string]; en: [string, string] }> = {
  ml: { hr: ['ml', 'ml', 'ml'], en: ['ml', 'ml'] },
  mg: { hr: ['mg', 'mg', 'mg'], en: ['mg', 'mg'] },
  kap: { hr: ['kap', 'kapi', 'kapi'], en: ['drop', 'drops'] },
  tableta: { hr: ['tableta', 'tablete', 'tableta'], en: ['tablet', 'tablets'] },
  'vrećica': { hr: ['vrećica', 'vrećice', 'vrećica'], en: ['sachet', 'sachets'] },
  'čepić': { hr: ['čepić', 'čepića', 'čepića'], en: ['suppository', 'suppositories'] },
  potisak: { hr: ['potisak', 'potiska', 'potisaka'], en: ['puff', 'puffs'] },
  doza: { hr: ['doza', 'doze', 'doza'], en: ['dose', 'doses'] }
};

function num(n: number, lang: string) {
  return lang === 'hr' ? String(n).replace('.', ',') : String(n);
}

function doseText(dose: number | null | undefined, unit: string | undefined, lang: 'hr' | 'en') {
  if (dose == null || !(Number(dose) > 0)) return '';
  const n = Number(dose), u = UNITS[unit || ''];
  if (!u) return num(n, lang) + (unit ? ' ' + unit : '');
  let label: string;
  if (lang === 'en') label = n === 1 ? u.en[0] : u.en[1];
  else if (!Number.isInteger(n)) label = u.hr[1];
  else {
    const m10 = n % 10, m100 = n % 100;
    label = m10 === 1 && m100 !== 11 ? u.hr[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? u.hr[1] : u.hr[2];
  }
  return num(n, lang) + ' ' + label;
}

function texts(m: Msg): { title: string; body: string } {
  const en = m.lang === 'en';
  const dose = doseText(m.dose, m.unit, m.lang);
  if (m.kind === 'daily') {
    return en
      ? { title: `${m.med} at ${m.time}`, body: `Time for ${m.child}’s dose${dose ? ` (${dose})` : ''}. Confirm it in Tanjurić once it’s given.` }
      : { title: `${m.med} u ${m.time}`, body: `Vrijeme je za terapiju — ${m.child}${dose ? `, ${dose}` : ''}. Kad je dano, potvrdi u Tanjuriću.` };
  }
  if (m.kind === 'gap') {
    const h = m.hours ? num(Number(m.hours), m.lang) + ' h' : '';
    return en
      ? { title: `${m.med}: the gap has passed`, body: h ? `${h} have passed since ${m.child}’s dose at ${m.time}.` : `The minimum gap since ${m.child}’s dose at ${m.time} has passed.` }
      : { title: `${m.med}: prošao je razmak`, body: h ? `Od doze u ${m.time} prošlo je ${h} (${m.child}).` : `Prošao je upisani razmak od doze u ${m.time} (${m.child}).` };
  }
  return en
    ? { title: `${m.med} — ${m.child}`, body: `Given at ${m.time}${dose ? ` · ${dose}` : ''}. Added by ${m.who}.` }
    : { title: `${m.med} — ${m.child}`, body: `Dano u ${m.time}${dose ? ` · ${dose}` : ''}. Upis: ${m.who}.` };
}

// ---------- slanje ----------

async function vapidKeys(cfg: Record<string, any>) {
  if (cfg.vapid_public && cfg.vapid_private) return { publicKey: cfg.vapid_public, privateJwk: cfg.vapid_private };
  const keys = await generateVapidKeys();
  const { data, error } = await db.rpc('push_set_vapid', { p_public: keys.publicKey, p_private: keys.privateJwk });
  if (error) throw error;
  return { publicKey: data.vapid_public, privateJwk: data.vapid_private };   // pobjednik istodobnog poziva
}

async function deliver(msgs: Msg[], vapid: { publicKey: string; privateJwk: JsonWebKey }) {
  const gone: string[] = [], retry: { sub: string; key: string }[] = [];
  let sent = 0;
  for (let i = 0; i < msgs.length; i += 20) {
    await Promise.all(msgs.slice(i, i + 20).map(async (m) => {
      const t = texts(m);
      const payload = JSON.stringify({
        title: t.title, body: t.body, tag: m.key,
        url: '/?terapije=' + encodeURIComponent(m.child_id)
      });
      try {
        // dnevna terapija i razmak: vrijede dok su aktualni; obavijest drugog roditelja kraće
        const res = await sendPush(m, payload, vapid, { subject: SUBJECT, ttl: m.kind === 'partner' ? 1800 : 3 * 3600 });
        if (res.status === 404 || res.status === 410) gone.push(m.sub);
        else if (res.status >= 200 && res.status < 300) sent++;
        else {
          console.error('push', res.status, new URL(m.endpoint).host, res.text.slice(0, 200));
          if (res.status === 429 || res.status >= 500) retry.push({ sub: m.sub, key: m.key });
        }
      } catch (e) {
        console.error('push failed', new URL(m.endpoint).host, String(e));
        retry.push({ sub: m.sub, key: m.key });
      }
    }));
  }
  if (gone.length) await db.rpc('push_drop', { p_ids: [...new Set(gone)] });
  if (retry.length) await db.rpc('push_unclaim', { p_items: retry });
  return { sent, gone: gone.length, retry: retry.length };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const cfgRes = await db.rpc('push_job_config');
  if (cfgRes.error) {
    console.error(cfgRes.error);
    return new Response('Config error', { status: 500 });
  }
  const cfg = cfgRes.data || {};
  if (!cfg.cron_secret || req.headers.get('x-cron-secret') !== cfg.cron_secret) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const vapid = await vapidKeys(cfg);
    const due = await db.rpc('push_due');
    if (due.error) throw due.error;
    const msgs = (due.data || []) as Msg[];
    const result = msgs.length ? await deliver(msgs, vapid) : { sent: 0, gone: 0, retry: 0 };
    return Response.json({ due: msgs.length, ...result });
  } catch (e) {
    console.error(e);
    return new Response('Error', { status: 500 });
  }
});

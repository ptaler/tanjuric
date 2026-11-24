// Javna konfiguracija klijenta. Publishable ključ smije biti u pregledniku:
// pristup podacima štite RLS pravila u bazi (supabase/migrations).
window.TANJURIC_CONFIG = {
  supabaseUrl: 'https://winipyhywkgcdmekkfct.supabase.co',
  supabaseKey: 'sb_publishable_OkUMXB-LxSFyeYU237zwPQ_5i0_QLOW',
  // Paddle Billing: client-side token i ID cijene su javni (Paddle.js ih šalje iz preglednika).
  // env 'sandbox' = Paddleovo probno okruženje (testne kartice, bez naplate).
  paddle: {
    env: 'sandbox',
    token: 'test_9182e0d6056bf9d95fdd1780dfa',
    priceId: 'pri_01m86pebkt6ve6trrhzvh8b2rs'
  }
};

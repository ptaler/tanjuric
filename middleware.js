// Vercel Routing Middleware: prema zemlji IP adrese postavi kolačić tanjuric_geo (hr / en),
// koji i18n.js čita prije prvog prikaza. Izbor korisnika (prekidač HR / EN) ima prednost
// i sprema se u preglednik, pa ga ovaj kolačić ne mijenja.
//
// Bez ovisnosti (nema package.json): umjesto next() iz @vercel/functions vraća se odgovor
// sa zaglavljem x-middleware-next, što next() radi interno — zahtjev nastavlja na statičnu
// datoteku, a ostala zaglavlja (Set-Cookie) dodaju se odgovoru.

// Hrvatska, Slovenija, BiH, Srbija, Kosovo, Crna Gora, Sjeverna Makedonija
var HR_COUNTRIES = ['HR', 'SI', 'BA', 'RS', 'XK', 'ME', 'MK'];
var COOKIE = 'tanjuric_geo';

export const config = {
  matcher: ['/', '/index.html']
};

export default function middleware(request) {
  var country = (request.headers.get('x-vercel-ip-country') || '').toUpperCase();
  var headers = { 'x-middleware-next': '1' };
  if (country) {
    var lang = HR_COUNTRIES.indexOf(country) >= 0 ? 'hr' : 'en';
    var cookies = request.headers.get('cookie') || '';
    var current = (cookies.match(/(?:^|;\s*)tanjuric_geo=([^;]*)/) || [])[1];
    if (current !== lang) {
      headers['set-cookie'] = COOKIE + '=' + lang + '; Path=/; Max-Age=2592000; SameSite=Lax; Secure';
    }
  }
  return new Response(null, { headers: headers });
}

'use strict';
// Shared cross-subdomain language helper. Does not change layout or content.
(function (root) {
  const allowed = new Set(['ru', 'hy', 'en']);
  function valid(value) { return allowed.has(value) ? value : null; }
  function current(search, storage) {
    const p = new URLSearchParams(search || '');
    const explicit = valid(p.get('lang'));
    if (explicit) return explicit;
    try { return valid(storage && storage.getItem('retrophoneLang')) || 'ru'; }
    catch (_) { return 'ru'; }
  }
  function withLanguage(href, lang, base) {
    const url = new URL(href, base || 'https://retrophone-armenia.vercel.app/');
    url.searchParams.set('lang', valid(lang) || 'ru');
    return url.href;
  }
  const api = { current, withLanguage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RetroPhoneLanguage = api;
})(typeof window !== 'undefined' ? window : null);

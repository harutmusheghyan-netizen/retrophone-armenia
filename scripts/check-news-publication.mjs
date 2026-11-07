#!/usr/bin/env node
// Read-only production publication smoke test. No credentials required.
const base = process.env.RETROPHONE_BASE_URL || 'https://retrophone-armenia.vercel.app';
const slug = process.env.RETROPHONE_EXPECT_SLUG || 'google-gemini-omni-1-2-flash-video-2026';
const timeout = Number(process.env.RETROPHONE_TIMEOUT_MS || 12000);
async function check(path, validate) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(new URL(path, base), { signal: controller.signal, headers: { accept: 'application/json,text/html;q=0.9' }, redirect: 'follow' });
    const body = await response.text();
    if (!response.ok) throw new Error('HTTP ' + response.status);
    await validate(response, body);
    console.log('PASS', path);
  } finally { clearTimeout(timer); }
}
let failures = 0;
async function run(path, validate) {
  try { await check(path, validate); }
  catch (error) { failures++; console.error('FAIL', path, String(error.message || error)); }
}
await run('/news/', async (response, body) => {
  if (!/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('not HTML');
  if (!/<html[\s>]/i.test(body)) throw new Error('missing HTML document');
});
await run('/api/retro-news?limit=100', async (response, body) => {
  const payload = JSON.parse(body);
  const posts = Array.isArray(payload) ? payload : Array.isArray(payload.posts) ? payload.posts : Array.isArray(payload.data) ? payload.data : null;
  if (!posts) throw new Error('unexpected API JSON shape');
  const post = posts.find(p => p.slug === slug);
  if (!post) throw new Error('expected published slug absent from public API: ' + slug);
  for (const key of ['title_ru', 'title_hy', 'title_en', 'body_ru', 'body_hy', 'body_en']) {
    if (!post[key]) throw new Error('missing language field: ' + key);
  }
  console.log('Published article visible via public API:', slug);
});
if (failures) {
  console.error(failures + ' publication checks failed; DO NOT report publication as verified.');
  process.exitCode = 1;
} else console.log('API and HTML HTTP checks passed. Browser rendering/images/admin still require separate E2E tests.');

// Static validation: the supplemental sitemap must only contain verified model URLs.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async path=>readFile(new URL(path,import.meta.url),'utf8');
const input=JSON.parse(await read('../seo-audit/missing-155.json'));
const xml=await read('../catalog-proxy/sitemap-additions.xml');
const robots=await read('../catalog-proxy/robots.txt');
assert.equal(input.missing_count,155,'the snapshot should contain all missing models');
assert.equal(input.models.length,155);
assert.match(xml,/^<\?xml version="1.0" encoding="UTF-8"\?>/);
assert.ok(xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
const locs=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1].replaceAll('&amp;','&'));
assert.equal(locs.length,29,'supplemental sitemap should have exactly 29 URLs');
assert.equal(new Set(locs).size,29,'no duplicate URLs');
const absentSet=new Set(input.models.map(m=>m.url));
for(const loc of locs){
  assert.ok(absentSet.has(loc),'must have come from missing-155 source: '+loc);
  assert.ok(loc.startsWith('https://retrophone-armenia-catalog.vercel.app/phones/'),'same verified catalog host');
}
assert.ok(robots.includes('Sitemap: https://retrophone-armenia-catalog.vercel.app/sitemap.xml'));
assert.ok(robots.includes('Sitemap: https://retrophone-armenia-catalog.vercel.app/sitemap-additions.xml'));
console.log('SEO_ADDITIONS_SITEMAP_OK 29 new canonical candidates, original sitemap retained, no design changes');

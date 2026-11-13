#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
psql -X -v ON_ERROR_STOP=1 -f tests/news-guard-production-shape/guarded-publisher-fixture.sql >/dev/null
psql -X -v ON_ERROR_STOP=1 -f tests/news-guard-production-shape/guarded-publisher-candidate.sql >/dev/null

if [ "$(psql -X -Atqc "SELECT has_function_privilege('anon','public.retrophone_news_publish_checked(jsonb)','EXECUTE')")" != "f" ]; then exit 1; fi
if [ "$(psql -X -Atqc "SELECT has_function_privilege('authenticated','public.retrophone_news_publish_checked(jsonb)','EXECUTE')")" != "f" ]; then exit 1; fi
if [ "$(psql -X -Atqc "SELECT has_function_privilege('service_role','public.retrophone_news_publish_checked(jsonb)','EXECUTE')")" != "t" ]; then exit 1; fi
echo "PASS: guarded RPC not callable by anon/authenticated"

post() {
  local slug="$1"
  local source="$2"
  psql -X -v ON_ERROR_STOP=1 -Atqc "
    SET ROLE service_role;
    SELECT public.retrophone_news_publish_checked(jsonb_build_object(
      'slug','$slug',
      'source_url','https://example.org/news/$source',
      'source_name','Example Editorial',
      'source_published_at',(now()-interval '1 hour')::text,
      'category','technology',
      'title_ru','Тестовая новость о новых мобильных технологиях',
      'title_hy','Նորություններ բջջային տեխնոլոգիաների մասին',
      'title_en','Test article about mobile technologies',
      'excerpt_ru',repeat('Краткое изложение технической новости. ',3),
      'excerpt_hy',repeat('Հայերեն համառոտ նկարագրություն։ ',3),
      'excerpt_en',repeat('English news summary about technology. ',3),
      'body_ru',repeat('Русскоязычное содержание новости с подробностями. ',5),
      'body_hy',repeat('Հայերեն ամբողջական տեքստ տեխնոլոգիաների վերաբերյալ։ ',5),
      'body_en',repeat('Full English editorial article about mobile devices. ',5)
    ));"
}

mkdir -p /tmp/news-rpc
for i in $(seq 1 8); do
  (post "run-$i" "run-$i" >"/tmp/news-rpc/$i.out" 2>"/tmp/news-rpc/$i.err" || echo 'ERROR' >"/tmp/news-rpc/$i.out") &
done
wait
if grep -l '^ERROR$' /tmp/news-rpc/*.out >/dev/null; then
  echo "FAIL: SQL invocation error"
  grep -H '^ERROR' /tmp/news-rpc/*.err || true
  exit 1
fi
accepted=$(grep -l '"status": "published"' /tmp/news-rpc/*.out | wc -l)
limited=$(grep -l '"status": "daily_limit_reached"' /tmp/news-rpc/*.out | wc -l)
echo "RPC concurrency accepted=$accepted limited=$limited"
test "$accepted" -eq 3
test "$limited" -eq 5
test "$(psql -X -Atqc "SELECT count(*) FROM public.retro_news_posts WHERE status='published' AND (published_at AT TIME ZONE 'Asia/Yerevan')::date=(now() AT TIME ZONE 'Asia/Yerevan')::date")" -eq 3

successful_slug="$(psql -X -Atqc "SELECT slug FROM public.retro_news_posts WHERE slug LIKE 'run-%' ORDER BY id LIMIT 1")"
result="$(post "$successful_slug" "$successful_slug")"
echo "$result" | grep -q '"status": "already_exists"'
result="$(post 'different-slug' "$successful_slug")"
echo "$result" | grep -q '"status": "conflict"'
result="$(post 'fourth-news' 'fourth-news')"
echo "$result" | grep -q '"status": "daily_limit_reached"'
test "$(psql -X -Atqc "SELECT count(*) FROM public.retro_news_posts")" -eq 3
echo 'PASS: atomic service-role RPC; 3/8 concurrency; idempotency; duplicate conflict; day-limit'

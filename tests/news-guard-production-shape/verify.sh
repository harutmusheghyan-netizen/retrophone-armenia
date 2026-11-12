#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
psql -X -v ON_ERROR_STOP=1 -f tests/news-guard-production-shape/setup.sql >/dev/null

post() {
  local slug="$1" day="$2" status="$3"
  psql -X -v ON_ERROR_STOP=1 -Atqc \
    "INSERT INTO isolated_news_live_shape.posts (slug,source_url,title_ru,title_hy,title_en,status,published_at) VALUES ('$slug','https://example.org/$slug','Тестовая новость','Փորձնական նորություն','Test news article','$status','$day');"
}
must_reject() {
  local label="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "FAIL: $label was accepted"; exit 1
  fi
  echo "PASS: $label blocked"
}

mkdir -p /tmp/news-real-shape
for i in $(seq 1 8); do
  (
    if post "parallel-$i" '2026-11-12 10:00:00+04' published >/tmp/news-real-shape/$i.out 2>/tmp/news-real-shape/$i.err; then
      echo accepted >"/tmp/news-real-shape/$i.status"
    else
      echo rejected >"/tmp/news-real-shape/$i.status"
    fi
  ) &
done
wait
accepted=$(grep -l '^accepted$' /tmp/news-real-shape/*.status | wc -l)
rejected=$(grep -l '^rejected$' /tmp/news-real-shape/*.status | wc -l)
echo "production-shape concurrency accepted=$accepted rejected=$rejected"
test "$accepted" -eq 3
test "$rejected" -eq 5
test "$(psql -X -Atqc "SELECT count(*) FROM isolated_news_live_shape.posts WHERE status='published' AND (published_at AT TIME ZONE 'Asia/Yerevan')::date='2026-11-12'")" -eq 3

must_reject 'fourth direct published INSERT' post 'bypass-direct' '2026-11-12 13:00:00+04' published

post 'allowed-draft' '2026-11-12 14:00:00+04' draft
must_reject 'draft-to-published UPDATE on full day' \
  psql -X -v ON_ERROR_STOP=1 -c "UPDATE isolated_news_live_shape.posts SET status='published' WHERE slug='allowed-draft'"

post 'move-source' '2026-11-13 22:00:00+04' published
must_reject 'published_at UPDATE into full day' \
  psql -X -v ON_ERROR_STOP=1 -c "UPDATE isolated_news_live_shape.posts SET published_at='2026-11-12 14:00:00+04' WHERE slug='move-source'"

psql -X -v ON_ERROR_STOP=1 -c \
  "UPDATE isolated_news_live_shape.posts SET title_ru='Историческая исправленная новость',status='published' WHERE slug='legacy-1'" >/dev/null
test "$(psql -X -Atqc "SELECT count(*) FROM isolated_news_live_shape.posts WHERE status='published' AND (published_at AT TIME ZONE 'Asia/Yerevan')::date='2026-10-27'")" -eq 7
echo "PASS: legacy seven-story date editable and unchanged"

psql -X -v ON_ERROR_STOP=1 -c \
  "UPDATE isolated_news_live_shape.posts SET title_ru='Обновлённый текст',status='published' WHERE slug=(SELECT slug FROM isolated_news_live_shape.posts WHERE slug LIKE 'parallel-%' AND status='published' ORDER BY id LIMIT 1)" >/dev/null

post 'before-midnight' '2026-11-14 23:59:00+04' published
post 'after-midnight' '2026-11-15 00:01:00+04' published
test "$(psql -X -Atqc "SELECT count(distinct (published_at AT TIME ZONE 'Asia/Yerevan')::date) FROM isolated_news_live_shape.posts WHERE slug IN ('before-midnight','after-midnight')")" -eq 2

post 'unique-source' '2026-11-16 10:00:00+04' published
must_reject 'duplicate source URL across dates' \
  psql -X -v ON_ERROR_STOP=1 -c \
  "INSERT INTO isolated_news_live_shape.posts (slug,source_url,title_ru,title_hy,title_en,status,published_at) VALUES ('different-slug','https://example.org/unique-source','Тестовая новость','Փորձնական նորություն','Test news article','published','2026-11-17 10:00:00+04')"

must_reject 'missing Armenian translation' \
  psql -X -v ON_ERROR_STOP=1 -c \
  "INSERT INTO isolated_news_live_shape.posts (slug,source_url,title_ru,title_hy,title_en,status,published_at) VALUES ('missing-hy','https://example.org/missing-hy','Тестовая новость','','Test news article','published','2026-11-18 10:00:00+04')"
must_reject 'published without timestamp' \
  psql -X -v ON_ERROR_STOP=1 -c \
  "INSERT INTO isolated_news_live_shape.posts (slug,source_url,title_ru,title_hy,title_en,status,published_at) VALUES ('no-date','https://example.org/no-date','Тестовая новость','Փորձնական նորություն','Test news article','published',null)"

echo 'PASS: production-shaped guard / 3-of-8 / status transitions / historical edit / Yerevan midnight / source uniqueness / published validation'

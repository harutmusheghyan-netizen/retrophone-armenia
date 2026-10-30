# RetroPhone Armenia — public-data snapshot (2026-10-30)

This directory is an **independent, versioned copy of published, public catalog content** saved to GitHub from Supabase. It contains:

- `models-001.json` ... `models-009.json`: **870 published phone-model records**, including available public descriptions, specifications, image attribution and available language records; ordered by ascending model ID (100 per part, 70 in the last).
- `brands.json`: 10 published brand records.
- `news.json`: 13 public, unhidden published news articles (as stored at snapshot time).
- `photos.json`: 31 published phone-photo rows.

**Not included (by design):** private user accounts, passwords, authentication or administrative information, private agent research data, service keys, orders, full database schema/migrations, binary image files, cloud Storage objects, or complete Vercel site source code.

**Restore status:** this is a *partial content export*, **not** a fully restorable production/database backup. Supabase retains an internal private snapshot, but a separate encrypted full SQL dump and Storage backup still need to be created and restoration must be tested in isolated staging. The GitHub repository is public, so do not store private exports here.

**Editorial status:** export does not certify that every photo, model fact, translated description or news claim has been individually verified. Preserve author/license/source metadata before reuse. Some models have no translated descriptions or photograph. Do not mark them verified automatically.

**Do not deploy this repository to production yet.** Source code files and API handlers are not fully imported. The production Vercel build is the authoritative running copy.

# RetroPhone Armenia — recovery and source control

The GitHub repository is public. **Do not commit** secrets, production database dumps, customer information, backup encryption keys or service-role credentials.

## Verified on 2026-10-30

- Production: Vercel project `retrophone-armenia`, production status `READY` at the audit.
- Backend: Supabase project `Retro Telefon Armenia`.
- Application data: 38 public tables, including 10 brands, 870 phone models and 13 news posts.
- Existing internal backup: snapshot dated 2026-10-30 00:16 UTC containing 38 tables and 5,736 JSON records. Array counts checked, and model/news JSON was parsed successfully.
- Earlier independent artifacts exist in a private Google Drive folder (October 26); these were **not** verified as a current, complete database/asset restore.
- The full production site source is **not yet in this repository**. The Vercel source-fetch integration truncates large files, so partial file fragments must not be treated as usable source.

## Before any production change

1. Confirm the current Vercel deployment ID, application project and protected admin access.
2. Save a complete source archive (including API handlers) **after scanning it for secrets**.
3. Create an encrypted offsite PostgreSQL backup and copy all Supabase Storage objects. Also preserve migrations/policies, auth settings and project environment variable names (not values).
4. Restore into an isolated test project, validate permissions and compare counts/checksums.
5. Test RU/HY/EN navigation, catalog, news, admin authentication, backups and search.
6. Promote only a tested build, and retain a rollback deployment.

Internal JSON snapshots help with selective data recovery but are **not** an external disaster-recovery backup. Do not declare backup/restore complete until steps 3 and 4 succeed.

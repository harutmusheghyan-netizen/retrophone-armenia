# RetroPhone Armenia — protected administration reference (2026-11-08)

## Current known-good resources

- Main website: https://retrophone-armenia.vercel.app/
- Integrated news editor: https://retrophone-armenia.vercel.app/admin/
- Standalone administration project: https://retrophone-armenia-admin.vercel.app/
- Main website frozen Vercel deployment: `dpl_9ZhCYFqWg1nheVfU2yxm97ovMRTu`
- Standalone administration Vercel deployment: `dpl_EjxMB8H3LiyNeHk86uqDtnovCfzm`
- Supabase project: `aikxbgixitaaatkmcols` (ACTIVE_HEALTHY at verification).

## Tested / verified read-only

- Main `/admin/` returned **HTTP 200**, served HTML, and matched the frozen deployed editor byte-for-byte. The snapshot `site/admin/index.html` is saved.
- The editor HTML includes Supabase client code paths for `signInWithPassword`, `resetPasswordForEmail`, `getSession`, `signOut`, and controls/code for preview and publication. **The existence of code is not an authenticated end-to-end test.**
- Standalone Vercel admin deployment is READY and its domain is verified. Vercel reported no server-side runtime errors in its available last-seven-days window. **Standalone HTTP loading and authenticated workflows were not independently tested in this snapshot job.**
- No password, private authenticated session, service key, uploaded private data or database dump was copied.

## Mandatory checks before the next production promotion

1. Verify main homepage, `/news/`, and `/admin/` return HTTP 200 with correct HTML and approved visual layout.
2. Verify the standalone administration domain loads.
3. In a protected account/session, manually or through a *test-only* account check login, logout and password reset email delivery without sending credentials in chat.
4. Verify editing text and image metadata, RU/HY/EN translations, preview before publication, and a protected test publication/update + subsequent re-read. Confirm denied access for unauthorized users.
5. Ensure no service-role or private tokens are embedded in public JavaScript/HTML; do not relax RLS or owner validation.
6. Preserve the known-good deployment and revert immediately if tests fail. Do not modify the approved homepage to repair admin functionality.

## Restoration notes

- Restore the *main site* by promoting/rolling back to pinned Vercel deployment `dpl_9ZhCYFqWg1nheVfU2yxm97ovMRTu`.
- The backup contains the **publicly accessible editor UI**, not a full export of backend configuration or authenticated database records.
- The separate admin project has a distinct pinned deployment `dpl_EjxMB8H3LiyNeHk86uqDtnovCfzm`.
- A full independent disaster-recovery backup requires separately exporting source code, DB schema/data, approved storage objects, and environment-variable names/configuration through controlled secret-safe mechanisms.

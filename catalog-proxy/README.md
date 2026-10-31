# RetroPhone Armenia — catalog proxy (trilingual verified copy)

This is the thin Vercel proxy layer currently deployed separately from the original static catalog.

## Behavior
- Keeps upstream HTML, design, catalog structure and existing media.
- On `/phones/<brand>/<model>?lang=ru|hy|en` uses only the RLS-protected, published historical entries from Supabase `agent_published_model_editorials`.
- Replaces the Russian-only original history section with the selected checked language, source references and explanatory release year.
- Leaves all other model pages untouched; no archival or unverified drafts are presented as checked.
- Existing navigation translation script remains, but skips duplicate archive enrichment for source-verified history pages.
- Language-button clicks on verified pages reload with the requested `lang` so HTML, metadata, and body language match.
- Stock information is never inferred from the historical catalog.

## Deploy and test
Project: `retrophone-armenia-catalog`. Root directory of this proxy project is `catalog-proxy` when using the GitHub repository.
Publish only after checking all 5 verified records in all 3 languages, an unverified phone model, catalog root, and JavaScript availability.
The static upstream catalog is still a separate deployment, so it also requires independent recovery and source synchronization.

## Secrets
The embedded Supabase key is a **publishable client key**, not a service-role key; RLS restricts data to published records. No admin tokens should be committed.

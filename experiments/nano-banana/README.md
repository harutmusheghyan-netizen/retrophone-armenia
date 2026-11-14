# Nano Banana — RetroPhone Armenia (ISOLATED PILOT)

**Status (14 November 2026): code scaffold only.** Not deployed, not connected to admin,
not authenticated against Vercel/Supabase, no Gemini API run, no uploaded images, no claims
that Nokia 6555 is already generated or historically verified.

## Why isolated?

The public repository currently lacks the complete running production Vercel/admin source.
Do not treat it as a deployable replacement for the actual website.
Production, catalog, database, and Admin Panel "Etalon No. 4" must stay unchanged.

This is a guarded local proof of concept for a **2007 Nokia 6555, black/silver,
four camera angles**, intended to become one server-side feature of the approved photo editor.
Do not bulk-generate the catalog before verifying this example.

## Setup / dry-run

Requires Node.js 20+, npm, and input/reference rights.

```bash
cd experiments/nano-banana
npm install
npm run dry-run
```

Dry run prints the four angle-specific prompts and consumes **no Google API credits**.
Dry run does not produce photos.

For a *paid* generation test, provide at least the **front and back** reference photos
of the correct Nokia 6555 colorway in the local, ignored directory:

```
references/nokia-6555/front.jpg
references/nokia-6555/back.jpg
# Optional: references/nokia-6555/left.jpg and right.jpg
```

You must have the legal right to upload the references to the Gemini API. Obtain a
Gemini API key in [Google AI Studio](https://aistudio.google.com/api-keys), activate
appropriate billing if needed, and set the secret as the **local environment variable**
`GEMINI_API_KEY`; never commit, email, or paste the key into chat.

```bash
npm run generate-pilot -- --confirm-rights
```

The `--confirm-rights` flag is an explicit acknowledgment about uploaded reference
photos. The script makes exactly four image-generation calls, has no bulk mode and no
auto retry; each API call may cost money.

## Output and restrictions

* Local files only: `preview-output/nokia-6555/{front,back,left,right}.png`.
* A `review.json` manifest tracks generator, angles, reference types, and **unverified**
  state. The manifest is updated after each successful image, even if a later request fails.
* Generated product illustrations are **not proof** that the hardware pictured is
  physically accurate; check each against independent historical model references.
* Generation requests a plain background. **Transparency is not guaranteed**.
  Add background masking in a separate preview/test step after model accuracy passes.
* Do not publish generated visuals as original photographs of an actual item for sale.
  Mark them as AI-generated illustrations in RU / HY / EN, with appropriate disclosures.
* Do not insert outputs into Supabase Storage or DB, do not call any publication API,
  and do not delete, overwrite or replace any existing image. This script has no code
  paths to do any of those operations.

## Production integration design — future, not implemented here

1. Recover the exact working source for the Vercel admin Preview deployment and preserve
   approved "Etalon No. 4" as a known-good rollback reference.
2. Create a protected, administrator-only **server-side** image generation endpoint
   in the Preview project. Store `GEMINI_API_KEY` in Vercel Environment Variables
   for Preview only; never expose it in client JS or HTML. Add per-admin quotas,
   request logs, explicit cost controls and provider error handling.
3. Connect the existing image editor with actions: generate a single angle, regenerate,
   inspect source/reference, preview, select main image, approve draft.
4. Save drafts separately in Supabase with model ID, actual variant/color, view,
   generator model, output MIME, human review status and optional source/license
   provenance. Do not override old photos before all four approved replacements
   are persisted and can be reopened.
5. Check model consistency, rights, historical appearance, stable 4-view color,
   UI localization and full flow **upload → save → reopen → approve**.
6. Run the Nokia 6555 test in Preview. Only after verifying end-to-end behavior
   should any larger batch be proposed; protect the full backup/recovery flow.

## Budget model, not a quote

Google's 2026-11 publicly listed **Nano Banana 2.1** output equivalent for a
1K image: **$0.0336 Standard** or **$0.0168 Batch**. For 3,480 successful
one-image outputs, illustrative output-only totals are **$116.93 Standard** or
**$58.46 Batch**. Plus input tokens, retries, any other tools, storage and taxes.
Actual spend needs Google billing and quotas; batch may have processing delay.

Official docs:
- https://ai.google.dev/gemini-api/docs/image-generation
- https://ai.google.dev/gemini-api/docs/pricing

/**
 * RetroPhone Armenia — strictly isolated, local Nano Banana pilot.
 * Never writes to Supabase, Vercel, GitHub or the live catalog.
 * Requires two user-cleared reference images before any paid API calls.
 */
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import sharp from "sharp";

const MODEL_ID = "gemini-nano-banana-2.1";
const PHONE = "Nokia 6555";
const COLOR = "black and silver";
const VIEWS = [
  ["front", "straight-on front view, open flip phone, screen and keypad facing camera"],
  ["back", "straight-on rear view of the real phone housing and camera, consistent hinge and proportions"],
  ["left", "exact left side profile, same phone and hinge geometry"],
  ["right", "exact right side profile, same phone and hinge geometry"],
];
const baseDir = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname);
const refsDir = join(baseDir, "references", "nokia-6555");
const outputDir = join(baseDir, "preview-output", "nokia-6555");
const dryRun = process.argv.includes("--dry-run");
const run = process.argv.includes("--run");

if (dryRun === run) {
  console.error("Choose exactly one mode: --dry-run (free, no files) or --run (paid API calls).");
  process.exit(2);
}

async function findReference(view) {
  for (const extension of [".png", ".jpg", ".jpeg", ".webp"]) {
    const path = join(refsDir, view + extension);
    try {
      const size = (await stat(path)).size;
      if (size > 8 * 1024 * 1024) throw new Error("Reference exceeds 8 MB: " + view);
      return path;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
}

const references = [];
for (const [view] of VIEWS) {
  const path = await findReference(view);
  if (path) references.push({ view, path });
}

function promptFor(label) {
  return [
    "Create a NEW AI-generated catalog illustration, not a copy of a photograph.",
    "Subject: the authentic 2007 " + PHONE + " flip mobile phone in " + COLOR + ".",
    "Camera: " + label + ".",
    "Treat the supplied reference photos as evidence of this specific historical model.",
    "Preserve the exact historical shape, hinge, buttons, display proportions, branding, camera, ports and component placement shown in references.",
    "Maintain identical black-and-silver color and housing details across all four outputs.",
    "Single complete phone centered; no hands, shadows, props, extra devices, watermarks, captions or invented accessories.",
    "Plain white neutral background for later independent masking. Accurate product-documentation style.",
    "Do not redesign the phone or merge it with another Nokia model."
  ].join(" ");
}

if (dryRun) {
  console.log(JSON.stringify({
    mode: "dry-run",
    model: MODEL_ID,
    phone: PHONE,
    color: COLOR,
    referencesFound: references.map(r => r.view),
    requiredForPaidRun: ["front", "back"],
    outputs: VIEWS.map(([view, label]) => ({ view, prompt: promptFor(label) })),
    publication: "DISABLED",
    note: "AI generation cannot independently establish historical accuracy or transparency."
  }, null, 2));
  process.exit(0);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("Set GEMINI_API_KEY locally. Never paste it into chat, code or GitHub.");
  process.exit(2);
}
if (!references.some(r => r.view === "front") || !references.some(r => r.view === "back")) {
  console.error("For the pilot, provide cleared references/nokia-6555/front and back images (PNG/JPG/WebP).");
  process.exit(2);
}
if (!process.argv.includes("--confirm-rights")) {
  console.error("Pass --confirm-rights only if you may legally upload the reference images to Google.");
  process.exit(2);
}

async function referencePart(ref) {
  const bytes = await readFile(ref.path);
  const ext = extname(ref.path).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return { inlineData: { mimeType, data: bytes.toString("base64") } };
}

const photoParts = (await Promise.all(references.map(async (ref) => [
  { text: "REFERENCE PHOTOGRAPH — " + ref.view.toUpperCase() + " VIEW of authentic " + PHONE + "." },
  await referencePart(ref)
]))).flat();
await mkdir(outputDir, { recursive: true });
const review = {
  phone: PHONE,
  model_id: MODEL_ID,
  color: COLOR,
  source_reference_views: references.map(r => r.view),
  created_utc: new Date().toISOString(),
  generated_by_ai: true,
  verified_against_real_model: false,
  publication_approved: false,
  licensing_review: "pending",
  production_write: false,
  outputs: []
};
const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
  encodeURIComponent(MODEL_ID) + ":generateContent";

for (const [view, label] of VIEWS) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptFor(label) }, ...photoParts] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "3:4", imageSize: "1K" }
      }
    }),
    signal: AbortSignal.timeout(120000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result.error?.message ?? "Unknown provider error";
    throw new Error("Gemini API rejected " + view + " (HTTP " + response.status + "): " + message);
  }
  const parts = result.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(p => p.inlineData?.data && p.inlineData?.mimeType?.startsWith("image/"));
  if (!imagePart) throw new Error("No output image for " + view + ". Check model availability/billing.");
  const file = join(outputDir, view + ".png");
  await sharp(Buffer.from(imagePart.inlineData.data, "base64"))
    .rotate()
    .png({ compressionLevel: 9 })
    .toFile(file);
  review.outputs.push({ view, filename: view + ".png", verified: false });
  await writeFile(join(outputDir, "review.json"), JSON.stringify(review, null, 2) + "\n");
  console.log("Created DRAFT " + file + " — requires model/rights review.");
}
console.log("4 draft PNG illustrations generated locally. NOT published; background is not yet guaranteed transparent.");

import "server-only";
import { getAiAdapter, aiConfigured as adapterConfigured } from "@/adapters/ai";
import { getAiCrawlersSettings } from "./queries";

/**
 * AI authoring assists — alt text, SEO suggestions, summaries. Each honors
 * its own authoring flag plus the master aiEnabled switch, and never throws:
 * when AI isn't enabled/configured, callers get a typed "unavailable" result
 * so the UI can show a quiet disabled state instead of an error boundary.
 */

export type AuthoringResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "disabled" | "unconfigured" | "cap-exceeded" | "error"; message: string };

// Very small in-memory monthly-call counter. This resets on process restart
// and isn't shared across instances — intentionally lightweight per the
// "don't over-engineer" guidance. It's a soft guard against runaway loops,
// not a billing-grade limiter.
const callCounts = new Map<string, { month: string; count: number }>();

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

function underCap(monthlyCap: number): boolean {
  if (monthlyCap <= 0) return true; // 0 = no cap.
  const month = currentMonthKey();
  const entry = callCounts.get("ai") ?? { month, count: 0 };
  if (entry.month !== month) {
    entry.month = month;
    entry.count = 0;
  }
  if (entry.count >= monthlyCap) {
    callCounts.set("ai", entry);
    return false;
  }
  entry.count += 1;
  callCounts.set("ai", entry);
  return true;
}

/** Shared gate: master switch, per-feature flag, adapter configured, cap. */
async function gate(
  flag: keyof Awaited<ReturnType<typeof getAiCrawlersSettings>>["authoring"],
): Promise<
  | { ok: true }
  | { ok: false; reason: "disabled" | "unconfigured" | "cap-exceeded"; message: string }
> {
  const settings = await getAiCrawlersSettings();
  if (!settings.aiEnabled || !settings.authoring[flag]) {
    return { ok: false, reason: "disabled", message: "AI authoring assist is turned off." };
  }
  if (!(await adapterConfigured())) {
    return {
      ok: false,
      reason: "unconfigured",
      message: "Connect an AI provider in Settings → AI & crawlers to use this.",
    };
  }
  if (!underCap(settings.provider.monthlyCap)) {
    return {
      ok: false,
      reason: "cap-exceeded",
      message: "Monthly AI request cap reached.",
    };
  }
  return { ok: true };
}

/** Suggest alt text from an image URL or short description of its context. */
export async function suggestAltText(
  imageContextOrUrl: string,
): Promise<AuthoringResult<string>> {
  const gated = await gate("alt");
  if (!gated.ok) return gated;
  try {
    const adapter = await getAiAdapter();
    const text = await adapter.complete({
      system:
        "You write concise, descriptive alt text for website images. Reply with only the alt text — no quotes, no preamble, under 125 characters.",
      prompt: `Write alt text for this image: ${imageContextOrUrl}`,
      maxTokens: 100,
    });
    return { ok: true, data: text.trim() };
  } catch (err) {
    return { ok: false, reason: "error", message: (err as Error).message };
  }
}

/** Suggest an SEO title + description from a post's title and body text. */
export async function suggestSeo(input: {
  title: string;
  bodyText: string;
}): Promise<AuthoringResult<{ title: string; description: string }>> {
  const gated = await gate("seo");
  if (!gated.ok) return gated;
  try {
    const adapter = await getAiAdapter();
    const text = await adapter.complete({
      system:
        'You write SEO metadata. Reply with strict JSON only: {"title": "...", "description": "..."}. Title under 60 characters, description under 160 characters.',
      prompt: `Page title: ${input.title}\n\nBody:\n${input.bodyText.slice(0, 4000)}`,
      maxTokens: 200,
    });
    const parsed = JSON.parse(extractJson(text)) as { title?: string; description?: string };
    if (!parsed.title || !parsed.description) throw new Error("Malformed SEO suggestion.");
    return { ok: true, data: { title: parsed.title, description: parsed.description } };
  } catch (err) {
    return { ok: false, reason: "error", message: (err as Error).message };
  }
}

/** Summarize a post's body text into a short (1-2 sentence) summary. */
export async function summarizePost(bodyText: string): Promise<AuthoringResult<string>> {
  const gated = await gate("summarize");
  if (!gated.ok) return gated;
  try {
    const adapter = await getAiAdapter();
    const text = await adapter.complete({
      system:
        "You summarize articles in 1-2 plain sentences, no preamble, no quotes around the summary.",
      prompt: bodyText.slice(0, 6000),
      maxTokens: 150,
    });
    return { ok: true, data: text.trim() };
  } catch (err) {
    return { ok: false, reason: "error", message: (err as Error).message };
  }
}

/** Models sometimes wrap JSON in prose or code fences; pull out the object. */
function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

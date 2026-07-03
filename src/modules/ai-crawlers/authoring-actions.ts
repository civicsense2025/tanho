"use server";

import { requireUser } from "@/modules/auth/guards";
import { suggestAltText, suggestSeo, summarizePost, type AuthoringResult } from "./authoring";

/**
 * Server actions the admin UI calls for AI authoring assists. Owner or
 * editor (both author content); the key itself is owner-only to manage
 * (see provider-actions.ts). Each delegates straight to authoring.ts, which
 * already gates on the flags/adapter and never throws.
 */

export async function suggestAltTextAction(
  imageContextOrUrl: string,
): Promise<AuthoringResult<string>> {
  await requireUser();
  return suggestAltText(imageContextOrUrl);
}

export async function suggestSeoAction(input: {
  title: string;
  bodyText: string;
}): Promise<AuthoringResult<{ title: string; description: string }>> {
  await requireUser();
  return suggestSeo(input);
}

export async function summarizePostAction(bodyText: string): Promise<AuthoringResult<string>> {
  await requireUser();
  return summarizePost(bodyText);
}

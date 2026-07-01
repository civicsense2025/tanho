"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface ShareButtonsProps {
  /** Absolute, canonical URL of the page being shared. Callers already have this resolved via
   * the SEO pipeline (buildMetadata()/absoluteUrl() in @/lib/seo) -- this component never
   * recomputes or fetches it, so it can never drift from what generateMetadata()/JSON-LD emit. */
  url: string;
  /** OG/display title of the page being shared. */
  title: string;
}

/** Social-share row: Twitter/X, LinkedIn, Facebook, copy-link, and (where the Web Share API is
 * available) a native "Share" button. Presentation-only -- no new DB entities, no internal data
 * fetching. Renders regardless of any entitlement/paywall state; sharing a paywalled post's
 * excerpt/URL is a legitimate growth loop, not a leak. */
export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled the native share sheet -- expected, no-op.
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
      <Button
        as="a"
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        variant="outline"
        size="sm"
        aria-label="Share on X (Twitter)"
      >
        X
      </Button>
      <Button
        as="a"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        variant="outline"
        size="sm"
        aria-label="Share on LinkedIn"
      >
        LinkedIn
      </Button>
      <Button
        as="a"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        variant="outline"
        size="sm"
        aria-label="Share on Facebook"
      >
        Facebook
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={handleCopy} aria-label="Copy link">
        {copied ? "Copied" : "Copy link"}
      </Button>
      {canNativeShare && (
        <Button type="button" variant="ghost" size="sm" onClick={handleNativeShare} aria-label="Share">
          Share
        </Button>
      )}
    </div>
  );
}

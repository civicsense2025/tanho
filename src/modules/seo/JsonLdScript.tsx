import { safeJsonLd } from "@/lib/sanitize";

/**
 * Server component that emits a JSON-LD `<script>`. The payload is escaped
 * through `safeJsonLd` (the sanctioned pattern in @/lib/sanitize) so a `<`
 * in any value becomes `<` and cannot break out of the script tag.
 */
export function JsonLd({ schema }: { schema: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
    />
  );
}

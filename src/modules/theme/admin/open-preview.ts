import type { useRouter } from "next/navigation";
import type { ThemeInput } from "../validation";

type Router = ReturnType<typeof useRouter>;

/** Opens the theme preview modal by setting previewTheme (name + scalars, JSON) in the URL. */
export function openPreview(router: Router, name: string, theme: ThemeInput) {
  const params = new URLSearchParams(window.location.search);
  // URLSearchParams encodes the value itself — pass raw JSON, not pre-encoded.
  params.set("previewTheme", JSON.stringify({ name, theme }));
  router.push(`?${params.toString()}`, { scroll: false });
}

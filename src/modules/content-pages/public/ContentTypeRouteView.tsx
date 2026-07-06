import type { ContentTypeRoute } from "../router";
import { ContentTypeIndex } from "./ContentTypeIndex";
import { ContentTypeDetail } from "./ContentTypeDetail";

/** Dispatches a resolved content-type route to its public renderer. */
export function ContentTypeRouteView({ route }: { route: ContentTypeRoute }) {
  switch (route.kind) {
    case "content-index":
      return <ContentTypeIndex type={route.type} rows={route.rows} />;
    case "content-detail":
      return <ContentTypeDetail type={route.type} row={route.row} />;
  }
}

/**
 * SEO title/description for a resolved content-type route — plain strings the
 * catch-all's generateMetadata folds into the page `<title>`. The detail page
 * uses the row's title field; the index uses the type's plural name.
 */
export function contentTypeMetaVars(route: ContentTypeRoute): {
  title: string;
  description?: string;
} {
  switch (route.kind) {
    case "content-index":
      return { title: route.type.pluralName || route.type.name };
    case "content-detail": {
      const titleField = route.type.titleField ?? "title";
      const slugField = route.type.slugField ?? "slug";
      const title =
        String(route.row[titleField] ?? "") || String(route.row[slugField] ?? "") || route.type.name;
      return { title };
    }
  }
}

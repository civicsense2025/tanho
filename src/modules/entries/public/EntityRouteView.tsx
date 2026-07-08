import type { EntityRoute } from "../router";
import { HubsDirectory } from "./HubsDirectory";
import { HubList } from "./HubList";
import { GuideDetail } from "./GuideDetail";

/** Dispatches a resolved entity route to its public template. */
export function EntityRouteView({ route }: { route: EntityRoute }) {
  switch (route.kind) {
    case "hubs-directory":
      return <HubsDirectory hubs={route.hubs} countsByHub={route.countsByHub} />;
    case "hub-list":
      return <HubList hub={route.hub} guides={route.guides} />;
    case "guide-detail":
      return <GuideDetail entry={route.entry} hub={route.hub} />;
  }
}

/** SEO content type + template vars for a resolved entity route. */
export function entityMetaVars(route: EntityRoute): {
  type: string;
  vars: { title?: string; excerpt?: string; tag?: string };
} {
  switch (route.kind) {
    case "guide-detail": {
      const d = route.entry.data as { summary?: string; category?: string };
      return {
        type: "guide",
        vars: { title: route.entry.title, excerpt: d.summary, tag: d.category },
      };
    }
    case "hubs-directory":
      return { type: "page", vars: { title: "Guides" } };
    case "hub-list": {
      const d = route.hub.data as { tagline?: string };
      return { type: "page", vars: { title: route.hub.title, excerpt: d.tagline } };
    }
  }
}

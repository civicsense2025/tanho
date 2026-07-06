// Aggregated Drizzle schema. This file ONLY re-exports each module's
// schema.ts so drizzle-kit and the client see one schema object while
// table definitions stay colocated with their feature module.
// See docs/architecture/entities.md.

export * from "@/modules/settings/schema";
export * from "@/modules/theme/schema";
export * from "@/modules/fonts/schema";
export * from "@/modules/auth/schema";
export * from "@/modules/auth/api-tokens/schema";
export * from "@/modules/audit/schema";
export * from "@/modules/media/schema";
export * from "@/modules/entries/schema";
export * from "@/modules/profile/schema";
export * from "@/modules/pages/schema";
export * from "@/modules/blocks/schema";
export * from "@/modules/menus/schema";
export * from "@/modules/tags/schema";
export * from "@/modules/custom-types/schema";
export * from "@/modules/people/schema";
export * from "@/modules/commerce/schema";
export * from "@/modules/scheduling/schema";
export * from "@/modules/analytics/schema";
export * from "@/modules/forms/schema";
export * from "@/modules/policies/schema";
export * from "@/modules/redirects/schema";
export * from "@/modules/seo/schema";
export * from "@/modules/integrations/schema";
export * from "@/modules/data-sources/schema";
export * from "@/modules/data-sources/oauth-schema";
export * from "@/modules/importers/ghost/schema";
export * from "@/modules/imports/schema";

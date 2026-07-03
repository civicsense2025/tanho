import { z } from "zod";

/**
 * Safe link targets only: web URLs, site-relative paths, anchors, mailto.
 * Same allowlist as the buttons block — javascript:/data: URIs can't pass.
 */
export const linkHrefSchema = z
  .string()
  .min(1)
  .max(2000)
  .regex(/^(https?:\/\/|\/|#|mailto:)/, "Must be a web URL, /path, #anchor or mailto:");

/** linkHrefSchema that also accepts "" (field not set yet). */
export const linkHrefOrEmptySchema = z.union([linkHrefSchema, z.literal("")]);

/** How a nav item's children render in the desktop dropdown. */
export const DROPDOWN_STYLES = ["simple", "mega", "cards", "icons"] as const;
export type DropdownStyle = (typeof DROPDOWN_STYLES)[number];

export type MenuItem = {
  id: string;
  label: string;
  href: string;
  dropdownStyle?: DropdownStyle;
  /** Column heading when the parent renders a mega dropdown. */
  group?: string;
  /** Short blurb for cards/icons dropdown styles. */
  desc?: string;
  /** Tiny glyph/letters shown in the cards/icons tile. */
  icon?: string;
  children?: MenuItem[];
};

/** One nav item; children nest recursively (dropdowns, grouped columns). */
export const menuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  z.object({
    id: z.string().min(1).max(64),
    label: z.string().max(80),
    href: linkHrefSchema,
    dropdownStyle: z.enum(DROPDOWN_STYLES).optional(),
    group: z.string().max(60).optional(),
    desc: z.string().max(160).optional(),
    icon: z.string().max(30).optional(),
    children: z.array(menuItemSchema).max(50).optional(),
  }),
);

export const menuItemsSchema = z.array(menuItemSchema).max(50);

export const menuSchema = z.object({
  name: z.string().min(1).max(80),
  items: menuItemsSchema.default([]),
});

export type MenuInput = z.infer<typeof menuSchema>;

/** Hard cap on a serialized items tree — abuse guard for the save action. */
export const MAX_MENU_BYTES = 100_000;

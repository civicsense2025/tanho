import { z } from "zod";
import { linkHrefOrEmptySchema } from "@/modules/menus/validation";
import { HEADER_LAYOUT_IDS } from "./header-recipes";
import { FOOTER_LAYOUT_IDS } from "./footer-recipes";

/**
 * Chrome config schemas — stored in the `settings` table under the
 * header / footer / announcement namespaces (registered in
 * modules/settings/validation.ts, saved via saveSettings).
 *
 * White-label rule: empty logo text / copyright mean "derive from the site
 * name at render time" — a brand default is never stored.
 */

const logoSchema = z.object({
  /** Empty = use the site name (general settings) at render time. */
  text: z.string().max(60).default(""),
  style: z.enum(["mark", "wordmark", "icon"]).default("mark"),
  /** Short glyph/letters for the icon style; empty = initials. */
  icon: z.string().max(30).default(""),
});
const LOGO_DEFAULTS = { text: "", style: "mark" as const, icon: "" };

export const headerConfigSchema = z.object({
  layout: z.enum(HEADER_LAYOUT_IDS).default("center-cta"),
  logo: logoSchema.default(LOGO_DEFAULTS),
  /** Menu powering the nav; empty = first menu, missing = empty nav. */
  menuId: z.string().max(64).default(""),
  cta: z
    .object({
      enabled: z.boolean().default(false),
      label: z.string().max(40).default(""),
      href: linkHrefOrEmptySchema.default(""),
      variant: z.enum(["solid", "accent", "outline"]).default("solid"),
    })
    .default({ enabled: false, label: "", href: "", variant: "solid" }),
  sticky: z.boolean().default(true),
  transparentOnHero: z.boolean().default(false),
  mobile: z
    .object({
      style: z.enum(["drawer-right", "drawer-left", "fullscreen", "dropdown"]).default("drawer-right"),
    })
    .default({ style: "drawer-right" }),
});
export type HeaderConfig = z.infer<typeof headerConfigSchema>;
export const HEADER_DEFAULTS: HeaderConfig = headerConfigSchema.parse({});

export const footerColumnSchema = z.object({
  title: z.string().max(40).default(""),
  menuId: z.string().max(64).default(""),
});
export type FooterColumn = z.infer<typeof footerColumnSchema>;

export const footerConfigSchema = z.object({
  layout: z.enum(FOOTER_LAYOUT_IDS).default("simple-centered"),
  logo: logoSchema.default(LOGO_DEFAULTS),
  columns: z.array(footerColumnSchema).max(4).default([]),
  socialMenuId: z.string().max(64).default(""),
  newsletter: z
    .object({
      enabled: z.boolean().default(false),
      title: z.string().max(80).default(""),
      body: z.string().max(200).default(""),
      cta: z.string().max(30).default(""),
    })
    .default({ enabled: false, title: "", body: "", cta: "" }),
  /** Empty = render "© {currentYear} {site name}" at render time. */
  copyright: z.string().max(160).default(""),
});
export type FooterConfig = z.infer<typeof footerConfigSchema>;
export const FOOTER_DEFAULTS: FooterConfig = footerConfigSchema.parse({});

export const announcementMessageSchema = z.object({
  text: z.string().max(160).default(""),
  cta: z
    .object({
      label: z.string().max(40).default(""),
      url: linkHrefOrEmptySchema.default(""),
    })
    .optional(),
});
export type AnnouncementMessage = z.infer<typeof announcementMessageSchema>;

export const announcementConfigSchema = z.object({
  enabled: z.boolean().default(false),
  style: z.enum(["solid", "gradient", "outline", "marquee"]).default("solid"),
  tone: z.enum(["ink", "accent", "accent2", "paper"]).default("ink"),
  dismissible: z.boolean().default(true),
  rotateMs: z.number().int().min(2000).max(20000).default(6000),
  messages: z.array(announcementMessageSchema).max(5).default([]),
});
export type AnnouncementConfig = z.infer<typeof announcementConfigSchema>;
export const ANNOUNCEMENT_DEFAULTS: AnnouncementConfig = announcementConfigSchema.parse({});

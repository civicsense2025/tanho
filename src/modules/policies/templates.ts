/**
 * Neutral, brand-free policy templates. Shared by the seed (default drafts)
 * and the admin editor's "reset to template" action. Placeholders like
 * "your site" and "privacy@yoursite" are meant to be edited per deployment —
 * NO real brand, URL, or contact belongs here (white-label rule).
 */

export type PolicyTemplate = {
  slug: string;
  title: string;
  group: "site" | "store";
  body: string;
};

const PRIVACY = `## Privacy Policy

This policy explains what personal information your site collects, how it is
used, and the choices visitors have.

### Information we collect
Describe the data collected (for example account details, form submissions,
and basic analytics).

### How we use it
Describe the purposes: operating the site, responding to enquiries, and
improving the service.

### Your choices
Visitors may request access to, correction of, or deletion of their data by
contacting privacy@yoursite.

### Contact
Questions about this policy can be sent to privacy@yoursite.`;

const TERMS = `## Terms of Service

By using this site you agree to these terms.

### Use of the site
Use the site lawfully and do not attempt to disrupt or misuse it.

### Content
Content on this site is provided as-is. Describe any licensing or usage
restrictions here.

### Changes
These terms may be updated. Continued use after changes means you accept the
updated terms.

### Contact
Questions about these terms can be sent to legal@yoursite.`;

const COOKIES = `## Cookie Policy

This site uses cookies and similar technologies.

### What cookies we use
Describe essential cookies (needed to run the site) and any optional cookies
(for example analytics).

### Managing cookies
Explain how visitors can control cookies through their browser settings.

### Contact
Questions about cookies can be sent to privacy@yoursite.`;

/** The default site policies seeded as drafts and offered as reset templates. */
export const POLICY_TEMPLATES: PolicyTemplate[] = [
  { slug: "privacy", title: "Privacy Policy", group: "site", body: PRIVACY },
  { slug: "terms", title: "Terms of Service", group: "site", body: TERMS },
  { slug: "cookies", title: "Cookie Policy", group: "site", body: COOKIES },
];

/** Look up a template body by slug (for "reset to template"). */
export function templateForSlug(slug: string): PolicyTemplate | undefined {
  return POLICY_TEMPLATES.find((t) => t.slug === slug);
}

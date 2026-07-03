/**
 * Template rendering — replaces {{placeholders}} in confirmation/reminder copy
 * with a booking's values. Pure and dependency-free: the same helper drives the
 * live admin preview and the outbound console-email text.
 */

export type TemplateVars = {
  name: string;
  first: string;
  email: string;
  event: string;
  date: string;
  time: string;
  tz: string;
  location: string;
  manage_url: string;
  when: string;
};

/** Build the placeholder map from a booking + event type + manage URL. */
export function templateVars(input: {
  name: string;
  email: string;
  eventName: string;
  date: string;
  time: string;
  tz: string;
  location: string;
  manageUrl: string;
}): TemplateVars {
  const first = input.name.trim().split(/\s+/)[0] ?? input.name;
  return {
    name: input.name,
    first,
    email: input.email,
    event: input.eventName,
    date: input.date,
    time: input.time,
    tz: input.tz,
    location: input.location,
    manage_url: input.manageUrl,
    when: `${input.date} at ${input.time} (${input.tz})`,
  };
}

/**
 * Replace every {{key}} token in `str` with its value. Unknown tokens are left
 * intact so authors see their typos rather than blank gaps.
 */
export function renderTemplate(str: string, vars: TemplateVars): string {
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = (vars as Record<string, string>)[key];
    return value === undefined ? match : value;
  });
}

/** The placeholder chips the admin templates editor offers. */
export const TEMPLATE_PLACEHOLDERS: Array<keyof TemplateVars> = [
  "name",
  "first",
  "email",
  "event",
  "date",
  "time",
  "tz",
  "location",
  "when",
  "manage_url",
];

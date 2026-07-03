import { forms } from "../../src/modules/forms/schema";
import {
  formDesignSchema,
  formSettingsSchema,
  type FormField,
} from "../../src/modules/forms/validation";
import { log, type SeedDb } from "../lib";

const EXAMPLE_NAME = "Contact";

/**
 * Neutral forms seed. ONE published "Contact" form (name, email, message),
 * storing submissions as contacts (leads). No responses, no brand. Idempotent:
 * skips if a form with this name already exists.
 */
export async function seedForms(db: SeedDb) {
  const existing = await db.query.forms.findFirst();
  if (existing) {
    log("forms already present, skipping");
    return;
  }

  const field = (over: Partial<FormField> & Pick<FormField, "id" | "kind">): FormField => ({
    label: "",
    required: false,
    placeholder: "",
    help: "",
    options: [],
    correct: [],
    points: 0,
    default: "",
    pattern: "",
    currency: "usd",
    multi: false,
    accept: "",
    amountCents: 0,
    ...over,
  });

  const fields: FormField[] = [
    field({ id: "name", kind: "text", label: "Name", required: true, placeholder: "Your name" }),
    field({ id: "email", kind: "email", label: "Email", required: true, placeholder: "you@example.com" }),
    field({ id: "message", kind: "textarea", label: "Message", required: true, placeholder: "How can we help?" }),
  ];

  const design = formDesignSchema.parse({ theme: "studio", layout: "classic" });
  const settings = formSettingsSchema.parse({
    submitLabel: "Send",
    postSubmit: "message",
    message: "Thanks — we'll be in touch.",
    storeIn: "contacts",
  });

  const now = Date.now();
  await db.insert(forms).values({
    name: EXAMPLE_NAME,
    type: "form",
    status: "published",
    fields,
    design,
    settings,
    quiz: null,
    analytics: { views: 0, starts: 0, completions: 0 },
    createdAt: now,
    updatedAt: now,
  });
  log(`forms.${EXAMPLE_NAME} seeded (published contact form)`);
}

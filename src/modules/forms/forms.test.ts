import { describe, expect, it } from "vitest";
import {
  buildSubmissionSchema,
  isHoneypotTripped,
} from "./submission-schema";
import { crmPlan, emailFromValues, scoreQuiz } from "./response-pipeline";
import { formSettingsSchema, type FormField } from "./validation";

/** A field factory that fills the zod defaults the builder expects. */
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

const contactFields: FormField[] = [
  field({ id: "name", kind: "text", label: "Name", required: true }),
  field({ id: "email", kind: "email", label: "Email", required: true }),
  field({ id: "message", kind: "textarea", label: "Message", required: true }),
];

describe("honeypot", () => {
  it("trips when the hidden field is filled", () => {
    expect(isHoneypotTripped("i am a bot")).toBe(true);
    expect(isHoneypotTripped("  x ")).toBe(true);
  });

  it("passes for a real (empty) submission", () => {
    expect(isHoneypotTripped("")).toBe(false);
    expect(isHoneypotTripped("   ")).toBe(false);
    expect(isHoneypotTripped(null)).toBe(false);
    expect(isHoneypotTripped(undefined)).toBe(false);
  });
});

describe("submission schema — validates against the form's own field defs", () => {
  const schema = buildSubmissionSchema(contactFields);

  it("accepts a well-formed submission", () => {
    const res = schema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello there",
    });
    expect(res.success).toBe(true);
  });

  it("rejects an UNKNOWN field not in the form definition", () => {
    const res = schema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      message: "Hi",
      is_admin: "true", // injected — must be rejected, not stored
    });
    expect(res.success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const res = schema.safeParse({ name: "Ada", email: "ada@example.com" });
    expect(res.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const res = schema.safeParse({ name: "Ada", email: "not-an-email", message: "Hi" });
    expect(res.success).toBe(false);
  });

  it("rejects an option value not in the field's option set", () => {
    const choice = buildSubmissionSchema([
      field({
        id: "color",
        kind: "select",
        required: true,
        options: [
          { label: "Red", value: "red" },
          { label: "Blue", value: "blue" },
        ],
      }),
    ]);
    expect(choice.safeParse({ color: "green" }).success).toBe(false);
    expect(choice.safeParse({ color: "red" }).success).toBe(true);
  });
});

describe("submission schema — file/signature only accept a key WE issued", () => {
  const fileSchema = buildSubmissionSchema([field({ id: "upload", kind: "file" })]);
  const sigSchema = buildSubmissionSchema([field({ id: "sig", kind: "signature" })]);

  it("accepts an empty file value (not uploaded, optional)", () => {
    expect(fileSchema.safeParse({ upload: "" }).success).toBe(true);
  });

  it("accepts a well-formed forms-upload key", () => {
    expect(fileSchema.safeParse({ upload: "formsabc123xyz.jpg" }).success).toBe(true);
    expect(fileSchema.safeParse({ upload: "formsabc123xyz.pdf" }).success).toBe(true);
  });

  it("rejects an arbitrary client-supplied string", () => {
    expect(fileSchema.safeParse({ upload: "../../etc/passwd" }).success).toBe(false);
    expect(fileSchema.safeParse({ upload: "not-a-key" }).success).toBe(false);
    expect(fileSchema.safeParse({ upload: "media/abc123.jpg" }).success).toBe(false);
  });

  it("rejects a disallowed extension even inside the right shape", () => {
    expect(fileSchema.safeParse({ upload: "formsabc123.exe" }).success).toBe(false);
    expect(fileSchema.safeParse({ upload: "formsabc123.svg" }).success).toBe(false);
  });

  it("accepts an empty signature, an uploaded key, or a typed fallback", () => {
    expect(sigSchema.safeParse({ sig: "" }).success).toBe(true);
    expect(sigSchema.safeParse({ sig: "formsabc123xyz.png" }).success).toBe(true);
    expect(sigSchema.safeParse({ sig: "typed:Ada Lovelace" }).success).toBe(true);
  });

  it("rejects a signature value that is none of those shapes", () => {
    expect(sigSchema.safeParse({ sig: "Ada Lovelace" }).success).toBe(false);
    expect(sigSchema.safeParse({ sig: "typed:" }).success).toBe(false);
  });

  it("still enforces required on file/signature", () => {
    const requiredFile = buildSubmissionSchema([
      field({ id: "upload", kind: "file", required: true }),
    ]);
    expect(requiredFile.safeParse({ upload: "" }).success).toBe(false);
    expect(requiredFile.safeParse({ upload: "formsabc123.jpg" }).success).toBe(true);
  });
});

describe("crmPlan — the testable pipeline decision (person + activity)", () => {
  const values = { name: "Ada", email: "Ada@Example.com", message: "Hi" };

  it("plans a lead + form activity when storeIn=contacts", () => {
    const settings = formSettingsSchema.parse({ storeIn: "contacts" });
    const plan = crmPlan({ fields: contactFields, values, settings, formName: "Contact" });
    expect(plan).not.toBeNull();
    expect(plan!.email).toBe("ada@example.com"); // normalized
    expect(plan!.name).toBe("Ada");
    expect(plan!.newKind).toBe("lead");
    expect(plan!.subscribe).toBe(false);
    expect(plan!.activityLabel).toBe("Submitted Contact");
  });

  it("plans a subscriber when storeIn=subscribers", () => {
    const settings = formSettingsSchema.parse({ storeIn: "subscribers" });
    const plan = crmPlan({ fields: contactFields, values, settings, formName: "Signup" });
    expect(plan!.newKind).toBe("subscriber");
    expect(plan!.subscribe).toBe(true);
  });

  it("stores nothing when storeIn=none or there is no email field", () => {
    const none = formSettingsSchema.parse({ storeIn: "none" });
    expect(crmPlan({ fields: contactFields, values, settings: none, formName: "X" })).toBeNull();

    const contacts = formSettingsSchema.parse({ storeIn: "contacts" });
    const noEmail = [field({ id: "name", kind: "text" })];
    expect(
      crmPlan({ fields: noEmail, values: { name: "Ada" }, settings: contacts, formName: "X" }),
    ).toBeNull();
  });
});

describe("emailFromValues", () => {
  it("returns the first email field's value, lowercased", () => {
    expect(emailFromValues(contactFields, { email: "  Bob@X.com " })).toBe("bob@x.com");
  });
  it("returns null with no email", () => {
    expect(emailFromValues(contactFields, {})).toBeNull();
  });
});

describe("scoreQuiz — server-authoritative scoring", () => {
  const quizFields: FormField[] = [
    field({ id: "q1", kind: "radio", correct: ["a"], points: 5, options: [{ label: "A", value: "a" }] }),
    field({ id: "q2", kind: "radio", correct: ["b"], points: 3, options: [{ label: "B", value: "b" }] }),
  ];

  it("sums points for correct answers only", () => {
    expect(scoreQuiz(quizFields, { q1: "a", q2: "x" }, null).score).toBe(5);
    expect(scoreQuiz(quizFields, { q1: "a", q2: "b" }, null).score).toBe(8);
  });

  it("maps score to an outcome band in outcome mode", () => {
    const quiz = {
      mode: "outcome" as const,
      outcomes: [
        { id: "lo", label: "Beginner", min: 0, message: "" },
        { id: "hi", label: "Expert", min: 6, message: "" },
      ],
    };
    expect(scoreQuiz(quizFields, { q1: "a", q2: "b" }, quiz).outcome).toBe("Expert");
    expect(scoreQuiz(quizFields, { q1: "x", q2: "x" }, quiz).outcome).toBe("Beginner");
  });
});

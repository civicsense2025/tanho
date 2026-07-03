import { eq } from "drizzle-orm";
import { people, personActivity } from "../../src/modules/people/schema";
import { log, type SeedDb } from "../lib";

/**
 * A couple of example People so the CRM segments (Members / Subscribers) and
 * the members overview aren't empty in the demo. No passwords, no real data —
 * illustrative contacts only. Idempotent by email.
 */
const PEOPLE = [
  {
    email: "maya@example.com",
    name: "Maya Fernández",
    kind: "member" as const,
    location: "Montréal, QC",
    tags: ["founding"],
    activity: [
      { type: "subscribe" as const, label: "Subscribed to the newsletter" },
      { type: "note" as const, label: "Founding member — got the poster set" },
    ],
  },
  {
    email: "devon@example.com",
    name: "Devon Clarke",
    kind: "subscriber" as const,
    location: "Austin, TX",
    tags: [],
    activity: [{ type: "subscribe" as const, label: "Subscribed to the newsletter" }],
  },
  {
    email: "sam@example.com",
    name: "Sam Okafor",
    kind: "lead" as const,
    company: "Okafor Studio",
    location: "London, UK",
    tags: ["services-enquiry"],
    activity: [{ type: "form" as const, label: "Submitted the contact form" }],
  },
];

export async function seedDemoPeople(db: SeedDb): Promise<void> {
  for (const p of PEOPLE) {
    const existing = await db.query.people.findFirst({ where: eq(people.email, p.email) });
    if (existing) continue;
    const [row] = await db
      .insert(people)
      .values({
        email: p.email,
        name: p.name,
        kind: p.kind,
        status: "active",
        company: p.company ?? "",
        location: p.location ?? "",
        tags: p.tags,
      })
      .returning({ id: people.id });
    for (const a of p.activity) {
      await db.insert(personActivity).values({ personId: row.id, type: a.type, label: a.label });
    }
  }
  log(`demo people seeded (${PEOPLE.length} example contacts)`);
}

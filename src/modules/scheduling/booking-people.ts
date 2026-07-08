import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { people } from "@/modules/people/schema";

/**
 * Upsert a booker into People by email — extracted from booking-actions.ts to
 * keep that file under the 300-line ESLint cap. Never downgrades an existing
 * member; fills in missing name/phone without clobbering existing values.
 */
export async function upsertBooker(input: {
  email: string;
  name: string;
  phone: string;
}): Promise<string> {
  const emailLc = input.email.toLowerCase();
  const existingPerson = await db.query.people.findFirst({
    where: eq(people.email, emailLc),
  });
  if (existingPerson) {
    // Fill in a missing name/phone without clobbering existing values.
    const patch: Partial<typeof people.$inferInsert> = {};
    if (!existingPerson.name && input.name) patch.name = input.name;
    if (!existingPerson.phone && input.phone) patch.phone = input.phone;
    if (Object.keys(patch).length) {
      await db.update(people).set(patch).where(eq(people.id, existingPerson.id));
    }
    return existingPerson.id;
  }
  const [row] = await db
    .insert(people)
    .values({
      email: emailLc,
      name: input.name,
      phone: input.phone,
      kind: "lead",
      status: "active",
    })
    .returning({ id: people.id });
  return row!.id;
}

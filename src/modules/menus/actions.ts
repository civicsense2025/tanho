"use server";

import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/modules/auth/guards";
import { writeAudit } from "@/modules/audit/log";
import { menus } from "./schema";
import { MAX_MENU_BYTES, menuSchema, type MenuInput } from "./validation";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const parseMenu = (input: unknown): { menu: MenuInput } | { error: string } => {
  if (JSON.stringify(input ?? {}).length > MAX_MENU_BYTES) {
    return { error: "Menu is too large" };
  }
  const parsed = menuSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid menu" };
  }
  return { menu: parsed.data };
};

export async function createMenu(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireUser("owner");
  const v = parseMenu(input);
  if ("error" in v) return { ok: false, error: v.error };

  const [row] = await db
    .insert(menus)
    .values({ ...v.menu, updatedAt: Date.now() })
    .returning({ id: menus.id });
  updateTag("menus");
  await writeAudit({ userId: user.id, action: "menu.create", ownerType: "menu", ownerId: row.id });
  return { ok: true, data: { id: row.id } };
}

export async function saveMenu(id: string, input: unknown): Promise<Result> {
  const user = await requireUser("owner");
  const v = parseMenu(input);
  if ("error" in v) return { ok: false, error: v.error };

  const existing = await db.query.menus.findFirst({ where: eq(menus.id, id) });
  if (!existing) return { ok: false, error: "Menu not found" };

  await db
    .update(menus)
    .set({ ...v.menu, updatedAt: Date.now() })
    .where(eq(menus.id, id));
  updateTag("menus");
  await writeAudit({ userId: user.id, action: "menu.save", ownerType: "menu", ownerId: id });
  return { ok: true };
}

export async function deleteMenu(id: string): Promise<Result> {
  const user = await requireUser("owner");
  await db.delete(menus).where(eq(menus.id, id));
  updateTag("menus");
  await writeAudit({ userId: user.id, action: "menu.delete", ownerType: "menu", ownerId: id });
  return { ok: true };
}

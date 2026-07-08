import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createClient } from "@libsql/client";

const clientSrc = readFileSync(
  fileURLToPath(new URL("./client.ts", import.meta.url)),
  "utf8",
);

describe("db client foreign_keys PRAGMA", () => {
  it("enables foreign_keys = ON before constructing the db export", () => {
    expect(clientSrc).toMatch(
      /await client\.execute\(["']PRAGMA foreign_keys = ON["']\)/,
    );
    const pragmaIdx = clientSrc.indexOf("PRAGMA foreign_keys = ON");
    const dbIdx = clientSrc.indexOf("export const db");
    expect(pragmaIdx).toBeGreaterThan(-1);
    expect(dbIdx).toBeGreaterThan(-1);
    expect(pragmaIdx).toBeLessThan(dbIdx);
  });

  it("PRAGMA foreign_keys = ON round-trips and enforces ON DELETE CASCADE", async () => {
    // libsql defaults foreign_keys ON (unlike stock SQLite), so this is a
    // belt-and-braces check: the PRAGMA we run is applied, and turning it OFF
    // re-introduces orphaned children — proving the test is sensitive to the
    // setting the fix guarantees.
    async function childCountAfterDeleteParent(foreignKeys: "ON" | "OFF") {
      const client = createClient({ url: ":memory:" });
      await client.execute(`PRAGMA foreign_keys = ${foreignKeys}`);
      const setting = await client.execute("PRAGMA foreign_keys");
      await client.execute(
        "CREATE TABLE parent (id INTEGER PRIMARY KEY, name TEXT)",
      );
      await client.execute(
        "CREATE TABLE child (id INTEGER PRIMARY KEY, parent_id INTEGER NOT NULL REFERENCES parent(id) ON DELETE CASCADE)",
      );
      await client.execute("INSERT INTO parent (id, name) VALUES (1, 'p')");
      await client.execute("INSERT INTO child (id, parent_id) VALUES (1, 1)");
      await client.execute("DELETE FROM parent WHERE id = 1");
      const { rows } = await client.execute("SELECT COUNT(*) AS n FROM child");
      return { setting: Number(setting.rows[0].foreign_keys), children: Number(rows[0].n) };
    }

    expect(await childCountAfterDeleteParent("ON")).toEqual({ setting: 1, children: 0 });
    expect(await childCountAfterDeleteParent("OFF")).toEqual({ setting: 0, children: 1 });
  });
});

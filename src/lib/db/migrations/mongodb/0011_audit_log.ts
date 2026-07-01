import type { MongoMigration } from "../../migrate-runner-mongodb";

// Append-only security/admin audit log (SOC 2 CC7.2 / ISO A.8.15 / HIPAA
// 164.312(b)). Written on admin login, settings changes, and content publish/
// delete. NEVER stores secrets -- only ids, actions, outcomes, and request
// context. See src/lib/audit.ts.
export const auditLog: MongoMigration = {
  name: "0011_audit_log",
  async run(db) {
    await db.collection("audit_log").createIndex({ ts: -1 });
    await db.collection("audit_log").createIndex({ action: 1 });
  },
};

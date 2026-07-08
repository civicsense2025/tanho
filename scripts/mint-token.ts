import { db } from "../src/lib/db/client";
import { apiTokens } from "../src/modules/auth/api-tokens/schema";
import { users } from "../src/modules/auth/schema";
import { hashApiToken, generateApiToken, tokenPrefix } from "../src/modules/auth/api-tokens/tokens";

async function main() {
  const u = await db.query.users.findFirst();
  if (!u) {
    console.log("NO USER — run `npm run seed` first");
    process.exit(1);
  }
  const raw = generateApiToken();
  await db.insert(apiTokens).values({
    userId: u.id,
    name: "smoke-test",
    tokenHash: hashApiToken(raw),
    prefix: tokenPrefix(raw),
  });
  console.log("USER:", u.email, u.role);
  console.log("TOKEN:", raw);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

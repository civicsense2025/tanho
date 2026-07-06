import { seedE2e } from "./fixtures/seed-e2e";

/** Playwright global setup — seed the deterministic fixture pages once before
 *  the suite. The webServer (next dev) is started by Playwright separately. */
export default async function globalSetup() {
  await seedE2e();
}

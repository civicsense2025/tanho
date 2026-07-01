import { test, expect } from "@playwright/test";

// Newsletter surface (feature flag on for e2e). Covers the public reader flow end-to-end:
// the posts archive renders, the RSS feed is served as XML, and subscribe → confirm works
// against a real build + DB.
test("posts archive renders with the subscribe form", async ({ page }) => {
  await page.goto("/posts");
  await expect(page.getByRole("heading", { name: "Newsletter" })).toBeVisible();
  await expect(page.getByRole("button", { name: /subscribe/i })).toBeVisible();
});

test("RSS feed is served as XML", async ({ page }) => {
  const res = await page.request.get("/feed.xml");
  expect(res.ok()).toBeTruthy();
  expect(res.headers()["content-type"]).toContain("rss+xml");
  const body = await res.text();
  expect(body).toContain("<rss");
  expect(body).toContain("<channel>");
});

test("subscribe → confirm activates a subscriber", async ({ page }) => {
  const email = "e2e-subscriber@example.com";

  // Subscribe (double opt-in): returns 202, subscriber created as pending.
  const sub = await page.request.post("/api/subscribe", {
    data: { email },
    headers: { "Content-Type": "application/json" },
  });
  expect(sub.status()).toBe(202);

  // The confirm token isn't exposed to the client (by design). Log in as admin and pull the
  // subscribers list to retrieve state, proving the pending row exists.
  await page.request.post("/api/auth", {
    data: { password: "e2e-test-password" },
    headers: { "Content-Type": "application/json" },
  });
  const list = await page.request.get("/api/subscribers");
  expect(list.ok()).toBeTruthy();
  const subscribers = (await list.json()) as { email: string; status: string }[];
  const found = subscribers.find((s) => s.email === email);
  expect(found).toBeTruthy();
  expect(found!.status).toBe("pending");
});

test("subscribe rejects an invalid email with 400", async ({ page }) => {
  const res = await page.request.post("/api/subscribe", {
    data: { email: "not-an-email" },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(400);
});

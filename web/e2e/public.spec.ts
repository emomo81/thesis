import { test, expect } from "@playwright/test";
test("landing page, sign-up and login are honest when Supabase is not configured", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A clearer view.");
  await page.getByRole("link", { name: "Create your workspace" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeDisabled();
  await expect(page.getByText("Account services aren’t connected", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("sample workspace changes actual precomputed examples and offers history", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(page.getByText("You’re exploring sample data.", { exact: false })).toBeVisible();
  await page.getByLabel("Example profile").selectOption("2");
  await expect(page.locator(".demo-result h2")).toHaveText("Dropout");
  await page.getByRole("link", { name: "View history" }).click();
  await expect(page).toHaveURL(/view=history/);
  await expect(
    page.getByRole("heading", { name: "A place to revisit your results." }),
  ).toBeVisible();
});
test("protected pages and APIs do not allow anonymous access", async ({ page, request }) => {
  await page.goto("/dashboard/predict");
  await expect(page).toHaveURL(/\/login$/);
  expect((await request.get("/api/history")).status()).toBe(401);
  const origin = new URL(page.url()).origin;
  expect(
    (
      await request.post("/api/predict", {
        headers: { origin },
        data: { stage: "enrollment", rows: [{}] },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/predict", {
        headers: { origin: "https://untrusted.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
test("auth callbacks do not allow arbitrary redirect destinations", async ({ page }) => {
  await page.goto("/auth/callback?next=https://untrusted.example");
  await expect(page).toHaveURL(/\/login\?error=expired-link$/);
  await expect(page.getByText("That confirmation link expired", { exact: false })).toBeVisible();
});
for (const path of ["/", "/demo", "/signup", "/model", "/privacy"]) {
  test(`mobile layout stays within viewport: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.viewport + 1);
    await expect(page.locator("main")).toBeVisible();
  });
}

import { test, expect } from "@playwright/test";

test("adult onboarding route accessible", async ({ page }) => {
  await page.goto("/onboarding/role");
  await expect(page).toHaveURL(/onboarding\/role/);
});

test("junior consent route accessible", async ({ page }) => {
  await page.goto("/onboarding/consent");
  await expect(page).toHaveURL(/onboarding\/consent/);
});

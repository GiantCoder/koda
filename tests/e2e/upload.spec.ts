import { test, expect } from "@playwright/test";

test("upload page is accessible", async ({ page }) => {
  await page.goto("/upload");
  await expect(page).toHaveURL(/upload/);
});

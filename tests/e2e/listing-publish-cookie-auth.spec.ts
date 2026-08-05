/**
 * Pre-deploy: browser session on /listings/new with stale Bearer + valid cookie → 201.
 */
import { test, expect } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL ?? "user@example.com";
const password = process.env.E2E_USER_PASSWORD ?? "Password123!";

test("listings/new context: stale Bearer does not block publish (cookie-first)", async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto("/auth/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: /Conectează-te/i }).first().click();
  await page.waitForURL(/\/(dashboard|admin\/dashboard|listings)/, { timeout: 30_000 });

  await page.goto("/listings/new", { waitUntil: "load" });

  const result = await page.evaluate(async () => {
    localStorage.setItem(
      "accessToken",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzdGFsZS1sb2NhbCJ9.invalid"
    );

    const csrfRes = await fetch("/api/csrf", { credentials: "include" });
    if (!csrfRes.ok) return { ok: false, step: "csrf", status: csrfRes.status };
    const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };

    const listRes = await fetch("/api/listings?limit=1");
    const listData = await listRes.json();
    const photo =
      listData?.data?.[0]?.photos?.[0] ||
      "https://www.clickanunt.ro/api/uploads/serve?key=listings%2Fe2e%2Foriginal%2F1.jpg";

    const payload = {
      title: `E2E listings/new ${crypto.randomUUID()}`,
      description:
        "Telefon mobil Samsung în stare foarte bună, test browser pre-deploy, descriere validă pentru publicare.",
      category: "Electronice și electrocasnice",
      subcategory: "Telefoane mobile",
      priceAmount: 650,
      priceCurrency: "RON",
      condition: "used",
      county: "Cluj",
      city: "Cluj-Napoca",
      photos: [photo],
      contactPhone: "0784712496",
      allowMessages: true,
      attributes: { brand: "Samsung", storage_gb: "128" },
    };

    // Stale Bearer in LS must not be required; cookie session authorizes publish.
    const res = await fetch("/api/listings", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken!,
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: JSON.stringify(payload),
    });

    // Cleanup legacy key after proving cookie-first still works with bad Bearer
    localStorage.removeItem("accessToken");

    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      /* empty */
    }
    return { ok: res.ok, status: res.status, body };
  });

  expect(result.status, JSON.stringify(result.body)).toBe(201);
  expect(result.body?.id).toBeTruthy();
  await expect(page).not.toHaveURL(/\/auth\/login/);
});

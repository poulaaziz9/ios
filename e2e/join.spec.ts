import { expect, test, type Page } from "@playwright/test";

// Join-by-QR smoke test. Relies on supabase/seed.sql: service "خدمة إعدادي"
// with class codes EADY1A (أولى إعدادي) and EADY2B (تانية إعدادي), and the
// service admin 01000000003 / password123.

/** A fresh Egyptian mobile number so each run signs up a new kid. */
function randomPhone() {
  return `015${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

async function signUp(page: Page, name: string) {
  await page.getByLabel("الاسم بالكامل").fill(name);
  await page.getByLabel("رقم الموبايل").fill(randomPhone());
  await page.getByLabel("كلمة السر").fill("secret12");
  await page.getByRole("button", { name: "اعمل الحساب" }).click();
}

test("new kid: QR link → signup → back to join → joins the class", async ({ page }) => {
  // What the QR code encodes.
  await page.goto("/join?code=EADY1A");
  await expect(page.getByText("عشان تنضم لازم يكون عندك حساب.")).toBeVisible();

  await page.getByRole("link", { name: "اعمل حساب" }).click();
  await expect(page).toHaveURL(/\/signup\?next=%2Fjoin%3Fcode%3DEADY1A/);
  await signUp(page, "طفل تجربة");

  // Back on the join screen, logged in, with the class shown.
  await expect(page).toHaveURL(/\/join\?code=EADY1A/);
  await expect(page.getByText("فصل أولى إعدادي")).toBeVisible();
  await expect(page.getByText("خدمة إعدادي · كنيسة مارجرجس (تجريبية)")).toBeVisible();

  await page.getByRole("button", { name: "انضم" }).click();
  await expect(page).toHaveURL(/\/s\/[0-9a-f-]{36}\/home$/);
  await expect(page.getByRole("heading", { name: "خدمة إعدادي" })).toBeVisible();

  // Scanning again is harmless and says so.
  await page.goto("/join?code=eady1a");
  await expect(page.getByText("انت منضم للخدمة دي بالفعل.")).toBeVisible();

  // Home now goes straight to the service (only/remembered destination).
  await page.goto("/");
  await expect(page).toHaveURL(/\/s\/[0-9a-f-]{36}\/home$/);
});

test("scan page: manual code entry leads to the join screen", async ({ page }) => {
  await page.goto("/scan");
  await page.getByLabel("اكتب كود الانضمام").fill("eady2b");
  await page.getByRole("button", { name: "كمّل" }).click();
  await expect(page).toHaveURL(/\/join\?code=EADY2B/);
  await expect(page.getByText("عشان تنضم لازم يكون عندك حساب.")).toBeVisible();
});

test("unknown code shows an error and lets you retry", async ({ page }) => {
  await page.goto("/signup?next=%2Fjoin%3Fcode%3DNOPE99");
  await signUp(page, "طفل تاني");
  await expect(page).toHaveURL(/\/join\?code=NOPE99/);
  await expect(page.getByText(/^الكود ده مش شغال/)).toBeVisible();
  await expect(page.getByLabel("اكتب كود الانضمام")).toHaveValue("NOPE99");
});

test("service admin sees the class QR and its printable poster", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("رقم الموبايل أو الإيميل").fill("01000000003");
  await page.getByLabel("كلمة السر").fill("password123");
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page).toHaveURL(/\/s\/[0-9a-f-]{36}\/manage$/);

  await page.getByRole("link", { name: "أكواد الانضمام" }).click();
  const card = page.locator("li", { hasText: "EADY1A" });
  await expect(card.getByRole("img", { name: "QR أولى إعدادي" })).toBeVisible();
  await expect(card.getByRole("link", { name: "نزّل الصورة" })).toHaveAttribute(
    "href",
    /^data:image\/png;base64,/,
  );

  const [poster] = await Promise.all([
    page.waitForEvent("popup"),
    card.getByRole("link", { name: "اطبع" }).click(),
  ]);
  await expect(poster.getByRole("heading", { name: "انضم لفصل أولى إعدادي" })).toBeVisible();
  await expect(poster.getByText("EADY1A")).toBeVisible();
});

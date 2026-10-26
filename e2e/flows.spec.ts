import { expect, test, type Page } from "@playwright/test";

// End-to-end flows on the seed data (run after `npx supabase db reset`).
// Serial: later steps depend on earlier ones (quiz points → gift → approval).

async function login(page: Page, phone: string) {
  await page.goto("/login");
  await page.getByLabel("رقم الموبايل أو الإيميل").fill(phone);
  await page.getByLabel("كلمة السر").fill("password123");
  await page.getByRole("button", { name: "دخول" }).click();
  await expect(page).not.toHaveURL(/\/login|\/$/);
}

test.describe.serial("served kid ↔ service admin", () => {
  const KID = "01200000005"; // أبانوب هاني, 25 points + seed achievement
  const ADMIN = "01000000003";

  test("kid takes a competition and is graded on the server", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await login(page, KID);
    await page.getByRole("link", { name: "المسابقات" }).click();
    await page.getByRole("link", { name: /مسابقة إنجيل مرقس/ }).click();

    const submit = page.getByRole("button", { name: "سلّم الإجابات" });
    await expect(submit).toBeDisabled();
    for (const answer of [/^يوحنا المعمدان$/, /^٤٠ يوم$/, /^١٢$/]) {
      await page.locator("label", { hasText: answer }).click();
    }
    await submit.click();
    await expect(page.getByText("جاوبت ٣ صح من ٣")).toBeVisible();
    await expect(page.getByText("كسبت ٣٠ نقطة")).toBeVisible();

    // One attempt only.
    await page.reload();
    await expect(page.getByText("نتيجتك: ٣٠ نقطة")).toBeVisible();
  });

  test("kid requests a gift, which reserves points", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await login(page, KID);
    await page.getByRole("link", { name: "استبدل نقطك بهدايا" }).click();
    const before = await page.getByText(/معاك .* نقطة متاحة/).innerText();
    await page.locator("li", { hasText: "أيقونة صغيرة" }).getByRole("button", { name: "اطلبها" }).click();
    await expect(page.getByText("مستني الموافقة")).toBeVisible();
    await expect(page.getByText(/معاك .* نقطة متاحة/)).not.toHaveText(before);
  });

  test("admin approves; the ledger is debited and the kid sees it", async ({ page }) => {
    await login(page, ADMIN);
    await page.getByRole("link", { name: "الهدايا" }).click();
    const request = page.locator("li", { hasText: "أبانوب هاني" });
    await request.getByRole("button", { name: "وافق" }).click();
    await expect(request.getByText("اتوافق عليه")).toBeVisible();

    await page.getByRole("link", { name: "النقاط" }).click();
    await expect(page.locator("li", { hasText: "أبانوب هاني" }).first()).toContainText("-60");
  });
});

test("servant logs a visit and earns the visit points", async ({ page }) => {
  await login(page, "01100000002"); // خادمة مريم
  const points = page.locator(".text-5xl");
  const before = await points.innerText();

  await page.getByRole("link", { name: "مخدوميني" }).first().click();
  const kid = page.locator("li", { hasText: "ڤيرونيا عماد" });
  await kid.getByText("سجّل افتقاد").click();
  await kid.getByText("زيارة", { exact: true }).click();
  await kid.getByRole("button", { name: "حفظ" }).click();
  await expect(kid.getByText("اتسجل الافتقاد ✓")).toBeVisible();

  await page.getByRole("link", { name: "الرئيسية" }).click();
  await expect(points).not.toHaveText(before);
});

test("any servant records meeting attendance for kids of the whole service", async ({ page }) => {
  // خادمة مريم serves تانية إعدادي, yet can mark a kid from أولى إعدادي.
  await login(page, "01100000002");
  await page.getByRole("link", { name: "الاجتماعات" }).click();
  await page.getByRole("link", { name: "الحضور" }).click();
  await expect(page.getByRole("heading", { name: "حضور الاجتماع" })).toBeVisible();

  await page.getByPlaceholder("دوّر على اسم").fill("كيرلس");
  const kid = page.getByRole("checkbox", { name: "كيرلس عادل" });
  await kid.check();
  await page.getByRole("button", { name: "احفظ الحضور" }).click();
  await expect(page.getByText(/اتسجل حضور .* مخدوم ✓/)).toBeVisible();
  await expect(kid).toBeChecked(); // still ticked on screen after saving

  await page.reload();
  await expect(page.getByRole("checkbox", { name: "كيرلس عادل" })).toBeChecked();
  await expect(page.getByRole("heading", { name: "الاجتماعات اللي فاتت" })).toBeVisible();
});

test("admin plans a meeting; the speaker sees it in their lessons and kids see it", async ({ browser }) => {
  const topic = `درس تجربة ${Date.now()}`;

  const admin = await browser.newPage();
  await login(admin, "01000000003");
  await admin.goto("/s/20000000-0000-4000-a000-000000000001/manage/meetings");
  await admin.getByLabel("يوم الاجتماع").fill("2099-01-15");
  await admin.getByLabel("الميعاد (اختياري)").fill("18:30");
  await admin.getByLabel("الموضوع / الدرس").fill(topic);
  await admin.getByLabel("الخادم المسؤول عن الكلمة").selectOption({ label: "خادم مينا" });
  await admin.getByRole("button", { name: "أضف الاجتماع" }).click();
  await expect(admin.getByText(topic)).toBeVisible();

  const servant = await browser.newPage();
  await login(servant, "01100000001");
  await servant.getByRole("link", { name: "الاجتماعات" }).click();
  await servant.getByRole("link", { name: "دروسي" }).click();
  await expect(servant.getByText(topic)).toBeVisible();

  const kid = await browser.newPage();
  await login(kid, "01200000002");
  await kid.getByRole("link", { name: "الاجتماعات" }).click();
  const card = kid.locator("li", { hasText: topic });
  await expect(card).toBeVisible();
  await expect(card.getByText("خادم مينا")).toBeVisible();
});

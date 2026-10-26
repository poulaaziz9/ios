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

    await expect(page.getByText("النقط اتضافت لمجموعك ✓")).toBeVisible();

    // One attempt only; reopening shows the score and the corrected sheet.
    await page.reload();
    await expect(page.getByText("كسبت ٣٠ نقطة")).toBeVisible();
    await expect(page.getByRole("heading", { name: "التصحيح" })).toBeVisible();
    await expect(page.getByText("الإجابات الصح هتظهر بعد ما المسابقة تخلص.")).toBeVisible();
  });

  test("kid requests a gift, which reserves points", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await login(page, KID);
    await page.getByRole("link", { name: "الهدايا" }).click();
    const before = await page.getByText(/معاك .* نقطة متاحة/).innerText();
    await page.locator("li", { hasText: "أيقونة صغيرة" }).getByRole("button", { name: "اطلبها" }).click();
    await expect(page.getByText("مستني الموافقة")).toBeVisible();
    await expect(page.getByText(/معاك .* نقطة متاحة/)).not.toHaveText(before);
  });

  test("admin approves; the ledger is debited and the kid sees it", async ({ page }) => {
    await login(page, ADMIN);
    // The pending request shows up as a notification on the dashboard and the tab.
    await expect(page.getByText("فيه طلب هدية مستني ردك")).toBeVisible();
    await page.getByRole("link", { name: "طلبات الهدايا ١" }).click();
    const request = page.locator("li", { hasText: "أبانوب هاني" });
    await request.getByRole("button", { name: "وافق" }).click();
    await expect(request.getByText("اتوافق عليه")).toBeVisible();
    await expect(page.getByRole("link", { name: "طلبات الهدايا", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "النقاط" }).click();
    await expect(page.locator("li", { hasText: "أبانوب هاني" }).first()).toContainText("-60");
  });

  // Runs after the kid solved the quiz, so the new questions don't change it.
  test("admin uploads competition questions from an Excel file", async ({ page }) => {
    await login(page, "01000000003");
    await page.goto("/s/20000000-0000-4000-a000-000000000001/manage/competitions/50000000-0000-4000-a000-000000000001");
    await page.getByText("رفع الأسئلة من ملف").click();

    // A broken file adds nothing and says which rows to fix.
    await page.getByLabel("الملف (.xlsx أو .csv)").setInputFiles("e2e/fixtures/questions-bad.csv");
    await page.getByRole("button", { name: "ارفع الأسئلة" }).click();
    await expect(page.getByText(/سطر ٢: لازم اختيارين على الأقل/)).toBeVisible();
    await expect(page.getByText(/سطر ٣: الإجابة الصحيحة لازم تكون رقم من ١ لـ ٢/)).toBeVisible();

    await page.getByLabel("الملف (.xlsx أو .csv)").setInputFiles("e2e/fixtures/questions.xlsx");
    await page.getByRole("button", { name: "ارفع الأسئلة" }).click();
    await expect(page.getByText("اتضاف ٢ سؤال ✓")).toBeVisible();
    await expect(page.getByText("سؤال إكسل ١: مين بنى الفلك؟")).toBeVisible();
    await expect(page.getByText("سؤال إكسل ٢: كام سفر في الكتاب المقدس الأرثوذكسي؟")).toBeVisible();
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

test("sidebar lists the user's areas and sections; logout lives in the profile", async ({ page }) => {
  await login(page, "01100000001");
  await page.getByRole("button", { name: "افتح القائمة" }).click();
  const menu = page.getByRole("dialog");
  await expect(menu.getByRole("link", { name: "الحضور" })).toBeVisible();
  await expect(menu.getByRole("link", { name: /حسابي.*نقطة/ })).toBeVisible(); // the servant's points
  await menu.getByRole("link", { name: "الترتيب" }).click();
  await expect(page).toHaveURL(/\/servant\/board$/);
  await expect(menu).toBeHidden();

  await page.getByRole("button", { name: "افتح القائمة" }).click();
  await menu.getByRole("link", { name: /حسابي/ }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByRole("button", { name: "تسجيل خروج" }).click();
  await expect(page).toHaveURL(/\/login/);
});

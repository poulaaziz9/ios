# النشر (Supabase + Vercel)

الخطوات دي بتطلّع التطبيق أونلاين لأول مرة. محتاج حساب على [supabase.com](https://supabase.com) و[vercel.com](https://vercel.com) وGitHub.

## من الموبايل (من غير كمبيوتر)

كل ده بيتعمل من متصفح الموبايل (Chrome أو Safari). افتح المواقع بوضع "Desktop site" لو الصفحة ضيقة.

1. **ادمج الـPR:** افتح [PR #1](https://github.com/poulaaziz9/ios/pull/1) ودوس **Merge pull request**.
2. **Supabase:** على [supabase.com](https://supabase.com) اعمل **New project** واحفظ الـ**Database password** اللي هتختارها.
   - من **Authentication → Sign In / Providers → Email** اقفل **Confirm email**.
3. **مفاتيح لـGitHub:** في الريبو على GitHub روح **Settings → Secrets and variables → Actions → New repository secret** وضيف التلاتة دول:
   - `SUPABASE_ACCESS_TOKEN`: من supabase.com → صورتك → **Account preferences → Access Tokens → Generate new token**.
   - `SUPABASE_PROJECT_REF`: الكود اللي في لينك المشروع، بعد `/project/`.
   - `SUPABASE_DB_PASSWORD`: كلمة سر الداتابيز من خطوة ٢.
4. **جهّز الداتابيز:** في الريبو روح **Actions → Database setup → Run workflow**.
   - لو عايز تجرب بالحسابات التجريبية (كلمة السر `password123`) علّم على **demo_data**. ده للتجربة بس، متعملوش على النسخة الحقيقية.
   - استنى لحد ما تبقى ✅.
5. **Vercel:** على [vercel.com](https://vercel.com) اعمل تسجيل دخول بـGitHub، وبعدين **Add New → Project** واختار الريبو `ios`. قبل **Deploy** افتح **Environment Variables** وضيف:
   - `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: من Supabase → **Project Settings → API**.
   - `NEXT_PUBLIC_SITE_URL`: سيبه دلوقتي، وبعد أول Deploy حط فيه اللينك اللي Vercel هيديهولك واعمل **Redeploy**.
6. **افتح اللينك من الموبايل**، ومن قايمة المتصفح اختار **Add to Home Screen** عشان يبقى زي الأبلكيشن.
7. **خلي نفسك الأمين العام:** خطوة ٣ تحت (سطر SQL واحد من **SQL Editor** في Supabase).

الخطوات اللي تحت دي نفس الكلام من كمبيوتر.

## ١. مشروع Supabase

1. اعمل مشروع جديد على Supabase. اختار منطقة قريبة من مصر (مثلاً `eu-central-1` فرانكفورت).
2. من جهازك، جوه فولدر المشروع:
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>   # موجود في رابط المشروع
   npx supabase db push                             # بيطبّق كل الـmigrations (الجداول والصلاحيات وأماكن الصور)
   ```
   **متشغّلش `supabase/seed.sql` على السيرفر الحقيقي.** ده للتجربة على جهازك بس.
3. من **Authentication → Sign In / Providers → Email**:
   - اقفل **Confirm email**. التسجيل بالموبايل بيستخدم إيميل وهمي ومفيش رسالة تأكيد هتوصل.
   - خلي **Minimum password length** = 6.
4. من **Authentication → URL Configuration**:
   - **Site URL** = لينك التطبيق على Vercel (هتاخده في الخطوة ٢)، مثلاً `https://khedma.vercel.app`.
5. من **Project Settings → API** خد:
   - `Project URL`
   - `Publishable key` (اسمه `anon` في المشاريع القديمة)

## ٢. Vercel

1. **Add New → Project** واختار الـrepo ده من GitHub. الإعدادات الافتراضية لـNext.js مظبوطة.
2. **Environment Variables**:
   | الاسم | القيمة |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | الـProject URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | الـPublishable key |
   | `NEXT_PUBLIC_SITE_URL` | لينك التطبيق النهائي (اللي هيتحط جوه أكواد الـQR) |
3. **Deploy**. لو غيّرت الدومين بعد كده، غيّر `NEXT_PUBLIC_SITE_URL` واعمل Redeploy، **واطبع أكواد الـQR من جديد**.

## ٣. أول مدير للمنصة

1. افتح التطبيق واعمل حساب عادي برقم موبايلك.
2. من Supabase → **SQL Editor** شغّل (بالرقم بتاعك بصيغة `+20…`):
   ```sql
   update public.profiles set is_super_admin = true where phone = '+201XXXXXXXXX';
   ```
3. اعمل تسجيل خروج ودخول. هتلاقي "إدارة المنصة": ضيف الكنايس وعيّن أمناءها.

## ٤. تحديثات بعد كده

- تغييرات الكود: أي push على الفرع الرئيسي بيتنشر تلقائي على Vercel.
- تغييرات قاعدة البيانات (`supabase/migrations/*`): شغّل `npx supabase db push` **قبل** ما الكود الجديد يتنشر.

## ملاحظات

- **النسخ الاحتياطي:** خطة Supabase المجانية بتعمل نسخة احتياطية يومية لمدة محدودة. لو البيانات مهمة، فكّر في الخطة المدفوعة.
- **الخصوصية:** أغلب المستخدمين أطفال. الصور private، والأرقام مش ظاهرة غير للأمناء والخادم المسؤول. متدّيش الـ`service_role` key لأي حد ومتحطوش في Vercel.

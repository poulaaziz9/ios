# النشر (Supabase + Vercel)

الخطوات دي بتطلّع التطبيق أونلاين لأول مرة. محتاج حساب على [supabase.com](https://supabase.com) و[vercel.com](https://vercel.com) وGitHub.

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

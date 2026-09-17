# نشر مشروع ALDi Mobilya على Vercel (للمعاينة قبل شراء الدومين)

المشروع مبني بنظام **monorepo** بواسطة `pnpm` ويحتوي على تطبيقين رئيسيين في نفس المستودع (`salihnet199/aldimobilya`):
1. `apps/web`: الموقع العام للمستخدمين والعملاء.
2. `apps/admin`: لوحة التحكم الإدارية.
3. `packages/db`: حزمة قاعدة البيانات المشتركة (Prisma + Neon Postgres).

يجب إنشاء **مشروعين منفصلين** على Vercel لنفس المستودع.

---

## 1. إنشاء مشروعي Vercel

1. سجل الدخول إلى [vercel.com](https://vercel.com/) واربط حساب GitHub.
2. **المشروع الأول (الموقع العام):**
   - اختر المستودع `salihnet199/aldimobilya`.
   - عيّن **Root Directory** = `apps/web`.
   - اسم المشروع: مثلاً `aldimobilya-web`.
3. **المشروع الثاني (لوحة التحكم):**
   - اختر نفس المستودع `salihnet199/aldimobilya`.
   - عيّن **Root Directory** = `apps/admin`.
   - اسم المشروع: مثلاً `aldimobilya-admin`.
4. سيحصل كل مشروع على نطاق فرعي تجريبي مجاني (`xxx.vercel.app`) عند أول نشر.

---

## 2. إعداد متغيرات البيئة (Environment Variables)

من إعدادات كل مشروع في Vercel: **Project Settings → Environment Variables**:

### المتغيرات المشتركة (تضاف في كلا المشروعين `web` و `admin`):
- `DATABASE_URL`: رابط اتصال قاعدة البيانات (Neon Postgres مع Pooler).
- `DIRECT_URL`: رابط الاتصال المباشر بقاعدة البيانات (Neon Direct).
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`: اسم الحساب في Cloudinary.
- `CLOUDINARY_API_KEY`: المفتاح العام في Cloudinary.
- `CLOUDINARY_API_SECRET`: المفتاح السري في Cloudinary.

### المتغيرات الخاصة بـ `apps/admin` فقط:
- `AUTH_SECRET`: مفتاح التشفير لجلسات تسجيل الدخول (يمكن توليده عبر `npx auth secret`).
- `NEXTAUTH_URL`: رابط لوحة التحكم على Vercel (مثلاً `https://aldimobilya-admin.vercel.app`).
- `NEXT_PUBLIC_SITE_URL`: رابط الموقع العام (مثلاً `https://aldimobilya-web.vercel.app`).

> ⚠️ **تنبيه أمني هام:** الصق القيم مباشرة في حقول Vercel من مصادرها الرسمية ولا تشاركها في محادثات نصية.

---

## 3. تجهيز قاعدة بيانات الإنتاج

- إذا كنت تستخدم نفس قاعدة بيانات Neon السابقة: لا حاجة لإعادة الترحيل.
- إذا كانت قاعدة بيانات جديدة مخصصة للإنتاج، نفّذ الترحيل بالأمر المخصص للإنتاج (بدون تفاعل):
  ```bash
  pnpm --filter @aldimobilya/db exec prisma migrate deploy
  ```

---

## 4. النشر التلقائي (Deployment)

1. بمجرد دفع التحديثات إلى فرع `main` (`git push origin main`)، ستقوم Vercel تلقائياً ببناء ونشر التطبيقين.
2. إذا كانت قاعدة البيانات جديدة، أنشئ حساب المدير الأول (Seed) بتنفيذ الأمر مرة واحدة:
  ```bash
  pnpm --filter @aldimobilya/db db:seed
  ```

---

## 5. اختبار ومعاينة الموقع المنشور

1. **الموقع العام (`apps/web`):**
   - افتح رابط `xxx.vercel.app` وتأكد من عمل الصفحة الرئيسية، قسم "لماذا نحن"، الكتالوج، وتفاصيل الغرف ومقاطع الفيديو.
2. **لوحة التحكم (`apps/admin`):**
   - افتح رابط لوحة التحكم وسجّل الدخول بحساب المدير.
   - جرّب إضافة/تعديل غرفة ورفع صورة للتأكد من ربط Cloudinary بنجاح.

---

## 6. قبل الإرسال للعميل / صاحب الشركة

- تأكد من وجود بيانات واقعية وصور حقيقية للغرف والأقسام.
- اضبط أرقام الواتساب وروابط السوشيال ميديا وعناوين التواصل من صفحة **الإعدادات** في لوحة التحكم.

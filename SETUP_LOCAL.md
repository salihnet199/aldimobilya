# تشغيل مشروع ALDi Mobilya محلياً للمعاينة قبل النشر

المشروع: monorepo مدار بـ `pnpm` (Next.js) — يحتوي تطبيقين:
- `apps/web`: الموقع العام
- `apps/admin`: لوحة التحكم
- `packages/db`: قاعدة بيانات Postgres عبر Neon مدارة بواسطة Prisma

---

## الخطوات بالترتيب

### 1. المتطلبات الأساسية
تأكد من وجود Node.js نسخة 22 أو أحدث، ثم ثبّت `pnpm`:
```bash
npm install -g pnpm@11.10.0
```

### 2. سحب أحدث نسخة
```bash
git pull origin main
```

### 3. تثبيت الحزم من جذر المشروع
```bash
pnpm install
```

### 4. إعداد متغيرات البيئة (`.env`)
انسخ كل ملف `.env.example` الموجود في:
- `apps/admin/.env.example` -> `apps/admin/.env`
- `apps/web/.env.example` -> `apps/web/.env`
- `packages/db/.env.example` -> `packages/db/.env`
- `.env.example` (في جذر المشروع) -> `.env.local`

وعبّئ القيم المطلوبة:
- `DATABASE_URL` و `DIRECT_URL` (من Neon Postgres)
- `AUTH_SECRET` (توليد مفتاح عشوائي بالأمر `npx auth secret`)
- مفاتيح Cloudinary (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)

### 5. تطبيق ترحيل قاعدة البيانات
```bash
pnpm --filter @aldimobilya/db exec prisma migrate dev
```

### 6. إنشاء حساب المدير الأول (Seed)
```bash
pnpm --filter @aldimobilya/db db:seed
```

### 7. تشغيل المشروع
```bash
pnpm dev
```
- **الموقع العام**: `http://localhost:3000`
- **لوحة التحكم**: `http://localhost:3001` (أو المنفذ الظاهر في الطرفية)

### 8. التحقق والمعاينة
سجّل الدخول بلوحة التحكم بالبيانات الناتجة من خطوة البذر (Seed)، وأضف 2-3 غرف تجريبية بصور فعلية للتأكد من ظهورها بشكل صحيح على الموقع العام.

---

## قواعد أمان إلزامية أثناء التنفيذ
- **لا تكتب أو تعرض** أي قيمة من `CLOUDINARY_API_SECRET` أو `AUTH_SECRET` أو أي محتوى من ملفات `.env` في الشات أو في أي رسالة نصية — ضعها مباشرة داخل الملفات فقط.
- **لا تخمن** أي مفتاح أو سر بأي شكل.
- ارجع لمصدر المفاتيح الرسمي (Cloudinary Console / Neon Console) وانسخها مباشرة.
- **لا تقم بعمل `git push`** قبل التأكد عبر `git status` أن ملفات `.env` مستبعدة بالكامل ولا تظهر في التغييرات.

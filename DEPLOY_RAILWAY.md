# راهنمای Deploy روی Railway.com

Railway یک پلتفرم cloud است که خیلی راحت‌تر از هاست معمولی است. این راهنما مرحله به مرحله توضیح می‌دهد.

---

## مرحله 1: ساخت حساب Railway

1. برو به [railway.com](https://railway.com)
2. روی **"Start a New Project"** کلیک کن
3. با **GitHub** یا **GitLab** وارد شو (یا با Email)

---

## مرحله 2: اتصال Repository

### گزینه A: از GitHub/GitLab

1. در Railway، روی **"New Project"** کلیک کن
2. **"Deploy from GitHub repo"** رو انتخاب کن
3. Repository پروژه رو انتخاب کن
4. Railway خودکار شروع به Deploy می‌کنه

### گزینه B: از Local (بدون Git)

1. در Railway، روی **"New Project"** کلیک کن
2. **"Empty Project"** رو انتخاب کن
3. بعداً فایل‌ها رو با Railway CLI آپلود می‌کنی

---

## مرحله 3: اضافه کردن PostgreSQL Database

1. در پروژه Railway، روی **"+ New"** کلیک کن
2. **"Database"** رو انتخاب کن
3. **"Add PostgreSQL"** رو بزن
4. Railway خودکار یک PostgreSQL Database می‌سازه

**بعد از ساخت Database:**
1. روی Database کلیک کن
2. به تب **"Variables"** برو
3. متغیر `DATABASE_URL` رو کپی کن (بعداً استفاده می‌کنیم)

---

## مرحله 4: اجرای Migration

### روش 1: از Railway Dashboard

1. روی Database کلیک کن
2. به تب **"Query"** برو
3. محتوای فایل `migration.sql` رو کپی کن و اجرا کن
4. بعد `migration_attachments.sql` رو هم اجرا کن

### روش 2: از Railway CLI

```bash
# نصب Railway CLI
npm i -g @railway/cli

# Login
railway login

# اتصال به پروژه
railway link

# اتصال به Database
railway connect postgres

# اجرای Migration
psql < migration.sql
psql < migration_attachments.sql
```

---

## مرحله 5: تنظیم Environment Variables

در Railway Dashboard:

1. روی **Service** (سرویس اصلی) کلیک کن
2. به تب **"Variables"** برو
3. این متغیرها رو اضافه کن:

```env
NODE_ENV=production
PORT=5000

# Database (از Database Service کپی کن)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Session Secret (یک رشته تصادفی)
SESSION_SECRET=یک-رشته-تصادفی-قوی-حداقل-32-کاراکتر

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://your-app-name.up.railway.app/api/auth/google/callback

# Allowed Origins (بعد از گرفتن Domain تغییر بده)
ALLOWED_ORIGINS=https://your-app-name.up.railway.app
```

### ساخت SESSION_SECRET:

در Terminal:
```bash
openssl rand -base64 32
```

یا از [این سایت](https://randomkeygen.com/) استفاده کن.

### تنظیم Google OAuth:

1. برو به [console.cloud.google.com](https://console.cloud.google.com)
2. پروژه بساز (یا از قبلی استفاده کن)
3. **APIs & Services** > **Credentials**
4. **Create Credentials** > **OAuth client ID**
5. **Application type**: Web application
6. **Authorized redirect URI**: 
   ```
   https://your-app-name.up.railway.app/api/auth/google/callback
   ```
7. **Client ID** و **Secret** رو کپی کن و در Railway بذار

---

## مرحله 6: تنظیم Build و Start Commands

Railway خودکار از `package.json` می‌خونه:
- **Build**: `npm run build`
- **Start**: `npm start`

اگر مشکلی بود، در Railway Dashboard:
1. روی Service کلیک کن
2. به تب **"Settings"** برو
3. **Build Command**: `npm run build`
4. **Start Command**: `npm start`

---

## مرحله 7: Deploy

### اگر از GitHub استفاده می‌کنی:

1. تغییرات رو به GitHub Push کن:
```bash
git add .
git commit -m "Ready for Railway deploy"
git push
```

2. Railway خودکار شروع به Build و Deploy می‌کنه

### اگر از Local استفاده می‌کنی:

```bash
# نصب Railway CLI
npm i -g @railway/cli

# Login
railway login

# اتصال به پروژه
railway link

# Deploy
railway up
```

---

## مرحله 8: گرفتن Domain

1. در Railway Dashboard، روی Service کلیک کن
2. به تب **"Settings"** برو
3. در بخش **"Domains"**، روی **"Generate Domain"** کلیک کن
4. یک Domain مثل `your-app-name.up.railway.app` می‌گیری

**یا Domain شخصی خودت:**
1. روی **"Custom Domain"** کلیک کن
2. Domain خودت رو وارد کن
3. DNS Records رو تنظیم کن (Railway راهنمایی می‌کنه)

---

## مرحله 9: به‌روزرسانی Environment Variables

بعد از گرفتن Domain:

1. `GOOGLE_CALLBACK_URL` رو به‌روز کن:
```
https://your-domain.com/api/auth/google/callback
```

2. `ALLOWED_ORIGINS` رو به‌روز کن:
```
https://your-domain.com
```

3. در Google Console هم Redirect URI رو به‌روز کن

---

## مرحله 10: تست

1. برو به Domain که Railway داد
2. باید صفحه Login رو ببینی
3. با Google وارد شو
4. باید صفحه Chat باز بشه

---

## اگر مشکل داشتی

### بررسی Logs:

در Railway Dashboard:
1. روی Service کلیک کن
2. به تب **"Deployments"** برو
3. روی آخرین Deployment کلیک کن
4. Logs رو ببین

### بررسی Environment Variables:

1. روی Service کلیک کن
2. به تب **"Variables"** برو
3. مطمئن شو همه متغیرها درست تنظیم شده

### Restart:

1. روی Service کلیک کن
2. روی **"Redeploy"** کلیک کن

---

## نکات مهم

✅ **Database URL**: Railway خودکار `DATABASE_URL` رو از Database Service می‌گیره. اگر دستی اضافه کردی، حتماً از `${{Postgres.DATABASE_URL}}` استفاده کن.

✅ **Port**: Railway خودکار Port رو تنظیم می‌کنه. از متغیر محیطی `PORT` استفاده کن (که Railway می‌ده).

✅ **Build Time**: اولین Build ممکنه 5-10 دقیقه طول بکشه. صبر کن.

✅ **Free Tier**: Railway یک Free Tier داره که برای شروع کافیه. بعداً می‌تونی Upgrade کنی.

---

## خلاصه مراحل:

1. ✅ حساب Railway بساز
2. ✅ Repository رو Connect کن (یا Empty Project بساز)
3. ✅ PostgreSQL Database اضافه کن
4. ✅ Migration اجرا کن
5. ✅ Environment Variables رو تنظیم کن
6. ✅ Google OAuth رو تنظیم کن
7. ✅ Deploy کن
8. ✅ Domain بگیر
9. ✅ Environment Variables رو به‌روز کن
10. ✅ تست کن

---

## فایل‌های لازم که باید در Repository باشه:

✅ `package.json` (با scripts: build, start)
✅ `railway.json` (اختیاری - برای تنظیمات)
✅ `Procfile` (اختیاری - برای start command)
✅ `migration.sql`
✅ `migration_attachments.sql`

---

**اگر سوالی داشتی یا مشکلی پیش اومد، بگو تا کمک کنم! 🚀**


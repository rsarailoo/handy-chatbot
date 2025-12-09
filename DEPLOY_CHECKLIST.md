# چک‌لیست Deploy

از این چک‌لیست برای اطمینان از انجام تمام مراحل استفاده کنید.

## ✅ پیش‌نیازها

- [ ] سرور VPS/Dedicated با Ubuntu 20.04+ یا Debian 11+
- [ ] دامنه خریداری شده و DNS تنظیم شده
- [ ] دسترسی SSH به سرور
- [ ] حساب Database (Neon/Supabase) یا PostgreSQL محلی

## ✅ نصب و راه‌اندازی

- [ ] Node.js 20.x نصب شده (`node --version`)
- [ ] npm نصب شده (`npm --version`)
- [ ] PostgreSQL نصب شده (اگر محلی) (`psql --version`)
- [ ] Nginx نصب شده (`nginx -v`)
- [ ] PM2 نصب شده (`pm2 --version`)
- [ ] Git نصب شده (`git --version`)

## ✅ Database

- [ ] Database ایجاد شده
- [ ] Connection String دریافت شده
- [ ] `migration.sql` اجرا شده
- [ ] `migration_attachments.sql` اجرا شده
- [ ] اتصال به Database تست شده

## ✅ پروژه

- [ ] پروژه روی سرور کلون/آپلود شده
- [ ] `npm install` اجرا شده
- [ ] فایل `.env` ایجاد شده
- [ ] تمام متغیرهای محیطی تنظیم شده:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=5000`
  - [ ] `DATABASE_URL`
  - [ ] `SESSION_SECRET` (قوی و تصادفی)
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_CALLBACK_URL`
  - [ ] `ALLOWED_ORIGINS`
  - [ ] `OPENROUTER_API_KEY` (اختیاری)

## ✅ Google OAuth

- [ ] پروژه در Google Cloud Console ایجاد شده
- [ ] OAuth Client ID ایجاد شده
- [ ] Authorized redirect URI تنظیم شده: `https://yourdomain.com/api/auth/google/callback`
- [ ] Authorized domains اضافه شده
- [ ] Client ID و Secret در `.env` قرار گرفته

## ✅ Build

- [ ] `npm run build` با موفقیت اجرا شده
- [ ] پوشه `dist/` ایجاد شده
- [ ] پوشه `dist/public/` وجود دارد
- [ ] فایل `dist/index.cjs` وجود دارد

## ✅ PM2

- [ ] فایل `ecosystem.config.js` ایجاد شده
- [ ] پوشه `logs/` ایجاد شده
- [ ] `pm2 start ecosystem.config.js` اجرا شده
- [ ] `pm2 save` اجرا شده
- [ ] `pm2 startup` تنظیم شده
- [ ] اپلیکیشن در PM2 در حال اجرا است (`pm2 status`)

## ✅ Nginx

- [ ] فایل تنظیمات در `/etc/nginx/sites-available/serailo` ایجاد شده
- [ ] Symbolic link در `/etc/nginx/sites-enabled/` ایجاد شده
- [ ] `nginx -t` بدون خطا اجرا شده
- [ ] Nginx restart شده
- [ ] Nginx در حال اجرا است (`systemctl status nginx`)

## ✅ SSL

- [ ] Certbot نصب شده
- [ ] SSL Certificate دریافت شده (`certbot --nginx`)
- [ ] Auto-renewal تست شده (`certbot renew --dry-run`)
- [ ] سایت با HTTPS در دسترس است

## ✅ Firewall

- [ ] UFW فعال شده
- [ ] پورت 22 (SSH) باز است
- [ ] پورت 80 (HTTP) باز است
- [ ] پورت 443 (HTTPS) باز است
- [ ] پورت‌های دیگر بسته هستند

## ✅ تست نهایی

- [ ] سایت در مرورگر باز می‌شود
- [ ] HTTPS کار می‌کند (قفل سبز)
- [ ] صفحه Login نمایش داده می‌شود
- [ ] Google OAuth کار می‌کند
- [ ] بعد از Login، صفحه Chat نمایش داده می‌شود
- [ ] ارسال پیام کار می‌کند
- [ ] گفتگوها ذخیره می‌شوند
- [ ] هر کاربر فقط گفتگوهای خودش را می‌بیند

## ✅ لاگ‌ها و مانیتورینگ

- [ ] PM2 logs بررسی شده (`pm2 logs serailo`)
- [ ] Nginx error log بررسی شده
- [ ] Application logs بررسی شده (`./logs/out.log`)
- [ ] Error logs بررسی شده (`./logs/err.log`)
- [ ] هیچ خطای بحرانی وجود ندارد

## ✅ امنیت

- [ ] فایل `.env` در `.gitignore` است
- [ ] `SESSION_SECRET` قوی است (32+ کاراکتر)
- [ ] HTTPS فعال است
- [ ] Firewall تنظیم شده
- [ ] فقط پورت‌های لازم باز هستند
- [ ] SSH با key authentication تنظیم شده (توصیه می‌شود)

---

**تاریخ Deploy:** _______________

**نام سرور:** _______________

**دامنه:** _______________

**یادداشت‌ها:**
_________________________________
_________________________________
_________________________________


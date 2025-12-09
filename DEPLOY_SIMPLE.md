# راهنمای ساده Deploy روی هاست

## مرحله 1: آپلود فایل‌ها به هاست

### چه فایل‌هایی را آپلود کنم؟

**همه فایل‌های پروژه را آپلود کن** (به جز موارد زیر):

❌ **نکند آپلود کنی:**
- `node_modules/` (پوشه)
- `.env` (فایل - باید روی هاست بسازی)
- `dist/` (پوشه - بعد از build ساخته می‌شه)
- `.git/` (پوشه - اگر از Git استفاده می‌کنی)

✅ **باید آپلود کنی:**
- همه فایل‌های دیگر (client/, server/, shared/, package.json, و غیره)

### کجا آپلود کنم؟

معمولاً در یکی از این مسیرها:
- `/home/username/public_html/`
- `/home/username/domains/yourdomain.com/public_html/`
- `/var/www/html/`
- یا هر مسیری که هاست بهت داده

**با FileZilla یا هر FTP Client:**
1. به هاستت وصل شو
2. همه فایل‌ها رو آپلود کن (به جز موارد بالا)

---

## مرحله 2: اتصال به هاست با SSH

### چطور به SSH دسترسی داشته باشم؟

1. در پنل هاستت، بخش **SSH** یا **Terminal** رو پیدا کن
2. یا از نرم‌افزارهایی مثل **PuTTY** (ویندوز) یا **Terminal** (مک/لینوکس) استفاده کن

```bash
ssh username@your-server-ip
# یا
ssh username@yourdomain.com
```

---

## مرحله 3: نصب Node.js

بعد از اتصال به SSH، این دستورات رو اجرا کن:

```bash
# نصب Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# بررسی نسخه (باید 20.x باشه)
node --version
npm --version
```

---

## مرحله 4: نصب PM2

```bash
sudo npm install -g pm2
```

---

## مرحله 5: رفتن به پوشه پروژه

```bash
cd /home/username/public_html
# یا هر مسیری که فایل‌ها رو آپلود کردی
cd serailo  # اگر پوشه serailo ساختی
```

---

## مرحله 6: نصب Dependencies

```bash
npm install
```

این کار ممکنه چند دقیقه طول بکشه.

---

## مرحله 7: راه‌اندازی Database

### گزینه 1: استفاده از Database خارجی (راحت‌تر)

1. برو به [neon.tech](https://neon.tech) یا [supabase.com](https://supabase.com)
2. یک حساب بساز و Database جدید ایجاد کن
3. Connection String رو کپی کن (مثل: `postgresql://user:pass@host/dbname`)

### گزینه 2: استفاده از Database هاست

اگر هاستت PostgreSQL داره:
1. از پنل هاستت یک Database بساز
2. Connection String رو بگیر

**بعد از گرفتن Connection String:**

در SQL Editor (Neon/Supabase) یا phpMyAdmin (هاست)، این فایل‌ها رو اجرا کن:
- `migration.sql`
- `migration_attachments.sql`

---

## مرحله 8: ساخت فایل .env

```bash
nano .env
```

این محتوا رو بذار (مقادیر رو با اطلاعات خودت عوض کن):

```env
NODE_ENV=production
PORT=5000

DATABASE_URL=postgresql://user:password@host:5432/dbname

SESSION_SECRET=یک-رشته-تصادفی-قوی-حداقل-32-کاراکتر

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

ALLOWED_ORIGINS=https://yourdomain.com
```

**برای ساخت SESSION_SECRET:**
```bash
openssl rand -base64 32
```

**برای Google OAuth:**
1. برو به [console.cloud.google.com](https://console.cloud.google.com)
2. پروژه بساز
3. APIs & Services > Credentials
4. Create Credentials > OAuth client ID
5. Authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
6. Client ID و Secret رو کپی کن

**بعد از نوشتن، ذخیره کن:**
- `Ctrl + X`
- `Y` (برای Yes)
- `Enter`

---

## مرحله 9: Build کردن پروژه

```bash
npm run build
```

این کار چند دقیقه طول می‌کشه. صبر کن تا تموم بشه.

---

## مرحله 10: راه‌اندازی با PM2

```bash
# ایجاد پوشه logs
mkdir -p logs

# راه‌اندازی
pm2 start ecosystem.config.js

# ذخیره تنظیمات
pm2 save

# تنظیم auto-start (دستور نمایش داده شده رو اجرا کن)
pm2 startup
```

---

## مرحله 11: تنظیم Nginx (اگر هاستت Nginx داره)

اگر هاستت cPanel یا DirectAdmin داره، معمولاً نیازی به این مرحله نیست. ولی اگر دسترسی داری:

```bash
sudo nano /etc/nginx/sites-available/serailo
```

این محتوا رو بذار:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/serailo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## مرحله 12: اگر هاستت cPanel یا DirectAdmin داره

### در cPanel:

1. برو به **Node.js Selector** یا **Setup Node.js App**
2. یک App جدید بساز:
   - **Node.js Version**: 20.x
   - **Application Root**: مسیر پروژه (مثلاً `public_html/serailo`)
   - **Application URL**: `/` یا `/serailo`
   - **Application Startup File**: `dist/index.cjs`
   - **Environment Variables**: همه متغیرهای `.env` رو اینجا اضافه کن

3. **Restart** کن

### در DirectAdmin:

1. برو به **Node.js**
2. App جدید بساز با تنظیمات مشابه بالا

---

## مرحله 13: تست

1. برو به `https://yourdomain.com`
2. باید صفحه Login رو ببینی
3. با Google وارد شو
4. باید صفحه Chat باز بشه

---

## اگر مشکل داشتی

### بررسی لاگ‌ها:

```bash
# لاگ‌های PM2
pm2 logs serailo

# بررسی وضعیت
pm2 status

# Restart
pm2 restart serailo
```

### بررسی Database:

```bash
# تست اتصال
psql $DATABASE_URL
```

---

## خلاصه مراحل:

1. ✅ فایل‌ها رو آپلود کن (به جز node_modules, .env, dist)
2. ✅ با SSH وصل شو
3. ✅ Node.js و PM2 رو نصب کن
4. ✅ `npm install` اجرا کن
5. ✅ Database بساز و Migration اجرا کن
6. ✅ فایل `.env` بساز
7. ✅ `npm run build` اجرا کن
8. ✅ `pm2 start ecosystem.config.js` اجرا کن
9. ✅ در پنل هاست (cPanel/DirectAdmin) Node.js App بساز (اگر لازمه)
10. ✅ تست کن

---

**اگر هاستت cPanel یا DirectAdmin داره، معمولاً مرحله 11 (Nginx) لازم نیست. از Node.js Selector استفاده کن.**


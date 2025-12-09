# راهنمای کامل Deploy کردن اپلیکیشن به هاست

این راهنما شامل تمام مراحل لازم برای انتقال و راه‌اندازی اپلیکیشن شما روی هاست است.

## ⚡ خلاصه سریع (Quick Start)

اگر قبلاً با deploy کردن Node.js apps کار کرده‌اید، این خلاصه برای شما کافی است:

1. **نصب پیش‌نیازها**: Node.js 20+, PostgreSQL, Nginx, PM2
2. **راه‌اندازی Database**: استفاده از Neon/Supabase یا نصب PostgreSQL محلی
3. **اجرای Migration**: اجرای `migration.sql` و `migration_attachments.sql`
4. **تنظیم `.env`**: کپی کردن متغیرهای محیطی (مثال در ادامه)
5. **Build**: `npm run build`
6. **راه‌اندازی با PM2**: `pm2 start ecosystem.config.js`
7. **تنظیم Nginx**: reverse proxy به localhost:5000
8. **نصب SSL**: `certbot --nginx -d yourdomain.com`

**متغیرهای محیطی ضروری:**
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://...
SESSION_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
ALLOWED_ORIGINS=https://yourdomain.com
```

برای جزئیات کامل، ادامه راهنما را مطالعه کنید.

## 📋 پیش‌نیازها

### 1. سرور (VPS یا Dedicated Server)
- سیستم عامل: Ubuntu 20.04+ یا Debian 11+
- حداقل RAM: 2GB (توصیه: 4GB+)
- حداقل CPU: 2 Core
- حداقل فضای دیسک: 20GB

### 2. دامنه (Domain)
- یک دامنه که به IP سرور شما اشاره کند

### 3. سرویس‌های مورد نیاز
- **PostgreSQL Database**: می‌توانید از سرویس‌های زیر استفاده کنید:
  - [Neon](https://neon.tech) (رایگان تا 512MB)
  - [Supabase](https://supabase.com) (رایگان تا 500MB)
  - [ElephantSQL](https://www.elephantsql.com) (رایگان تا 20MB)
  - یا PostgreSQL روی همان سرور

- **Google OAuth**: برای احراز هویت
  - ایجاد پروژه در [Google Cloud Console](https://console.cloud.google.com)
  - دریافت Client ID و Client Secret

---

## 🚀 مراحل Deploy

### مرحله 1: اتصال به سرور

```bash
ssh root@your-server-ip
# یا
ssh username@your-server-ip
```

### مرحله 2: نصب پیش‌نیازها

```bash
# به‌روزرسانی سیستم
sudo apt update && sudo apt upgrade -y

# نصب Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# نصب PostgreSQL (اگر می‌خواهید روی همان سرور باشد)
sudo apt install -y postgresql postgresql-contrib

# نصب Nginx (برای reverse proxy)
sudo apt install -y nginx

# نصب PM2 (برای مدیریت process)
sudo npm install -g pm2

# نصب Git
sudo apt install -y git

# نصب Build Essential (برای compile کردن برخی packages)
sudo apt install -y build-essential
```

### مرحله 3: آماده‌سازی Database

#### گزینه 1: استفاده از Database خارجی (توصیه می‌شود)

1. یک حساب در [Neon](https://neon.tech) یا [Supabase](https://supabase.com) ایجاد کنید
2. یک Database جدید بسازید
3. Connection String را کپی کنید (مثل: `postgresql://user:password@host:5432/dbname`)

#### گزینه 2: نصب PostgreSQL روی سرور

```bash
# راه‌اندازی PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# ایجاد کاربر و دیتابیس
sudo -u postgres psql

# در PostgreSQL shell:
CREATE DATABASE serailo;
CREATE USER serailo_user WITH PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE serailo TO serailo_user;
\q
```

### مرحله 4: اجرای Migration های Database

```bash
# اتصال به دیتابیس و اجرای migration.sql
# اگر از Neon/Supabase استفاده می‌کنید، از SQL Editor آنها استفاده کنید
# اگر از PostgreSQL محلی استفاده می‌کنید:

psql -U serailo_user -d serailo -f migration.sql
psql -U serailo_user -d serailo -f migration_attachments.sql
```

**نکته**: فایل‌های `migration.sql` و `migration_attachments.sql` را باید از پروژه خود کپی کنید.

### مرحله 5: کلون کردن پروژه

```bash
# رفتن به دایرکتوری مناسب
cd /var/www
# یا
cd /home/username

# کلون کردن پروژه (اگر در Git است)
git clone https://github.com/your-username/serailo.git
cd serailo

# یا آپلود فایل‌ها با SCP/SFTP
```

### مرحله 6: نصب Dependencies

```bash
cd /var/www/serailo  # یا مسیر پروژه شما
npm install
```

### مرحله 7: تنظیم Environment Variables

```bash
# ایجاد فایل .env
nano .env
```

محتوای فایل `.env`:

```env
# Environment
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
# مثال برای Neon:
# DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require

# Session Secret (یک رشته تصادفی قوی)
SESSION_SECRET=your-very-strong-random-secret-key-here-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# OpenRouter API (اختیاری - اگر می‌خواهید از مدل‌های OpenRouter استفاده کنید)
OPENROUTER_API_KEY=your-openrouter-api-key

# CORS - دامنه‌های مجاز (با کاما جدا کنید)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**نکات مهم:**
- `SESSION_SECRET` باید یک رشته تصادفی و قوی باشد (حداقل 32 کاراکتر)
- `GOOGLE_CALLBACK_URL` باید دقیقاً با تنظیمات Google Cloud Console مطابقت داشته باشد
- `ALLOWED_ORIGINS` باید شامل تمام دامنه‌هایی باشد که می‌خواهید به API دسترسی داشته باشند

### مرحله 8: تنظیم Google OAuth

1. به [Google Cloud Console](https://console.cloud.google.com) بروید
2. یک پروژه جدید ایجاد کنید یا پروژه موجود را انتخاب کنید
3. به **APIs & Services > Credentials** بروید
4. **Create Credentials > OAuth client ID** را انتخاب کنید
5. Application type: **Web application**
6. Authorized redirect URIs: `https://yourdomain.com/api/auth/google/callback`
7. Client ID و Client Secret را کپی کنید و در فایل `.env` قرار دهید

### مرحله 9: Build کردن پروژه

```bash
npm run build
```

این دستور:
- Frontend (React) را build می‌کند
- Backend (Express) را bundle می‌کند
- فایل‌های نهایی در پوشه `dist/` قرار می‌گیرند

### مرحله 10: راه‌اندازی با PM2

```bash
# ایجاد فایل ecosystem.config.js
nano ecosystem.config.js
```

محتوای `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'serailo',
    script: './dist/index.cjs',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

```bash
# ایجاد پوشه logs
mkdir -p logs

# راه‌اندازی با PM2
pm2 start ecosystem.config.js

# ذخیره تنظیمات PM2 برای restart خودکار
pm2 save
pm2 startup
# دستور نمایش داده شده را اجرا کنید
```

### مرحله 11: تنظیم Nginx (Reverse Proxy)

```bash
# ایجاد فایل تنظیمات Nginx
sudo nano /etc/nginx/sites-available/serailo
```

محتوای فایل:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificate (بعد از نصب Let's Encrypt تنظیم می‌شود)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size
    client_max_body_size 10M;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# فعال کردن سایت
sudo ln -s /etc/nginx/sites-available/serailo /etc/nginx/sites-enabled/

# تست تنظیمات Nginx
sudo nginx -t

# راه‌اندازی مجدد Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### مرحله 12: نصب SSL Certificate (Let's Encrypt)

```bash
# نصب Certbot
sudo apt install -y certbot python3-certbot-nginx

# دریافت SSL Certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# تست auto-renewal
sudo certbot renew --dry-run
```

### مرحله 13: تنظیم Firewall

```bash
# نصب UFW (اگر نصب نیست)
sudo apt install -y ufw

# تنظیمات Firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# بررسی وضعیت
sudo ufw status
```

### مرحله 14: تست و بررسی

```bash
# بررسی وضعیت PM2
pm2 status
pm2 logs serailo

# بررسی وضعیت Nginx
sudo systemctl status nginx

# بررسی لاگ‌های سرور
tail -f logs/out.log
tail -f logs/err.log
```

---

## 🔧 دستورات مفید

### مدیریت PM2

```bash
# مشاهده وضعیت
pm2 status

# مشاهده لاگ‌ها
pm2 logs serailo

# Restart
pm2 restart serailo

# Stop
pm2 stop serailo

# مشاهده استفاده از منابع
pm2 monit
```

### مدیریت Nginx

```bash
# تست تنظیمات
sudo nginx -t

# Reload (بدون downtime)
sudo nginx -s reload

# Restart
sudo systemctl restart nginx

# مشاهده لاگ‌ها
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### به‌روزرسانی اپلیکیشن

```bash
cd /var/www/serailo

# Pull تغییرات جدید (اگر از Git استفاده می‌کنید)
git pull origin main

# نصب dependencies جدید
npm install

# Build مجدد
npm run build

# Restart PM2
pm2 restart serailo
```

---

## 🐛 عیب‌یابی (Troubleshooting)

### مشکل: اپلیکیشن راه‌اندازی نمی‌شود

```bash
# بررسی لاگ‌های PM2
pm2 logs serailo --lines 100

# بررسی Environment Variables
pm2 env 0

# تست دستی اجرای سرور
cd /var/www/serailo
node dist/index.cjs
```

### مشکل: Database Connection Error

```bash
# تست اتصال به Database
psql $DATABASE_URL

# بررسی DATABASE_URL در .env
cat .env | grep DATABASE_URL
```

### مشکل: Google OAuth کار نمی‌کند

- مطمئن شوید `GOOGLE_CALLBACK_URL` در `.env` با تنظیمات Google Cloud Console مطابقت دارد
- مطمئن شوید دامنه شما در Authorized domains اضافه شده است
- بررسی کنید که SSL Certificate معتبر است

### مشکل: Static Files لود نمی‌شوند

```bash
# بررسی وجود پوشه dist/public
ls -la dist/public

# بررسی permissions
sudo chown -R $USER:$USER dist/
```

---

## 📝 چک‌لیست نهایی

- [ ] Node.js و npm نصب شده است
- [ ] PostgreSQL Database راه‌اندازی شده است
- [ ] Migration های Database اجرا شده‌اند
- [ ] فایل `.env` با تمام متغیرهای لازم ایجاد شده است
- [ ] Google OAuth تنظیم شده است
- [ ] پروژه build شده است (`npm run build`)
- [ ] PM2 تنظیم و راه‌اندازی شده است
- [ ] Nginx تنظیم شده است
- [ ] SSL Certificate نصب شده است
- [ ] Firewall تنظیم شده است
- [ ] دامنه به IP سرور اشاره می‌کند
- [ ] اپلیکیشن در دسترس است و کار می‌کند

---

## 🔒 نکات امنیتی

1. **هرگز فایل `.env` را در Git commit نکنید**
2. **SESSION_SECRET باید قوی و تصادفی باشد**
3. **از HTTPS استفاده کنید (SSL Certificate)**
4. **Firewall را فعال کنید و فقط پورت‌های لازم را باز کنید**
5. **به‌روزرسانی‌های امنیتی سیستم عامل را نصب کنید**
6. **از PM2 برای مدیریت process استفاده کنید**
7. **لاگ‌ها را به صورت منظم بررسی کنید**

---

## 📞 پشتیبانی

اگر مشکلی پیش آمد، لاگ‌های زیر را بررسی کنید:

- PM2 Logs: `pm2 logs serailo`
- Nginx Error Log: `/var/log/nginx/error.log`
- Nginx Access Log: `/var/log/nginx/access.log`
- Application Logs: `./logs/out.log` و `./logs/err.log`

---

**موفق باشید! 🚀**


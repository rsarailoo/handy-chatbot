# راهنمای سریع Deploy (Quick Reference)

این فایل شامل دستورات مهم و مراحل کلیدی برای deploy سریع است.

## 📦 نصب پیش‌نیازها (یک بار)

```bash
# به‌روزرسانی سیستم
sudo apt update && sudo apt upgrade -y

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL (اختیاری - اگر می‌خواهید محلی باشد)
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# PM2
sudo npm install -g pm2

# Certbot (برای SSL)
sudo apt install -y certbot python3-certbot-nginx

# Build tools
sudo apt install -y build-essential git
```

## 🔧 تنظیمات اولیه

### 1. ایجاد فایل `.env`

```bash
nano .env
```

محتوای `.env`:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=$(openssl rand -base64 32)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
ALLOWED_ORIGINS=https://yourdomain.com
```

### 2. اجرای Migration

```bash
# اگر از Neon/Supabase استفاده می‌کنید، از SQL Editor آنها استفاده کنید
# اگر از PostgreSQL محلی استفاده می‌کنید:
psql $DATABASE_URL -f migration.sql
psql $DATABASE_URL -f migration_attachments.sql
```

## 🚀 Deploy

```bash
# 1. نصب dependencies
npm install

# 2. Build
npm run build

# 3. ایجاد پوشه logs
mkdir -p logs

# 4. راه‌اندازی با PM2
pm2 start ecosystem.config.js

# 5. ذخیره تنظیمات PM2
pm2 save
pm2 startup  # دستور نمایش داده شده را اجرا کنید
```

## 🌐 تنظیم Nginx

```bash
# ایجاد فایل تنظیمات
sudo nano /etc/nginx/sites-available/serailo
```

محتوای فایل (قبل از SSL):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 10M;

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
    }
}
```

```bash
# فعال کردن سایت
sudo ln -s /etc/nginx/sites-available/serailo /etc/nginx/sites-enabled/

# تست و restart
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 نصب SSL

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 🔥 Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 📊 دستورات مفید

### PM2
```bash
pm2 status              # وضعیت
pm2 logs serailo        # لاگ‌ها
pm2 restart serailo     # restart
pm2 stop serailo        # stop
pm2 monit               # مانیتورینگ
```

### Nginx
```bash
sudo nginx -t           # تست تنظیمات
sudo nginx -s reload    # reload
sudo systemctl status nginx
```

### Database
```bash
psql $DATABASE_URL      # اتصال به دیتابیس
```

### لاگ‌ها
```bash
pm2 logs serailo                    # لاگ‌های اپلیکیشن
tail -f logs/out.log               # لاگ خروجی
tail -f logs/err.log               # لاگ خطا
sudo tail -f /var/log/nginx/error.log  # لاگ Nginx
```

## 🔄 به‌روزرسانی

```bash
cd /var/www/serailo  # یا مسیر پروژه شما
git pull              # اگر از Git استفاده می‌کنید
npm install
npm run build
pm2 restart serailo
```

## 🐛 عیب‌یابی سریع

```bash
# بررسی وضعیت PM2
pm2 status

# بررسی لاگ‌های خطا
pm2 logs serailo --err

# تست دستی سرور
cd /var/www/serailo
node dist/index.cjs

# بررسی پورت
sudo netstat -tlnp | grep 5000

# بررسی Nginx
sudo nginx -t
sudo systemctl status nginx
```

## 📝 چک‌لیست سریع

- [ ] `.env` تنظیم شده
- [ ] Migration اجرا شده
- [ ] `npm run build` موفق
- [ ] PM2 در حال اجرا است
- [ ] Nginx تنظیم شده
- [ ] SSL نصب شده
- [ ] Firewall فعال است
- [ ] سایت در دسترس است

---

برای راهنمای کامل، فایل `DEPLOY.md` را مطالعه کنید.


# 🚀 Complete Deployment Guide - VPS/Dedicated Server

This comprehensive guide covers all steps needed to deploy your Handy Chatbot application to a VPS or dedicated server.

## ⚡ Quick Start

If you're experienced with deploying Node.js applications, this summary should be sufficient:

1. **Install Prerequisites**: Node.js 20+, PostgreSQL, Nginx, PM2
2. **Setup Database**: Use Neon/Supabase or install PostgreSQL locally
3. **Run Migrations**: Execute `migration.sql` and `migration_attachments.sql`
4. **Configure `.env`**: Set up environment variables (see example below)
5. **Build**: `npm run build`
6. **Start with PM2**: `pm2 start ecosystem.config.js`
7. **Configure Nginx**: Set up reverse proxy to localhost:5001
8. **Install SSL**: `certbot --nginx -d yourdomain.com`

**Essential Environment Variables:**
```env
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=your-very-strong-random-secret-key-here-min-32-chars
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
OPENROUTER_API_KEY=sk-or-your-openrouter-api-key
ALLOWED_ORIGINS=https://yourdomain.com
```

For detailed instructions, continue reading below.

---

## 📋 Prerequisites

### 1. Server Requirements

- **Operating System**: Ubuntu 20.04+ or Debian 11+
- **Minimum RAM**: 2GB (Recommended: 4GB+)
- **Minimum CPU**: 2 Cores
- **Minimum Disk Space**: 20GB
- **SSH Access**: Root or sudo access

### 2. Domain Name

- A domain name pointing to your server's IP address
- DNS A record configured

### 3. Required Services

- **PostgreSQL Database**: Choose one of the following:
  - [Neon](https://neon.tech) (Free tier: 512MB)
  - [Supabase](https://supabase.com) (Free tier: 500MB)
  - [ElephantSQL](https://www.elephantsql.com) (Free tier: 20MB)
  - Local PostgreSQL installation

- **Google OAuth**: For authentication
  - Create project in [Google Cloud Console](https://console.cloud.google.com)
  - Obtain Client ID and Client Secret

---

## 🚀 Deployment Steps

### Step 1: Connect to Server

```bash
ssh root@your-server-ip
# or
ssh username@your-server-ip
```

### Step 2: Install Prerequisites

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version

# Install PostgreSQL (optional - if using local database)
sudo apt install -y postgresql postgresql-contrib

# Install Nginx (for reverse proxy)
sudo apt install -y nginx

# Install PM2 (for process management)
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Install build tools
sudo apt install -y build-essential
```

### Step 3: Setup Database

#### Option 1: Use External Database (Recommended)

1. Create an account at [Neon](https://neon.tech) or [Supabase](https://supabase.com)
2. Create a new project and database
3. Copy the connection string (format: `postgresql://user:password@host:5432/dbname`)

#### Option 2: Install PostgreSQL Locally

```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE handy_chatbot;
CREATE USER chatbot_user WITH PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE handy_chatbot TO chatbot_user;
\q

# Connection string will be:
# postgresql://chatbot_user:your-strong-password@localhost:5432/handy_chatbot
```

### Step 4: Run Database Migrations

**For Cloud Databases (Neon/Supabase):**
1. Go to your database dashboard
2. Open SQL Editor
3. Copy and paste contents of `migration.sql`
4. Execute the SQL
5. Repeat for `migration_attachments.sql` (if needed)

**For Local PostgreSQL:**
```bash
# Connect and run migrations
psql -U chatbot_user -d handy_chatbot -f migration.sql
psql -U chatbot_user -d handy_chatbot -f migration_attachments.sql
```

### Step 5: Clone Project

```bash
# Navigate to appropriate directory
cd /var/www
# or
cd /home/username

# Clone repository
git clone https://github.com/rsarailoo/handy-chatbot.git
cd handy-chatbot

# Or upload files via SCP/SFTP if not using Git
```

### Step 6: Install Dependencies

```bash
cd /var/www/handy-chatbot  # or your project path
npm install
```

### Step 7: Configure Environment Variables

```bash
# Create .env file
nano .env
```

**Contents of `.env` file:**

```env
# Environment
NODE_ENV=production
PORT=5001

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
# Example for Neon:
# DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require

# Session Secret (generate a strong random string)
SESSION_SECRET=your-very-strong-random-secret-key-here-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# OpenRouter API
OPENROUTER_API_KEY=sk-or-your-openrouter-api-key

# CORS - Allowed origins (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Important Notes:**
- Generate `SESSION_SECRET` using: `openssl rand -base64 32`
- `GOOGLE_CALLBACK_URL` must exactly match Google Cloud Console settings
- `ALLOWED_ORIGINS` should include all domains that need API access

### Step 8: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add **Authorized redirect URIs**:
   - `https://yourdomain.com/api/auth/google/callback`
   - `https://www.yourdomain.com/api/auth/google/callback` (if using www)
7. Copy Client ID and Client Secret to `.env` file

### Step 9: Build the Project

```bash
npm run build
```

This command will:
- Build the React frontend
- Bundle the Express backend
- Output files to `dist/` directory

### Step 10: Setup PM2

The `ecosystem.config.js` file should already exist. Verify it contains:

```javascript
module.exports = {
  apps: [{
    name: 'handy-chatbot',
    script: './dist/index.cjs',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
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
# Create logs directory
mkdir -p logs

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command output to complete setup
```

### Step 11: Configure Nginx (Reverse Proxy)

```bash
# Create Nginx configuration file
sudo nano /etc/nginx/sites-available/handy-chatbot
```

**Configuration file contents:**

```nginx
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificate (configured after Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Max upload size
    client_max_body_size 10M;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5001;
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
        proxy_pass http://localhost:5001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/handy-chatbot /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 12: Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

Certbot will automatically:
- Obtain SSL certificates
- Configure Nginx for HTTPS
- Set up automatic renewal

### Step 13: Configure Firewall

```bash
# Install UFW (if not installed)
sudo apt install -y ufw

# Configure firewall rules
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 14: Verify Deployment

```bash
# Check PM2 status
pm2 status
pm2 logs handy-chatbot --lines 50

# Check Nginx status
sudo systemctl status nginx

# Check application logs
tail -f logs/out.log
tail -f logs/err.log

# Test application
curl http://localhost:5001/api/test/db
```

---

## 🔧 Useful Commands

### PM2 Management

```bash
# View status
pm2 status

# View logs
pm2 logs handy-chatbot
pm2 logs handy-chatbot --lines 100

# Restart application
pm2 restart handy-chatbot

# Stop application
pm2 stop handy-chatbot

# View resource usage
pm2 monit

# View detailed info
pm2 show handy-chatbot
```

### Nginx Management

```bash
# Test configuration
sudo nginx -t

# Reload (no downtime)
sudo nginx -s reload

# Restart
sudo systemctl restart nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

### Application Updates

```bash
cd /var/www/handy-chatbot

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build

# Restart with PM2
pm2 restart handy-chatbot
```

---

## 🐛 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs handy-chatbot --lines 100

# Check environment variables
pm2 env 0

# Test manual start
cd /var/www/handy-chatbot
node dist/index.cjs
```

### Database Connection Error

```bash
# Test database connection
psql $DATABASE_URL

# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Verify database is accessible
# For cloud databases, check firewall/network settings
```

### Google OAuth Not Working

- Verify `GOOGLE_CALLBACK_URL` in `.env` matches Google Console exactly
- Ensure your domain is added to Authorized domains in Google Console
- Verify SSL certificate is valid and trusted
- Check that `ALLOWED_ORIGINS` includes your domain

### Static Files Not Loading

```bash
# Check if dist/public exists
ls -la dist/public

# Check permissions
sudo chown -R $USER:$USER dist/

# Verify build completed successfully
ls -la dist/
```

### Nginx 502 Bad Gateway

```bash
# Check if application is running
pm2 status

# Check application logs
pm2 logs handy-chatbot

# Verify port 5001 is listening
netstat -tlnp | grep 5001

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check certificate expiration
sudo certbot certificates
```

---

## 📝 Final Checklist

- [ ] Node.js and npm installed
- [ ] PostgreSQL database set up
- [ ] Database migrations executed
- [ ] `.env` file created with all required variables
- [ ] Google OAuth configured
- [ ] Project built successfully (`npm run build`)
- [ ] PM2 configured and running
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Domain pointing to server IP
- [ ] Application accessible and working
- [ ] OAuth login tested
- [ ] Chat functionality tested

---

## 🔒 Security Best Practices

1. **Never commit `.env` file** - Ensure it's in `.gitignore`
2. **Use strong SESSION_SECRET** - Generate with `openssl rand -base64 32`
3. **Always use HTTPS** - SSL certificate is mandatory
4. **Configure firewall** - Only open necessary ports (22, 80, 443)
5. **Keep system updated** - Regularly run `sudo apt update && sudo apt upgrade`
6. **Use PM2** - For process management and auto-restart
7. **Monitor logs** - Regularly check application and server logs
8. **Backup database** - Set up regular database backups
9. **Use strong passwords** - For database and system accounts
10. **Limit SSH access** - Use SSH keys instead of passwords

---

## 📞 Support & Logs

If you encounter issues, check these logs:

- **PM2 Logs**: `pm2 logs handy-chatbot`
- **Application Logs**: `./logs/out.log` and `./logs/err.log`
- **Nginx Error Log**: `/var/log/nginx/error.log`
- **Nginx Access Log**: `/var/log/nginx/access.log`
- **System Logs**: `journalctl -u nginx` or `journalctl -xe`

---

## 🎉 Success!

Your Handy Chatbot should now be live and accessible at `https://yourdomain.com`!

**Next Steps:**
- Test all functionality
- Set up monitoring
- Configure backups
- Set up CI/CD for automatic deployments

---

**Good luck with your deployment! 🚀**

# 🚂 Deploy Handy Chatbot to Railway

Railway is a cloud platform that makes deployment much easier than traditional hosting. This guide walks you through the complete deployment process step by step.

---

## 📋 Prerequisites

- **Railway Account** - Sign up at [railway.com](https://railway.com)
- **GitHub Repository** - Your code must be on GitHub
- **Google OAuth Credentials** - Already configured
- **OpenRouter API Key** - Already configured

---

## 🚀 Step 1: Create Railway Account

1. Go to [railway.com](https://railway.com)
2. Click **"Start a New Project"**
3. Sign in with **GitHub**, **GitLab**, or **Email**

---

## 🔗 Step 2: Connect Repository

### Option A: Deploy from GitHub (Recommended)

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Authorize Railway to access your GitHub account (if first time)
4. Select your repository: `rsarailoo/handy-chatbot`
5. Railway will automatically start deploying

### Option B: Deploy from Local (Without Git)

1. In Railway dashboard, click **"New Project"**
2. Select **"Empty Project"**
3. You'll upload files using Railway CLI later

---

## 🗄️ Step 3: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"**
3. Click **"Add PostgreSQL"**
4. Railway will automatically create a PostgreSQL database

**After database is created:**
1. Click on the database service
2. Go to **"Variables"** tab
3. Copy the `DATABASE_URL` variable (you'll need this later)

**Note:** Railway automatically provides `DATABASE_URL` to your main service, so you may not need to manually copy it.

---

## 📊 Step 4: Run Database Migrations

### Method 1: Using Railway Dashboard (Easiest)

1. Click on your PostgreSQL database service
2. Go to **"Data"** tab
3. Click **"Query"** or **"Connect"**
4. Copy the contents of `migration.sql` from your repository
5. Paste and execute in the SQL editor
6. Repeat for `migration_attachments.sql` (if needed)

### Method 2: Using Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Connect to PostgreSQL
railway connect postgres

# Run migrations
psql < migration.sql
psql < migration_attachments.sql
```

### Method 3: Using psql with Connection String

1. Get `DATABASE_URL` from Railway database variables
2. Run locally or on a machine with psql:

```bash
psql $DATABASE_URL -f migration.sql
psql $DATABASE_URL -f migration_attachments.sql
```

---

## ⚙️ Step 5: Configure Environment Variables

In Railway Dashboard:

1. Click on your **main service** (not the database)
2. Go to **"Variables"** tab
3. Click **"New Variable"** and add each variable:

```env
NODE_ENV=production
PORT=5001

# Database (Railway auto-provides this, but you can reference it)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Session Secret (generate a strong random string)
SESSION_SECRET=your-very-strong-random-secret-key-here-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://your-app-name.up.railway.app/api/auth/google/callback

# OpenRouter API
OPENROUTER_API_KEY=sk-or-your-openrouter-api-key

# CORS - Allowed origins (update after getting custom domain)
ALLOWED_ORIGINS=https://your-app-name.up.railway.app
```

### Generate SESSION_SECRET

In your terminal:
```bash
openssl rand -base64 32
```

Or use an online generator like [randomkeygen.com](https://randomkeygen.com/)

### Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add **Authorized redirect URI**:
   ```
   https://your-app-name.up.railway.app/api/auth/google/callback
   ```
   (You'll update this after getting your Railway domain)
7. Copy **Client ID** and **Client Secret** to Railway variables

---

## 🔧 Step 6: Configure Build and Start Commands

Railway automatically reads from `package.json`:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

**If you need to override:**

1. Click on your service
2. Go to **"Settings"** tab
3. Under **"Build & Deploy"**:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

**Verify your `package.json` has:**
```json
{
  "scripts": {
    "build": "tsx script/build.ts",
    "start": "node dist/index.cjs"
  }
}
```

---

## 🚢 Step 7: Deploy

### If Using GitHub Integration:

1. Push your changes to GitHub:
```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

2. Railway will automatically:
   - Detect the push
   - Start building
   - Deploy when build completes

### If Using Railway CLI:

```bash
# Install Railway CLI (if not already installed)
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up
```

**Monitor the deployment:**
- Go to Railway dashboard
- Click on your service
- Go to **"Deployments"** tab
- Watch the build logs in real-time

---

## 🌐 Step 8: Get Domain

### Railway-Generated Domain:

1. In Railway dashboard, click on your service
2. Go to **"Settings"** tab
3. Under **"Domains"**, click **"Generate Domain"**
4. You'll get a domain like: `handy-chatbot-production.up.railway.app`

### Custom Domain (Optional):

1. In **"Settings"** → **"Domains"**
2. Click **"Custom Domain"**
3. Enter your domain name
4. Railway will provide DNS records to add:
   - **CNAME**: `yourdomain.com` → `your-app.up.railway.app`
   - Or **A Record**: Point to Railway's IP (if provided)

**Update DNS at your domain registrar:**
- Add the CNAME or A record as instructed
- Wait for DNS propagation (can take up to 48 hours, usually 5-30 minutes)

---

## 🔄 Step 9: Update Environment Variables

After getting your domain (Railway-generated or custom):

1. Update `GOOGLE_CALLBACK_URL`:
   ```
   https://your-domain.com/api/auth/google/callback
   ```

2. Update `ALLOWED_ORIGINS`:
   ```
   https://your-domain.com
   ```

3. Update Google Console:
   - Go to Google Cloud Console
   - Update OAuth redirect URI to match new domain
   - Add both Railway domain and custom domain if using both

4. **Redeploy** (Railway will auto-redeploy on variable change, or manually trigger)

---

## ✅ Step 10: Verify Deployment

1. Visit your Railway domain
2. You should see the login page
3. Test Google OAuth login
4. Verify chat functionality works
5. Test admin panel (if you're an admin)

---

## 🐛 Troubleshooting

### Check Deployment Logs

1. In Railway dashboard, click on your service
2. Go to **"Deployments"** tab
3. Click on the latest deployment
4. View build and runtime logs

### Check Environment Variables

1. Click on your service
2. Go to **"Variables"** tab
3. Verify all variables are set correctly
4. Check for typos or missing values

### Common Issues

**Build Fails:**
- Check build logs for errors
- Verify `package.json` has correct scripts
- Ensure all dependencies are listed
- Check Node.js version compatibility

**Application Crashes:**
- Check runtime logs
- Verify `DATABASE_URL` is correct
- Ensure all required environment variables are set
- Check port configuration (Railway sets PORT automatically)

**Database Connection Errors:**
- Verify `DATABASE_URL` is set (Railway auto-provides it)
- Check database service is running
- Verify migrations were run successfully
- Check database connection limits

**OAuth Not Working:**
- Verify `GOOGLE_CALLBACK_URL` matches exactly in Google Console
- Check `ALLOWED_ORIGINS` includes your domain
- Ensure HTTPS is used (Railway provides this automatically)
- Verify Client ID and Secret are correct

### Restart/Redeploy

1. Click on your service
2. Click **"Redeploy"** button
3. Or trigger redeploy via CLI: `railway up`

---

## 📝 Important Notes

✅ **Database URL**: Railway automatically provides `DATABASE_URL` from the database service. Use `${{Postgres.DATABASE_URL}}` if referencing in other services.

✅ **Port**: Railway automatically sets the `PORT` environment variable. Your app should use `process.env.PORT` (which your app already does).

✅ **Build Time**: First build may take 5-10 minutes. Be patient.

✅ **Free Tier**: Railway offers a free tier that's great for getting started. You can upgrade later if needed.

✅ **Automatic Deploys**: Railway automatically deploys on every push to your connected branch (usually `main`).

✅ **Environment Variables**: Changes to environment variables trigger automatic redeployment.

---

## 📋 Deployment Checklist

- [ ] Railway account created
- [ ] Repository connected (or empty project created)
- [ ] PostgreSQL database added
- [ ] Migrations executed
- [ ] Environment variables configured
- [ ] Google OAuth configured
- [ ] Build and start commands verified
- [ ] Initial deployment successful
- [ ] Domain obtained (Railway or custom)
- [ ] Environment variables updated with domain
- [ ] Google OAuth callback URL updated
- [ ] Application tested and working

---

## 📁 Required Files in Repository

✅ `package.json` (with `build` and `start` scripts)
✅ `railway.json` (optional - for Railway-specific config)
✅ `Procfile` (optional - Railway reads package.json by default)
✅ `migration.sql`
✅ `migration_attachments.sql`
✅ `ecosystem.config.js` (for reference, not used on Railway)

---

## 🔄 Updating Your Application

### Automatic Updates (GitHub Integration):

1. Make changes locally
2. Commit and push to GitHub:
```bash
git add .
git commit -m "Update application"
git push origin main
```

3. Railway automatically detects and deploys

### Manual Updates (CLI):

```bash
railway up
```

---

## 💰 Railway Pricing

- **Free Tier**: $5 credit monthly (good for testing)
- **Developer Plan**: $5/month + usage
- **Team Plan**: $20/month + usage

Check [railway.com/pricing](https://railway.com/pricing) for current pricing.

---

## 🎉 Success!

Your Handy Chatbot should now be live on Railway!

**Your app URL:** `https://your-app-name.up.railway.app`

**Next Steps:**
- Test all functionality
- Set up custom domain (optional)
- Configure monitoring
- Set up backups for database

---

## 📞 Support

If you encounter issues:
1. Check Railway deployment logs
2. Review environment variables
3. Verify database connectivity
4. Test locally with production environment variables
5. Check Railway status page: [status.railway.app](https://status.railway.app)

**Railway Documentation:** [docs.railway.app](https://docs.railway.app)

---

**Happy deploying! 🚂🚀**

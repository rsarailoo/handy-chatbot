# 🚀 Deploy Handy Chatbot to Vercel

Complete step-by-step guide to deploy your AI chatbot to Vercel.

## ⚠️ Important Notes

**Vercel Limitations:**
- Serverless functions have execution time limits (60 seconds for Pro, 10 seconds for Hobby)
- SSE (Server-Sent Events) streaming works but may timeout on long responses
- File uploads are limited to `/tmp` directory (512MB limit)
- Database connections should use connection pooling optimized for serverless

**Recommended Alternatives:**
- **Railway** - Better for full-stack apps (see `DEPLOY_RAILWAY.md`)
- **Render** - Similar to Railway, good for Express apps
- **Fly.io** - Great for long-running processes

---

## 📋 Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository** - Your code must be on GitHub
3. **PostgreSQL Database** - Neon, Supabase, or other cloud PostgreSQL
4. **Google OAuth Credentials** - Already configured
5. **OpenRouter API Key** - Already configured

---

## 🔧 Step 1: Prepare Project for Vercel

### 1.1 Install Vercel CLI (Optional but Recommended)

```bash
npm install -g vercel
```

### 1.2 Create Vercel Configuration

The `vercel.json` file has already been created. It configures:
- Serverless function routing
- Build settings
- API route handling
- Static file serving

### 1.3 Update Server for Serverless

Your server needs minor adjustments for Vercel's serverless environment. The main changes:
- Use `/tmp` for file uploads instead of `uploads/`
- Optimize database connections for serverless
- Handle serverless function context

---

## 🌐 Step 2: Deploy via Vercel Dashboard

### 2.1 Import Your Repository

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `rsarailoo/handy-chatbot`
4. Vercel will automatically detect your project

### 2.2 Configure Project Settings

**Framework Preset:** Other (or leave as auto-detected)

**Root Directory:** `./` (root of repository)

**Build Command:**
```bash
npm run build
```

**Output Directory:**
```
dist/public
```

**Install Command:**
```bash
npm install
```

### 2.3 Environment Variables

Add all required environment variables in Vercel dashboard:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | (leave empty, Vercel sets this) | |
| `DATABASE_URL` | `postgresql://...` | Your PostgreSQL connection string |
| `SESSION_SECRET` | `your-secret-key...` | Generate a strong random string |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxx` | |
| `GOOGLE_CALLBACK_URL` | `https://your-app.vercel.app/api/auth/google/callback` | Update after deployment |
| `OPENROUTER_API_KEY` | `sk-or-xxx` | |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Update after deployment |

**To add environment variables:**
1. In project settings, go to **"Environment Variables"**
2. Add each variable for **Production**, **Preview**, and **Development**
3. Click **"Save"**

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (usually 2-5 minutes)
3. Your app will be live at `https://your-app.vercel.app`

---

## 🔧 Step 3: Update OAuth Callback URL

After deployment, update your Google OAuth callback URL:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://your-app.vercel.app/api/auth/google/callback
   ```
5. Save changes

6. Update `GOOGLE_CALLBACK_URL` in Vercel environment variables
7. Update `ALLOWED_ORIGINS` in Vercel environment variables
8. Redeploy (or wait for automatic redeploy)

---

## 📝 Step 4: Database Setup

### 4.1 Run Migrations

Your database migrations need to be run manually:

1. Connect to your PostgreSQL database (Neon/Supabase console)
2. Run the SQL from `migration.sql`
3. Run the SQL from `migration_attachments.sql` (if needed)

Or use Drizzle Kit:
```bash
# Locally, with DATABASE_URL set
npm run db:push
```

---

## 🚀 Step 5: Deploy via CLI (Alternative Method)

If you prefer using the CLI:

### 5.1 Login to Vercel

```bash
vercel login
```

### 5.2 Link Project

```bash
cd D:\projects\chatbot@rad
vercel link
```

Follow prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your account
- **Link to existing project?** No (first time) or Yes (if exists)
- **Project name?** `handy-chatbot`
- **Directory?** `./`

### 5.3 Set Environment Variables

```bash
vercel env add DATABASE_URL
vercel env add SESSION_SECRET
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add GOOGLE_CALLBACK_URL
vercel env add OPENROUTER_API_KEY
vercel env add ALLOWED_ORIGINS
```

For each variable:
- Select environment: **Production**, **Preview**, **Development**
- Enter the value

### 5.4 Deploy

```bash
# Deploy to production
vercel --prod

# Or deploy to preview
vercel
```

---

## 🔍 Step 6: Verify Deployment

1. **Check Build Logs**
   - Go to Vercel dashboard → Your project → **Deployments**
   - Click on latest deployment to see logs

2. **Test Your App**
   - Visit `https://your-app.vercel.app`
   - Test login with Google OAuth
   - Test chat functionality
   - Check admin panel (if you're admin)

3. **Check Function Logs**
   - Go to **Functions** tab in Vercel dashboard
   - Monitor for any errors

---

## 🐛 Troubleshooting

### Issue: Build Fails

**Error: "Module not found"**
- Ensure all dependencies are in `package.json`
- Check that `node_modules` is not committed (should be in `.gitignore`)

**Error: "Build command failed"**
- Check build logs in Vercel dashboard
- Try building locally: `npm run build`
- Ensure TypeScript compiles: `npm run check`

### Issue: API Routes Not Working

**404 on `/api/*` routes**
- Check `vercel.json` routing configuration
- Ensure `server/index.ts` exports Express app correctly
- Check function logs in Vercel dashboard

### Issue: Database Connection Errors

**"Connection timeout" or "ECONNREFUSED"**
- Verify `DATABASE_URL` is correct in environment variables
- Check database allows connections from Vercel IPs
- For Neon/Supabase, ensure connection pooling is enabled
- Consider using `@neondatabase/serverless` (already in dependencies)

### Issue: OAuth Not Working

**"Redirect URI mismatch"**
- Verify `GOOGLE_CALLBACK_URL` matches exactly in Google Console
- Check `ALLOWED_ORIGINS` includes your Vercel domain
- Ensure HTTPS is used (Vercel provides this automatically)

### Issue: File Uploads Not Working

**"ENOENT" or "Permission denied"**
- Vercel serverless functions use `/tmp` directory
- Update file upload code to use `/tmp` instead of `uploads/`
- Files in `/tmp` are ephemeral (cleared after function execution)

### Issue: SSE Streaming Timeout

**Streaming stops after 10-60 seconds**
- Vercel has execution time limits
- Consider chunking responses or using shorter streaming windows
- For Pro plan, max duration is 60 seconds
- For Hobby plan, max duration is 10 seconds

---

## 📊 Step 7: Monitor and Optimize

### 7.1 Enable Analytics

1. Go to project settings
2. Enable **Vercel Analytics** (if on Pro plan)
3. Monitor performance metrics

### 7.2 Set Up Alerts

1. Configure deployment notifications
2. Set up error alerts
3. Monitor function execution times

### 7.3 Optimize Performance

- Enable **Edge Caching** for static assets
- Use **Vercel Image Optimization** for images
- Configure **CDN** settings
- Monitor function cold starts

---

## 🔄 Step 8: Continuous Deployment

Vercel automatically deploys on:
- Push to `main` branch → Production
- Push to other branches → Preview
- Pull requests → Preview with unique URL

### Custom Domain

1. Go to project settings → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `ALLOWED_ORIGINS` and `GOOGLE_CALLBACK_URL`

---

## 📝 Additional Configuration

### Update vercel.json for Custom Needs

If you need to adjust routing or function settings:

```json
{
  "functions": {
    "server/index.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

---

## ✅ Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] All environment variables set
- [ ] Build command configured
- [ ] Database migrations run
- [ ] Google OAuth callback URL updated
- [ ] First deployment successful
- [ ] Tested login functionality
- [ ] Tested chat functionality
- [ ] Tested admin panel (if applicable)
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up

---

## 🎉 Success!

Your chatbot should now be live on Vercel! 

**Your app URL:** `https://your-app.vercel.app`

**Next Steps:**
- Share your deployment URL
- Monitor usage and performance
- Set up custom domain (optional)
- Configure backups for database

---

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review function logs
3. Check environment variables
4. Verify database connectivity
5. Test locally with production environment variables

**Vercel Documentation:** [vercel.com/docs](https://vercel.com/docs)

---

**Note:** For better performance with long-running connections and file uploads, consider deploying to Railway or Render instead of Vercel.


# 🔧 Troubleshooting Guide

## Google OAuth Authentication Issues

### Error: `redirect_uri_mismatch`

This error occurs when the callback URL used by your application doesn't match what's configured in Google Cloud Console.

#### For Local Development

**Problem:**
- Your `.env` file is missing `GOOGLE_CALLBACK_URL` or it's set incorrectly
- Google Cloud Console doesn't have the local callback URL registered

**Solution:**

1. **Create/Update `.env` file** in the project root:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback
   ```

2. **Configure Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to **APIs & Services** → **Credentials**
   - Click on your OAuth 2.0 Client ID
   - Under **Authorized redirect URIs**, add:
     ```
     http://localhost:5001/api/auth/google/callback
     ```
   - **Important:** Use `http://` (not `https://`) for localhost
   - **Important:** Include the port number (`:5001`)
   - Click **Save**

3. **Verify your configuration:**
   - Start your server: `npm run dev`
   - Visit: `http://localhost:5001/api/test/oauth`
   - Check that `callbackUrl` shows: `http://localhost:5001/api/auth/google/callback`

#### Common Mistakes:

❌ **Wrong:** `GOOGLE_CALLBACK_URL=/api/auth/google/callback` (relative path)  
✅ **Correct:** `GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback` (full URL)

❌ **Wrong:** `GOOGLE_CALLBACK_URL=https://localhost:5001/api/auth/google/callback` (https for localhost)  
✅ **Correct:** `GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback` (http for localhost)

❌ **Wrong:** `GOOGLE_CALLBACK_URL=http://localhost/api/auth/google/callback` (missing port)  
✅ **Correct:** `GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback` (with port)

#### For Production (Vercel/Railway/VPS)

**Problem:**
- Production callback URL doesn't match Google Cloud Console
- Using `http://` instead of `https://` in production

**Solution:**

1. **Set environment variable** in your deployment platform:
   ```env
   GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback
   ```

2. **Configure Google Cloud Console:**
   - Add to **Authorized redirect URIs**:
     ```
     https://your-domain.com/api/auth/google/callback
     ```
   - **Important:** Use `https://` (not `http://`) for production
   - **Important:** No trailing slash

3. **Verify:**
   - After deployment, visit: `https://your-domain.com/api/test/oauth`
   - Check that `callbackUrl` matches exactly

---

### Error: `invalid_client`

**Problem:** Google OAuth credentials are incorrect or missing.

**Solution:**
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your `.env` file
2. Check that credentials match Google Cloud Console
3. Ensure credentials are for the correct project

---

### Error: Database Connection Timeout

**Problem:** `Error: Connection terminated due to connection timeout`

**Possible Causes:**
1. `DATABASE_URL` is not set or incorrect
2. Database server is not accessible (firewall/network)
3. SSL/TLS configuration issue (for cloud databases)
4. Database server is down or overloaded

**Solution:**

1. **Verify DATABASE_URL is set:**
   ```bash
   # Check if DATABASE_URL exists
   echo $DATABASE_URL
   # Or check your .env file
   ```

2. **Check DATABASE_URL format:**
   - **Neon:** `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require`
   - **Supabase:** `postgresql://user:password@db.xxx.supabase.co:5432/postgres`
   - **Local:** `postgresql://user:password@localhost:5432/dbname`

3. **For Neon databases:**
   - Ensure connection string includes `?sslmode=require`
   - Copy the connection string from Neon dashboard (Connection Details)
   - Verify the connection string is for the correct branch/environment

4. **For Supabase databases:**
   - Get connection string from: Settings → Database → Connection string
   - Use the "URI" format (not "Session mode" or "Transaction mode")
   - Ensure you're using the correct project's connection string

5. **Test database connection:**
   ```bash
   # Using psql
   psql $DATABASE_URL -c "SELECT NOW();"
   
   # Or visit the test endpoint
   http://localhost:5001/api/test/db
   ```

6. **Check network/firewall:**
   - For cloud databases: Ensure your IP is not blocked
   - For local databases: Ensure PostgreSQL is running and accessible
   - Check if port 5432 (or your custom port) is open

7. **Verify database is running:**
   - **Neon/Supabase:** Check dashboard for database status
   - **Local PostgreSQL:** 
     ```bash
     # Linux/Mac
     sudo systemctl status postgresql
     
     # Windows
     # Check Services for PostgreSQL
     ```

---

### Error: Database Tables Not Found

**Problem:** `Error: Database tables not found` or `relation "users" does not exist`

**Solution:**
1. Verify `DATABASE_URL` is set correctly in `.env`
2. Run `migration.sql` in your database:
   ```bash
   psql $DATABASE_URL -f migration.sql
   ```
   Or use your database's SQL editor (Neon/Supabase)
3. Verify tables were created:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

---

### Error: Session Not Working / Logged Out After Redirect

**Problem:** User authentication doesn't persist after OAuth callback redirect. You see `401` errors on `/api/auth/me` after successful login.

**Cause:** On Vercel (and other serverless platforms), memory sessions don't persist because each request might hit a different serverless function instance.

**Solution:**

1. **Ensure PostgreSQL session store is configured:**
   - The code now automatically uses PostgreSQL session store when `DATABASE_URL` is set
   - Sessions are stored in the `session` table in your database

2. **Create the session table (if not auto-created):**
   - Run `migration_session.sql` in your database SQL editor
   - Or the table will be auto-created on first use (if `createTableIfMissing: true` works)

3. **Verify session table exists:**
   ```sql
   SELECT * FROM session LIMIT 1;
   ```
   If the table doesn't exist, run `migration_session.sql`

4. **Check session configuration:**
   - Verify `SESSION_SECRET` is set (32+ characters)
   - Ensure `DATABASE_URL` is correctly configured
   - Check server logs for "✅ PostgreSQL session store configured"

5. **Generate a new session secret if needed:**
   ```bash
   openssl rand -base64 32
   ```

6. **Clear browser cookies and try again:**
   - Old cookies from memory sessions might interfere
   - Clear cookies for your domain and retry login

**For Local Development:**
- Memory sessions work fine locally (single server instance)
- PostgreSQL session store will still be used if `DATABASE_URL` is set

**For Production (Vercel/Railway):**
- **Must** use PostgreSQL session store (now configured automatically)
- Ensure `DATABASE_URL` is set in environment variables

---

## Testing Configuration

### Test Database Connection

Visit this endpoint to check your database setup:
```
http://localhost:5001/api/test/db
```

This will show:
- Whether database connection is successful
- Database URL (masked for security)
- Table existence status
- Detailed error messages and troubleshooting hints

### Test OAuth Configuration

Visit this endpoint to check your OAuth setup:
```
http://localhost:5001/api/test/oauth
```

This will show:
- Whether OAuth is configured
- Your callback URL
- Hints for fixing issues

---

## Still Having Issues?

1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure database migrations are run
4. Clear browser cookies and try again
5. Check Google Cloud Console for any restrictions on your OAuth client


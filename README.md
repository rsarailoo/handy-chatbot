# 🤖 Handy Chatbot - AI Chatbot Platform

**Developed by [@arad13877](https://github.com/arad13877) under supervision of [@rsarailoo](https://github.com/rsarailoo)**

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB.svg)

A modern, full-stack AI chatbot application with Persian/Farsi language support, featuring real-time streaming responses, conversation management, and a beautiful responsive UI.

[Features](#-features) • [Quick Start](#-quick-start) • [Installation](#-installation) • [Configuration](#-configuration) • [Deployment](#-deployment) • [API Reference](#-api-reference)

</div>

---

## ✨ Features

### Core Features
- 🧠 **AI-Powered Conversations** - Powered by OpenRouter with support for multiple AI models
- 🌊 **Real-time Streaming** - Server-Sent Events (SSE) for live response streaming
- 💬 **Conversation Management** - Create, organize, pin, archive conversations
- 📁 **Folder Organization** - Group conversations into customizable folders
- 🔍 **Search** - Full-text search across all conversations
- 📤 **Export** - Export conversations in various formats

### User Experience
- 🌙 **Dark/Light Theme** - Beautiful UI with theme toggle support
- 📱 **Fully Responsive** - Works seamlessly on desktop, tablet, and mobile
- 🇮🇷 **RTL Support** - Native Persian/Farsi language support with RTL layout
- ⌨️ **Keyboard Shortcuts** - Power user keyboard shortcuts
- 🎨 **Custom Fonts** - Beautiful Persian fonts (Doran, Ravi)

### Security & Authentication
- 🔐 **Google OAuth** - Secure authentication with Google
- 🛡️ **Rate Limiting** - Built-in protection against abuse
- 🔒 **Helmet Security** - HTTP security headers
- 🍪 **Secure Sessions** - Session-based authentication with secure cookies

### Admin Features
- 👥 **User Management** - View and manage users
- 🔑 **API Key Management** - Manage AI provider API keys
- 📊 **Statistics Dashboard** - View usage statistics

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+** (LTS recommended)
- **PostgreSQL** database (local or cloud - [Neon](https://neon.tech), [Supabase](https://supabase.com))
- **Google OAuth credentials** (for authentication)
- **OpenRouter API key** (for AI responses)

### 1. Clone the Repository
```bash
git clone https://github.com/rsarailoo/handy-chatbot.git
cd handy-chatbot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the project root:
```env
# Server Configuration
NODE_ENV=development
PORT=5001

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Session Security
SESSION_SECRET=your-random-secret-key-at-least-32-characters

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

# OpenRouter AI
OPENROUTER_API_KEY=sk-or-your-openrouter-api-key

# CORS (production only)
ALLOWED_ORIGINS=http://localhost:5001
```

### 4. Setup Database
Run the migration SQL in your PostgreSQL database:
```bash
# Using psql
psql -U your-user -d your-database -f migration.sql

# Or paste the contents of migration.sql in your database SQL editor
```

### 5. Run the Application

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```

The application will be available at `http://localhost:5001`

---

## 📦 Installation

### System Requirements

| Requirement | Minimum | Recommended |
|------------|---------|-------------|
| Node.js | 18.x | 20.x LTS |
| RAM | 2GB | 4GB+ |
| Disk Space | 500MB | 2GB+ |

### Dependency Installation

```bash
# Install all dependencies
npm install

# Install only production dependencies
npm install --production
```

### Database Setup Options

#### Option 1: Neon (Recommended for Cloud)
1. Create account at [neon.tech](https://neon.tech)
2. Create new project and database
3. Copy the connection string
4. Run `migration.sql` in SQL Editor

#### Option 2: Supabase
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor and run `migration.sql`
4. Copy the connection string from Settings > Database

#### Option 3: Local PostgreSQL
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb chatbot_db

# Run migration
psql -U postgres -d chatbot_db -f migration.sql
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `development` or `production` |
| `PORT` | No | Server port (default: 5001) | `5001` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Yes | Session encryption key (32+ chars) | `your-secret-key...` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth Client Secret | `GOCSPX-xxx` |
| `GOOGLE_CALLBACK_URL` | No | OAuth callback URL | `/api/auth/google/callback` |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key | `sk-or-xxx` |
| `ALLOWED_ORIGINS` | No | CORS allowed origins (comma-separated) | `https://yourdomain.com` |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add **Authorized redirect URIs**:
   - Development: `http://localhost:5001/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

### OpenRouter Setup

1. Create account at [openrouter.ai](https://openrouter.ai)
2. Go to API Keys section
3. Create new API key
4. Copy the key to `OPENROUTER_API_KEY` in `.env`

---

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```
- Hot-reloading enabled for both frontend and backend
- Vite dev server with HMR
- Source maps enabled for debugging

### Production Mode
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push schema changes to database |

---

## 🏗️ Project Structure

```
chatbot@rad/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   └── ui/         # Shadcn/UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── pages/          # Page components
│   │   ├── App.tsx         # Main App component
│   │   ├── main.tsx        # Entry point
│   │   └── index.css       # Global styles
│   ├── public/             # Static assets
│   │   └── fonts/          # Custom fonts
│   └── index.html          # HTML template
│
├── server/                 # Backend Express application
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── auth.ts             # Authentication (Google OAuth)
│   ├── storage.ts          # Database operations
│   ├── static.ts           # Static file serving
│   └── vite.ts             # Vite integration
│
├── shared/                 # Shared code between client/server
│   └── schema.ts           # Database schema & types (Drizzle ORM)
│
├── uploads/                # User uploaded files
├── font/                   # Font files
├── script/                 # Build scripts
│
├── migration.sql           # Database migration script
├── drizzle.config.ts       # Drizzle ORM configuration
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── ecosystem.config.js     # PM2 configuration
├── package.json            # Dependencies & scripts
└── .env                    # Environment variables (create this)
```

---

## 🔌 API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | OAuth callback handler |
| GET | `/api/auth/me` | Get current user info |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/make-admin` | Make first user admin |

### Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message (authenticated) |
| POST | `/api/demo/chat` | Demo chat (no auth required) |

### Conversation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List user's conversations |
| POST | `/api/conversations` | Create new conversation |
| GET | `/api/conversations/:id` | Get conversation with messages |
| PATCH | `/api/conversations/:id` | Update conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |
| PATCH | `/api/conversations/:id/pin` | Toggle pin status |
| PATCH | `/api/conversations/:id/archive` | Toggle archive status |

### Folder Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/folders` | List user's folders |
| POST | `/api/folders` | Create new folder |
| PATCH | `/api/folders/:id` | Update folder |
| DELETE | `/api/folders/:id` | Delete folder |

### Admin Endpoints (requires admin role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Get platform statistics |
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/conversations` | List all conversations |
| PATCH | `/api/admin/users/:id/admin` | Toggle user admin status |
| GET | `/api/admin/api-keys` | List API keys (masked) |
| POST | `/api/admin/api-keys` | Create/update API key |
| PATCH | `/api/admin/api-keys/:id` | Update API key |
| DELETE | `/api/admin/api-keys/:id` | Delete API key |

### File Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload image file |
| GET | `/uploads/:filename` | Serve uploaded file |

---

## 🚢 Deployment

### Option 1: VPS/Dedicated Server (Recommended)

See [DEPLOY.md](./DEPLOY.md) for comprehensive deployment guide.

**Quick Steps:**
```bash
# 1. Build the application
npm run build

# 2. Start with PM2
pm2 start ecosystem.config.js

# 3. Save PM2 process list
pm2 save

# 4. Setup PM2 startup script
pm2 startup
```

### Option 2: Railway

See [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md) for Railway deployment.

### Option 3: Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

EXPOSE 5001
CMD ["npm", "start"]
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 Security Features

- **Helmet.js** - Secure HTTP headers
- **Rate Limiting** - Prevents abuse (20 requests/min for chat, 100/15min for API)
- **Input Validation** - Zod schema validation for all inputs
- **SQL Injection Protection** - Drizzle ORM parameterized queries
- **XSS Protection** - Content sanitization
- **CORS** - Configurable origin restrictions
- **Session Security** - HttpOnly, Secure cookies in production
- **CSP** - Content Security Policy headers

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search |
| `Ctrl/Cmd + N` | New conversation |
| `Ctrl/Cmd + ,` | Open settings |
| `Enter` | Send message |
| `Shift + Enter` | New line in message |

---

## 🛠️ Tech Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x+ | JavaScript runtime |
| **TypeScript** | 5.6.3 | Type-safe JavaScript |
| **React** | 18.3.1 | UI library |
| **Express.js** | 4.21.2 | Web framework |
| **PostgreSQL** | 12+ (14-17 recommended, 17.7 latest stable) | Primary database |

### Frontend Technologies

| Package | Version | Purpose |
|---------|---------|---------|
| **React** | 18.3.1 | UI library |
| **React DOM** | 18.3.1 | React DOM renderer |
| **TypeScript** | 5.6.3 | Type safety |
| **Vite** | 5.4.20 | Build tool & dev server |
| **Tailwind CSS** | 3.4.17 | Utility-first CSS framework |
| **@tailwindcss/vite** | 4.1.3 | Tailwind Vite plugin |
| **@tailwindcss/typography** | 0.5.15 | Typography plugin |
| **Radix UI** | 1.x - 2.x | Accessible component primitives |
| **@tanstack/react-query** | 5.60.5 | Server state management |
| **Wouter** | 3.3.5 | Lightweight routing |
| **Framer Motion** | 11.13.1 | Animation library |
| **React Hook Form** | 7.55.0 | Form state management |
| **Lucide React** | 0.453.0 | Icon library |
| **React Markdown** | 10.1.0 | Markdown rendering |
| **React Syntax Highlighter** | 16.1.0 | Code syntax highlighting |
| **Next Themes** | 0.4.6 | Theme management |
| **Date-fns** | 3.6.0 | Date utility library |
| **Recharts** | 2.15.2 | Chart library |
| **CMDK** | 1.1.1 | Command menu component |
| **Vaul** | 1.1.2 | Drawer component |

### Backend Technologies

| Package | Version | Purpose |
|---------|---------|---------|
| **Express** | 4.21.2 | Web framework |
| **TypeScript** | 5.6.3 | Type safety |
| **TSX** | 4.20.5 | TypeScript execution |
| **Drizzle ORM** | 0.39.1 | Type-safe SQL ORM |
| **Drizzle Kit** | 0.18.1 | Database migrations |
| **Drizzle Zod** | 0.7.0 | Zod schema integration |
| **Passport.js** | 0.7.0 | Authentication middleware |
| **Passport Google OAuth20** | 2.0.0 | Google OAuth strategy |
| **Passport Local** | 1.0.0 | Local authentication |
| **Express Session** | 1.18.1 | Session management |
| **Connect PG Simple** | 10.0.0 | PostgreSQL session store |
| **Helmet** | 8.1.0 | Security headers |
| **CORS** | 2.8.5 | Cross-origin resource sharing |
| **Express Rate Limit** | 8.2.1 | Rate limiting middleware |
| **Multer** | 2.0.2 | File upload handling |
| **PG** | 8.16.3 | PostgreSQL client |
| **@neondatabase/serverless** | 0.10.4 | Neon serverless driver |
| **Dotenv** | 17.2.3 | Environment variables |
| **Zod** | 3.24.2 | Schema validation |
| **Zod Validation Error** | 3.4.0 | Error formatting |

### AI & External Services

| Service/Package | Version | Purpose |
|-----------------|---------|---------|
| **OpenRouter API** | Latest | AI model gateway |
| **OpenAI SDK** | 6.9.1 | OpenAI API client |
| **Groq SDK** | 0.37.0 | Groq AI API client |

### Development Tools

| Package | Version | Purpose |
|---------|---------|---------|
| **TypeScript** | 5.6.3 | Type checking |
| **Vite** | 5.4.20 | Build tool |
| **@vitejs/plugin-react** | 4.7.0 | React plugin for Vite |
| **ESBuild** | 0.25.0 | Fast JavaScript bundler |
| **PostCSS** | 8.4.47 | CSS processing |
| **Autoprefixer** | 10.4.20 | CSS vendor prefixes |
| **Drizzle Kit** | 0.18.1 | Database toolkit |

### Database

- **PostgreSQL** - Primary database
  - **Minimum Version**: 12.x
  - **Recommended**: 14.x, 15.x, 16.x, or 17.x
  - **Latest Stable**: 17.7 (as of 2025)
  - **Cloud Providers**: 
    - Neon (PostgreSQL 14-16)
    - Supabase (PostgreSQL 14-15)
    - ElephantSQL (PostgreSQL 12-15)
  - **Note**: PostgreSQL 18.0 is in preview (not recommended for production yet)
- **ORM**: Drizzle ORM 0.39.1
- **Client**: pg 8.16.3 (supports PostgreSQL 7.4+)

### Deployment Platforms

- **Vercel** - Serverless deployment (see `DEPLOY_VERCEL.md`)
- **Railway** - Full-stack deployment (see `DEPLOY_RAILWAY.md`)
- **VPS/Dedicated** - Traditional hosting (see `DEPLOY.md`)

---

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error:**
```bash
# Check if DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

**Google OAuth Not Working:**
- Verify callback URL matches Google Console settings
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Ensure your domain is in authorized domains

**Port Already in Use:**
```bash
# Find process using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>
```

**Build Errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Debug Endpoints (Development Only)

- `GET /api/test/db` - Test database connection
- `GET /api/test/oauth` - Check OAuth configuration

---

## 👨‍💻 Developers

This project is developed by:

- **[@arad13877](https://github.com/arad13877)** - Developer
- **[@rsarailoo](https://github.com/rsarailoo)** - Developer & Supervisor

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review existing [Issues](https://github.com/rsarailoo/handy-chatbot/issues)
3. Create a new issue with detailed information

---

<div align="center">

**Made with ❤️ for the Persian-speaking community**

</div>


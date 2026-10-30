# WattPro Solar — Employee Attendance & Workforce App

A full-stack attendance and workforce platform built for **WattPro Solar Energy Pvt. Ltd.**
Employees can clock in and clock out, managers can review time-off requests, and admins can
manage team members, work sites, and attendance records from one polished dashboard.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS 4**,
**Drizzle ORM**, and **PostgreSQL** — currently connected to a Neon serverless database.

---

## Features

| Area | What it does |
| --- | --- |
| Authentication | Email + password sign-in with hashed passwords (`scrypt`), HTTP-only session cookies stored in Postgres, and a first-run workspace setup flow |
| Clock in / clock out | One-click shift tracking with live duration, automatic late detection, and protection against duplicate or missing shifts |
| Dashboard | Greeting header, live clock, KPI cards, weekly hours chart, who's in today, and pending time-off summary |
| Attendance | Full CRUD with search, date/status filters, tabbed ranges, pagination, and CSV export |
| Team members | Full CRUD with department filters, roles (admin/employee), status badges, and profile cards |
| Time off | Request, edit, delete, approve, and decline leave requests with per-day counts |
| Work sites | Full CRUD with live "on site today" headcount per location |
| Access control | Admins manage everything; employees see only their own attendance and leave records |
| UX | Empty states, loading states, optimistic updates, toasts, modal dialogs, responsive layout from mobile to desktop |

The app ships **without any seed data**. On a fresh database the login screen becomes a
workspace setup screen where you create the first administrator account.

---

## Tech stack

- **Next.js 16** — App Router, server components, route handlers
- **React 19** — client components with hooks
- **TypeScript** — strict mode
- **Tailwind CSS 4** — utility-first styling
- **Drizzle ORM + `pg`** — typed PostgreSQL access
- **lucide-react** — icon set
- **PostgreSQL 14+** — persistent storage

---

## Local development

### 1. Prerequisites

- Node.js 20.9 or newer (Node 22 LTS recommended)
- PostgreSQL 14 or newer running locally or remotely

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the environment

Copy the example file and fill in your own connection string:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"
```

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Drizzle and the app |

`.env` is git-ignored — never commit real credentials.

### 4. Create the database schema

```bash
npx drizzle-kit push
```

This creates the `employees`, `sites`, `attendance`, `leave_requests`, and `sessions` tables.
No migration files are needed for a fresh setup.

`drizzle.config.ts` reads `DATABASE_URL` from `.env` (drizzle-kit loads it automatically), so the
connection string only ever lives in your `.env` file.

### 5. Start the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

### 6. Complete first-run setup

Because the app has no seed data, you'll land on the **Create your workspace** screen:

1. Enter your name, work email, and a password of at least 8 characters.
2. Click **Create admin account** — you are signed in as the workspace administrator.
3. Go to **Work sites** and add your project locations.
4. Go to **Team members** and add your employees.

> The bootstrap endpoint only works while the `employees` table is empty, so the setup
> screen cannot be used to create a second administrator.

---

## Resetting to an empty workspace

```bash
psql "$DATABASE_URL" -c 'TRUNCATE attendance, leave_requests, sessions, sites, employees RESTART IDENTITY CASCADE;'
```

This removes every record and returns the app to the first-run setup screen.

---

## Connecting to a managed Postgres (Neon, Supabase, …)

The app is currently connected to a **Neon** serverless Postgres database.

1. In the [Neon console](https://console.neon.tech), copy the **pooled** connection string
   (the host ends in `-pooler`). Always use the pooled endpoint for serverless and
   long-running apps — it handles connection limits for you.

2. Put it in `.env`:

   ```env
   DATABASE_URL=postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/<database>?sslmode=require
   ```

3. Create the schema:

   ```bash
   npx drizzle-kit push
   ```

4. Verify the connection:

   ```bash
   node --env-file=.env -e "import('pg').then(async ({Pool})=>{const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true}});const r=await p.query('select current_database()');console.log(r.rows);await p.end()})"
   ```

**TLS handling.** `src/db/index.ts` detects the `sslmode` parameter, strips the libpq-style
query parameters (`sslmode`, `channel_binding`, `uselibpqcompat`), and passes TLS through the
explicit `ssl` option instead. This keeps certificates verified and avoids the
`pg-connection-string` deprecation warnings.

**Connection pooling.** Neon's pooler is required when the app is deployed to a serverless
platform. For a traditional Node server (VPS, Docker, PM2) the same pooled string also works
and keeps the number of backend connections low.

> **Security note:** the credentials in `.env` are a live secret. If this repository is shared
> or the string has been pasted anywhere public, rotate the Neon role password in the Neon
> console and update `.env`.

---

## Scripts

```bash
npm run dev        # Start the development server
npm run build      # Production build
npm run start      # Start the production server (run build first)
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type check without emitting
```

---

## Project structure

```
.
├── .env.example          # Template for the environment file
├── .env                  # Real credentials (git-ignored)
├── drizzle.config.ts     # Drizzle Kit config, reads DATABASE_URL from .env
├── src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts        # Credential sign-in
│   │   │   ├── logout/route.ts       # Destroy session and cookie
│   │   │   └── bootstrap/route.ts    # First-run admin creation
│   │   ├── clock/route.ts            # Clock in / clock out
│   │   ├── data/route.ts             # Authenticated data refresh
│   │   ├── mutate/route.ts           # Generic CRUD endpoint
│   │   └── health/route.ts           # Health check
│   ├── login/page.tsx                # Sign-in / setup screen
│   ├── layout.tsx                    # Root layout and metadata
│   ├── page.tsx                      # Dashboard entry point
│   └── globals.css                   # Design system and styles
├── components/
│   ├── dashboard-app.tsx             # Dashboard shell, views, forms
│   └── login-form.tsx                # Sign-in and setup forms
├── db/
│   ├── index.ts                      # Drizzle + pg pool (TLS aware)
│   └── schema.ts                     # Table definitions
└── lib/
    ├── auth.ts                       # Sessions, password hashing
    ├── data.ts                       # Scoped data reads
    ├── setup.ts                      # First-run detection
    └── types.ts                      # Shared types
```

---

## API reference

All endpoints accept and return JSON. Mutating endpoints require an active session cookie.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Sign in with email and password |
| `POST` | `/api/auth/bootstrap` | Create the first administrator (only when `employees` is empty) |
| `POST` | `/api/auth/logout` | Sign out and clear the session |
| `GET` | `/api/data` | Fetch all data visible to the current user |
| `POST` | `/api/clock` | `{ "action": "in" \| "out", "siteId"?: number }` |
| `POST` | `/api/mutate` | Create, update, or delete a record |
| `GET` | `/api/health` | Database health check |

### `/api/mutate` request shape

```json
{
  "resource": "employees | attendance | leaves | sites",
  "action": "create | update | delete",
  "id": 12,
  "data": { }
}
```

`data` fields depend on the resource. Examples:

```bash
# Add a work site
curl -X POST http://localhost:3000/api/mutate \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"resource":"sites","action":"create","data":{"name":"Sunridge Solar Farm","code":"WP-2048","city":"Guntur, AP","address":"1840 Desert Cove Ave","status":"active"}}'

# Clock in
curl -X POST http://localhost:3000/api/clock \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"action":"in","siteId":1}'
```

---

## Database schema

| Table | Key columns |
| --- | --- |
| `employees` | `name`, `email` (unique), `password_hash`, `role`, `job_title`, `department`, `phone`, `status`, `start_date` |
| `sites` | `name`, `code` (unique), `city`, `address`, `status` |
| `attendance` | `employee_id`, `site_id`, `work_date`, `clock_in`, `clock_out`, `status`, `note`, `source` — unique per employee per date |
| `leave_requests` | `employee_id`, `type`, `start_date`, `end_date`, `days`, `reason`, `status` |
| `sessions` | `employee_id`, `token_hash`, `expires_at` |

---

## Deployment

### Option A — Vercel (recommended)

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import the project in [Vercel](https://vercel.com/new). The framework preset is detected automatically.
3. Add a Postgres database:
   - Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), **Neon**, **Supabase**, or **Railway**.
   - Copy the pooled connection string into the `DATABASE_URL` environment variable
     (add it to both *Production* and *Preview* scopes).
4. Deploy. After the first deploy, push the schema once from your machine:

   ```bash
   DATABASE_URL="<your-production-connection-string>" npx drizzle-kit push
   ```

5. Open the deployment URL and complete the first-run setup screen to create your administrator.

> Vercel serverless functions need a pooled connection string (PgBouncer/Neon pooler).
> If your provider caps connections, keep the default `pg` `Pool` small or use the pooler URL.

### Option B — Docker

```dockerfile
# Dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
```

```bash
docker build -t wattpro-attendance .
docker run -p 3000:3000 --env-file .env wattpro-attendance
```

### Option C — VPS (Ubuntu + systemd + Nginx)

```bash
# 1. Server setup
sudo apt update && sudo apt install -y nginx postgresql nodejs npm
sudo npm install -g pm2

# 2. Clone and build
git clone <your-repo-url> /var/www/wattpro-attendance
cd /var/www/wattpro-attendance
npm ci
npm run build

# 3. Environment
echo 'DATABASE_URL="postgresql://wattpro:<password>@localhost:5432/wattpro"' > .env
npx drizzle-kit push

# 4. Run with PM2
pm2 start npm --name wattpro -- start
pm2 save && pm2 startup
```

Nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name attendance.wattprosolar.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
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

Then issue a certificate with `sudo certbot --nginx -d attendance.wattprosolar.in`.

---

## Security checklist before going live

- [ ] Use a strong, unique Postgres password and restrict network access to the database.
- [ ] Serve the app over HTTPS so the `Secure` session cookie flag is honoured.
- [ ] Set `DATABASE_URL` as a server-only secret — never expose it to the browser.
- [ ] Rotate the administrator password after first setup.
- [ ] Add regular automated Postgres backups.
- [ ] Review the access-control rules in `src/app/api/mutate/route.ts` if you add new roles.

---

## Suggested next steps

1. **Attendance policies** — configurable shift start times, grace periods, and overtime rules.
2. **Payroll export** — monthly timesheet exports to CSV/Excel for payroll processing.
3. **Notifications** — email or WhatsApp alerts for late arrivals and pending approvals.
4. **Site check-in geofencing** — capture device location on clock in/out.
5. **Reporting** — per-employee, per-site, and per-department hours dashboards.
6. **Leave balances** — track annual leave entitlements and remaining balances.
7. **Audit log** — record who changed which record and when.

---

## License

Internal software for WattPro Solar Energy Pvt. Ltd.

# AutoFlow

No-code money automations for freelancers and small businesses. Create invoices, record expenses, and let AutoFlow do the follow-up: thank-you emails when you get paid, polite reminders when invoices are late, alerts for big expenses and a morning money summary. Each automation is built from simple forms ("When an invoice is paid → Send an email → Notify me"), and there's no code anywhere.

**One app, one `.env`, one deploy.** The server delivers both the API and the web app, so there's a single URL to share.

**Stack:** React 19, Vite, Tailwind, Express, TypeScript, MongoDB. OpenAI is optional.

---

## Run it locally

You need **Node 18+** and **MongoDB**, either installed locally or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

```bash
npm run setup     # installs everything and creates .env
npm run dev       # open http://localhost:5173
```

If you're using Atlas, put your connection string in `MONGO_URI` in `.env` first. An existing FinFlow `.env` works as-is.

> **On a Mac?** Port 5000 is taken by AirPlay Receiver (it answers with "403 Forbidden"). AutoFlow uses 5050 by default, and in development it automatically switches to 5050 even if your `.env` says `PORT=5000`.

On the login page, click **Try the demo** to explore a workspace full of sample data. You can also log in with `demo@autoflow.app` / `Password123!`, or create your own account.

To run it exactly as it runs in production:

```bash
npm run build && npm start     # http://localhost:5050
```

## Deploy

**Render (free):** push to GitHub, then choose **New → Blueprint** in Render and paste your `MONGO_URI` when asked. Full steps are in [docs/DEPLOY.md](docs/DEPLOY.md).

**Any Node host** (Railway, Fly.io, a VPS):

```
build:  npm ci --include=dev && npm run build
start:  npm start
env:    MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, NODE_ENV=production
```

**Docker** runs the app plus MongoDB:

```bash
docker compose up -d --build   # http://localhost:5050
```

## Configuration (`.env`)

| Setting | Needed? | What it does |
|---|---|---|
| `MONGO_URI` | Yes | Your database |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Yes in production | Keep logins secure. Use long random strings. |
| `AUTO_SEED` | Optional (default `true`) | Creates the demo account and shows **Try the demo**. Set it to `false` on a real business site. |
| `OPENAI_API_KEY` | Optional | AI-written reminders, smarter expense categories and assistant answers. Without it, AutoFlow uses built-in messages and keyword rules. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Optional | Delivers emails. Without them, emails are prepared and logged but not sent. |
| `SLACK_WEBHOOK_URL` | Optional | Default channel for "Post to Slack" steps |
| `RUN_WORKER_INLINE` | Optional | Set it to `false` only if you run `npm run worker` as a separate process. |

`REDIS_URL` is no longer needed. Automations are queued in MongoDB, so a "Wait 3 days" step survives restarts.

## What's inside

- **Home:** money paid to you this month, unpaid and overdue totals, cash flow, upcoming due dates and recent automation runs.
- **Invoices:** create, edit, mark sent or paid, and download a PDF. Invoices are flagged as overdue automatically.
- **Customers** and **Expenses**. Expenses are sorted into categories for you.
- **Automations:** 8 one-click templates, plus a builder with 7 triggers and 9 step types. Every automation has a **Test run** that skips waits, leaves invoices unchanged and sends any emails to you rather than your customers.
- **Activity:** every run, step by step, in plain words. Waiting runs can be cancelled.
- **Ask AutoFlow:** an assistant that answers questions from your own numbers.
- **Notifications**, **Settings** (profile, currency, password, sample data), and a **private webhook link** for other apps.

Every account has its own private workspace, and nobody can see another account's data.

## Commands

| Command | What it does |
|---|---|
| `npm run setup` | Install dependencies and create `.env` |
| `npm run dev` | Development mode with hot reload (web on :5173, API on :5050) |
| `npm run build` / `npm start` | Production build, then run it on `PORT` (default 5050) |
| `npm run seed` | Reset the demo account's sample data. Other accounts are never touched. |
| `npm test` | Unit tests for the automation logic |
| `npm run typecheck` | Type-check the frontend and backend |

## Project structure

```
autoflow/
├── .env.example            the only config file
├── package.json            one package for everything
├── Dockerfile, docker-compose.yml, render.yaml
├── docs/DEPLOY.md
├── backend/src/
│   ├── server.ts           entry point: database → demo account → worker → web server
│   ├── app.ts              routes, security headers, serves the built web app
│   ├── automation/         catalog.ts (triggers, steps, form fields), templates.ts,
│   │                       engine.ts (runs steps), worker.ts (queue + schedules), variables.ts
│   ├── services/           invoices, expenses, customers, dashboard, assistant, pdf, email…
│   ├── routes/             auth, data (invoices/expenses/customers/…), automations, hooks
│   ├── models/             MongoDB schemas (all AutoFlow collections are prefixed autoflow_)
│   └── middleware/, lib/
├── backend/tests/
└── frontend/src/
    ├── pages/              Landing, Login, Signup, app/* (one file per screen)
    ├── components/         ui.tsx (buttons, fields, sheets), AppShell, editor fields…
    └── lib/                api client, auth, formatting, types
```

**To add a new automation step,** add it to `STEPS` in `backend/src/automation/catalog.ts` and add an executor in `engine.ts`. The editor builds its form from the catalog automatically.

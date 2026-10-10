# Deploying AutoFlow

AutoFlow is a single service. You deploy it once, set three environment variables, and get one URL.

## Render (free)

### 1. MongoDB Atlas
1. Create a free cluster and a database user at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Under **Network Access**, add `0.0.0.0/0`. Render's free tier has no fixed IP address.
3. Copy the connection string, e.g. `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/autoflow`.

You can reuse the database from FinFlow. AutoFlow keeps its own collections (`autoflow_…`), so nothing clashes.

### 2. Push to GitHub
```bash
git init && git add . && git commit -m "AutoFlow"
git remote add origin https://github.com/<you>/autoflow.git
git branch -M main && git push -u origin main
```

### 3. Create the service
1. On [render.com](https://render.com), choose **New → Blueprint** and pick the repo. Render reads `render.yaml`.
2. Paste your `MONGO_URI` when asked. `OPENAI_API_KEY` and the SMTP settings are optional. The JWT secrets are generated for you.
3. Click **Apply**. When the deploy finishes, open the service URL. That's the whole app.
4. Click **Try the demo**, or create an account.

If you'd rather not use the blueprint, choose **New → Web Service** and set:
- Build command: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Env vars: `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NODE_ENV=production`

## Other hosts

Any Node 18+ host works the same way: Railway, Fly.io, Koyeb, a VPS…

```
build:  npm ci --include=dev && npm run build
start:  npm start            (listens on $PORT)
env:    MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, NODE_ENV=production
```

## Docker

```bash
cp .env.example .env    # set JWT secrets: openssl rand -hex 32
docker compose up -d --build
```

This runs AutoFlow and MongoDB on port 5050. Put Caddy or nginx in front for HTTPS on your own domain.

## Going live for a real business

- Set `AUTO_SEED=false` to hide the demo account.
- Add SMTP settings so "Send an email" steps actually deliver mail.
- Add `OPENAI_API_KEY` for AI-written reminders and assistant answers.

## Good to know

- Render's free tier sleeps after 15 minutes idle, so the next visit takes about 30 seconds to wake it. Scheduled automations and waiting steps catch up as soon as it wakes. For automations on the exact minute, use a paid instance or an uptime pinger.
- PDFs are generated on request, so nothing is stored on disk and nothing is lost when Render redeploys.
- To host the web app separately (e.g. on Vercel), build it with `VITE_API_URL=https://<api>/api` and set `CLIENT_URL=https://<web>` on the server.

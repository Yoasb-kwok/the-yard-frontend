# Server deployment – step-by-step

Follow these steps **on your Mac** and **on the Ubuntu server** (SSH) as indicated.

---

## Part A: Check current server state (optional)

1. **SSH into the server** (from Mac, in a terminal):
   ```bash
   chmod 400 ~/Desktop/pem/theyard.pem
   ssh -i ~/Desktop/pem/theyard.pem ubuntu@18.139.86.39
   ```

2. **Verify services** (on server):
   ```bash
   sudo systemctl status nginx    # should be active
   sudo systemctl status mysql    # should be active
   sudo systemctl status php8.3-fpm   # should be active
   ```

3. **Test in browser** (from Mac):
   - phpMyAdmin: http://18.139.86.39/phpmyadmin → login **root** / **Theyard2026!**
   - API (will 502 until backend is running): https://theyardapis.01tech.work

4. Type `exit` to leave SSH when done checking.

---

## Part B: Deploy the backend on the server

Do this **after** you have the backend code (e.g. from the-yard-backend repo).

### Step 1: SSH into the server

On your Mac:

```bash
ssh -i ~/Desktop/pem/theyard.pem ubuntu@18.139.86.39
```

You should see a prompt like `ubuntu@ip-172-31-23-0:~$`.

---

### Step 2: Install Node.js 20 LTS

On the server, run:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should show v20.x
npm -v
```

---

### Step 3: Install PM2 (process manager)

On the server:

```bash
sudo npm install -g pm2
pm2 -v
```

---

### Step 4: Get the backend code onto the server

**Option A – Git (if the-yard-backend is in a Git repo)**

On the server:

```bash
cd ~
# If you use HTTPS (replace with real repo URL):
git clone https://github.com/YOUR_ORG/the-yard-backend.git
cd the-yard-backend
```

If the repo is private, you’ll need to set up SSH keys or a deploy key on the server, or use Option B.

**Option B – Copy from your Mac with SCP**

On your **Mac** (in a new terminal, not in SSH):

```bash
cd /path/to/the-yard-backend   # folder where backend code lives
tar czf backend.tar.gz .
scp -i ~/Desktop/pem/theyard.pem backend.tar.gz ubuntu@18.139.86.39:~/
```

Then on the **server**:

```bash
cd ~
mkdir -p the-yard-backend
cd the-yard-backend
tar xzf ../backend.tar.gz
```

Use whichever option you have (Git or SCP).

---

### Step 5: Install dependencies and set environment

On the server, in the backend folder (e.g. `~/the-yard-backend`):

```bash
npm install
# If the project has a build step (e.g. TypeScript):
# npm run build
```

Create a `.env` file with production values (replace with your real DB password and any other vars):

```bash
nano .env
```

Add at least:

```env
NODE_ENV=production
PORT=3002
DATABASE_URL=mysql://root:Theyard2026!@127.0.0.1:3306/your_database_name
```

Save: `Ctrl+O`, Enter, then `Ctrl+X`.

Use the same database name you use in phpMyAdmin (or create one in phpMyAdmin first: e.g. `theyard`).

---

### Step 6: Create the database (if not already created)

On the server:

```bash
mysql -u root -p'Theyard2026!' -e "CREATE DATABASE IF NOT EXISTS theyard;"
```

Use the same name as in `DATABASE_URL`. If the backend uses migrations:

```bash
npm run migrate
# or
npx knex migrate:latest
# (depends on your backend)
```

---

### Step 7: Start the API with PM2

On the server:

```bash
# From the backend folder, e.g. ~/the-yard-backend
pm2 start npm --name "yard-api" -- start
# If your start script is different, e.g. "node dist/index.js":
# pm2 start dist/index.js --name "yard-api"
```

Check it’s running:

```bash
pm2 status
pm2 logs yard-api --lines 20
```

If you see errors (e.g. DB connection), fix `.env` and run:

```bash
pm2 restart yard-api
```

---

### Step 8: Make PM2 start on reboot

On the server:

```bash
pm2 startup
# Run the command it prints (sudo env PATH=...)
pm2 save
```

---

### Step 9: Test the API

From your Mac (or server):

```bash
curl -s https://theyardapis.01tech.work/api/health
# or
curl -s https://theyardapis.01tech.work/health
```

You should get a JSON response (e.g. `{"ok":true}`), not 502.

---

## Part C: Connect the frontend to the API and deploy

The frontend talks to the backend via `VITE_API_URL`. A **production** build is already configured to use the live API.

### 1. API URL (already set)

In **studio/.env.production** you have:

```env
VITE_API_URL=https://theyardapis.01tech.work/api
```

When you run `npm run build` inside `studio/`, this is used automatically. No extra step needed to “connect” the API—the built app will call `https://theyardapis.01tech.work`.

### 2. Build the frontend (on your Mac)

```bash
cd /Users/01tech/Desktop/Jason/the-yard-frontend/studio
npm install
npm run build
```

This creates **studio/dist/** with the static files (HTML, JS, CSS).

### 3. Deploy the frontend (choose one)

**Option A – Same EC2 server (Nginx)**

1. From your Mac, upload the build:
   ```bash
   cd /Users/01tech/Desktop/Jason/the-yard-frontend/studio
   scp -i ~/Desktop/pem/theyard.pem -r dist ubuntu@18.139.86.39:~/
   ```
2. On the server, move it where Nginx can serve it (e.g. `/var/www/yard-frontend`):
   ```bash
   ssh -i ~/Desktop/pem/theyard.pem ubuntu@18.139.86.39
   sudo mkdir -p /var/www/yard-frontend
   sudo cp -r ~/dist/* /var/www/yard-frontend/
   ```
3. Add an Nginx server block for your frontend domain (e.g. `theyard.01tech.work`) that has `root /var/www/yard-frontend;` and `try_files $uri $uri/ /index.html;` for SPA routing. Then:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
4. Open the site in the browser; it will use `https://theyardapis.01tech.work` for API calls.

**Option B – Vercel / Netlify (recommended if you use Git)**

1. Push your frontend code to GitHub (or GitLab).
2. In Vercel/Netlify, import the repo and set **root directory** to `studio`.
3. Add environment variable for production: **VITE_API_URL** = `https://theyardapis.01tech.work/api`.
4. Deploy. The host will run `npm run build`; the built site will use the production API.

**Option C – Push only the built files (any static host)**

Upload the contents of **studio/dist/** to any static host (e.g. S3, GitHub Pages, or your own server). The app is already built with the production API URL, so it will work as long as the host serves `index.html` for all routes (SPA).

---

## Quick reference

| Item | Value |
|------|--------|
| Server IP | 18.139.86.39 |
| SSH | `ssh -i ~/Desktop/pem/theyard.pem ubuntu@18.139.86.39` |
| phpMyAdmin | http://18.139.86.39/phpmyadmin |
| MySQL root | root / Theyard2026! |
| API URL | https://theyardapis.01tech.work |
| API port on server | 3002 |

---

## If something goes wrong

- **502 on theyardapis.01tech.work** → Backend not running or not on port 3002. Run `pm2 status` and `pm2 logs yard-api` on the server.
- **Nginx config** → API vhost is in `/etc/nginx/conf.d/theyard-api.conf`. After edits: `sudo nginx -t && sudo systemctl reload nginx`.
- **MySQL** → `mysql -u root -p'Theyard2026!'` and check database/user.
- **phpMyAdmin** → Served by the config in `/etc/nginx/conf.d/phpmyadmin.conf` (or the default site if that’s how it was set up).

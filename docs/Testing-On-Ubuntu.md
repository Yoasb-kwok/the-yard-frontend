# Testing Frontend and Backend on Ubuntu

Steps to run and test the Studio frontend (and optionally the backend) on Ubuntu.

---

## Prerequisites on Ubuntu

1. **Node.js (v18+)** and **npm**

   ```bash
   # Option A: NodeSource (recommended for specific version)
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Option B: Ubuntu default (may be older)
   sudo apt update
   sudo apt install -y nodejs npm

   node -v   # e.g. v20.x
   npm -v
   ```

2. **Git** (if you clone the repo)

   ```bash
   sudo apt install -y git
   ```

---

## 1. Frontend only (demo mode, no backend)

The frontend can run without the backend and use demo accounts.

```bash
cd /path/to/the-yard-frontend/studio
npm install
npm run dev
```

- Open **http://localhost:5173** in a browser.
- Log in with demo accounts (see login page hint):
  - **Student:** `student@student.com` / `student123`
  - **Admin:** `admin@admin.com` / `admin123`

To access from another machine on the same network (e.g. phone or another PC), start with host:

```bash
npm run dev -- --host
```

Then open **http://<ubuntu-ip>:5173** (e.g. `http://192.168.1.100:5173`). Find IP with `ip addr` or `hostname -I`.

---

## 2. Frontend + backend (full stack)

The frontend proxies `/api` to the backend at **http://localhost:3002**. Start the backend first, then the frontend.

### Backend (separate repo)

The backend is in **the-yard-backend** (e.g. `studio_backend` on port 3002). If you have that repo:

```bash
cd /path/to/the-yard-backend/studio_backend   # or your backend path
npm install
npm start   # or npm run dev — must listen on port 3002
```

Confirm it’s up:  
**http://localhost:3002/api/health** (or **http://localhost:3002/health**) should return something like `{"ok":true}`.

### Frontend (this repo)

In another terminal:

```bash
cd /path/to/the-yard-frontend/studio
npm install
npm run dev
```

Open **http://localhost:5173**. API calls go to the backend via the Vite proxy.

### If the backend is on another host or port

Create **studio/.env**:

```bash
# Backend not on localhost:3002
VITE_API_URL=http://YOUR_BACKEND_IP:3002/api
```

Then run `npm run dev` again. For production build, the frontend will use this URL.

---

## 3. Production build (optional)

```bash
cd /path/to/the-yard-frontend/studio
npm run build
npm run preview
```

Preview serves the built app (default **http://localhost:4173**). The preview server does **not** proxy `/api`; use `VITE_API_URL` in `.env` at build time if the backend is elsewhere.

---

## 4. Ports summary

| Service   | Default port | URL                    |
|----------|--------------|------------------------|
| Frontend | 5173         | http://localhost:5173  |
| Backend  | 3002         | http://localhost:3002  |
| Preview  | 4173         | http://localhost:4173  |

---

## 5. Troubleshooting on Ubuntu

- **Port in use:**  
  `sudo lsof -i :5173` or `sudo lsof -i :3002` to see the process; kill it or change the port in config.

- **Permission denied (port < 1024):**  
  Use a port ≥ 1024 (e.g. 5173, 3002) or run with `sudo` (not recommended).

- **Firewall:**  
  If you use `--host` and can’t reach the app from another device:
  ```bash
  sudo ufw allow 5173/tcp
  sudo ufw status
  ```

- **Cannot connect to API:**  
  If the backend isn’t running, the frontend will show network errors; you can still use **demo login** (see section 1).

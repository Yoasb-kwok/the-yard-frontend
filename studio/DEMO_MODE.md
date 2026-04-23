# Demo Mode

The frontend can run completely standalone (no backend, no database) for
client showcases. All data lives in your browser's `localStorage` and
survives page reloads.

## Enable

Set the Vite env var `VITE_DEMO_MODE=true` at build time. The demo repo
ships with `studio/.env.production` already setting this, so **Vercel
production builds automatically deploy in demo mode**.

For local tinkering:

```bash
cd studio
VITE_DEMO_MODE=true npm run dev
```

You'll see a yellow "Demo Mode" banner pinned to the bottom of the page.

## Seeded login credentials

| Role       | Email               | Password   |
|------------|---------------------|------------|
| Admin      | `admin@demo.com`    | `demo1234` |
| Student    | `student@demo.com`  | `demo1234` |
| Parent     | `parent@demo.com`   | `demo1234` |
| Instructor | `teacher@demo.com`  | `demo1234` |
| New student (test signup) | — (register any email) | your own |

**Forgot-password OTP** is always `123456`.

## Features wired up

- Auth: login / register / forgot password / OTP / change password
- Public: News, About, Contact, FAQ, Terms, Privacy, Calendar,
  Instructors, Token packages, Trial application
- Student: Dashboard, Schedule, Tokens, Payment history, Shop checkout
  (mock Stripe — clicking "purchase" immediately credits tokens and
  jumps to the success page), Notifications, Sick-leave / extension
  requests, Profile
- Admin CRUD: Classes, Users, Instructors, Trial applications, Token
  packages, News, Tags + Tag types (dynamic), Holidays, Coupons, Class
  notices, FAQ CMS, Contact CMS, Terms, Privacy, Home/About CMS
- Admin dashboards: Financial, Conversion funnel, Class health,
  Attendance anomaly, Renewal/churn, Instructor performance, Audit log,
  Reports (all return deterministic seed-derived numbers)
- File uploads: returns a stable `https://picsum.photos/seed/.../...`
  URL so previews look real

## Persistence & reset

All writes persist under `localStorage` key `demo_db_v1`. Use the
**"重置資料"** button on the yellow banner to wipe and re-seed.

## Adding / changing mock handlers

- `studio/src/lib/mock/db.ts` — type definitions + `getDb / persist /
  resetDb / mutate / nextId`.
- `studio/src/lib/mock/seed.ts` — initial data.
- `studio/src/lib/mock/router.ts` — one `dispatch()` function that
  pattern-matches `(method, path)` and returns the same
  `{ success, data }` envelope the real backend does. The final
  fallback returns `{ success: true, data: [] }` so unknown endpoints
  never blank out the UI.
- `studio/src/lib/mock/index.ts` — `isDemoMode()` check and entry
  point.

The interception happens inside `studio/src/lib/api.ts`'s `request()`
function, so any page using the shared `api.get/post/patch/delete`
client gets mocked automatically.

File uploads are also intercepted in
`studio/src/lib/uploads.ts::uploadImage()`.

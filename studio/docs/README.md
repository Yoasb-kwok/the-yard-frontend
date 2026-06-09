# Database & API Specifications

## Implemented API (Google Sheets backend)

**Source of truth for implemented endpoints and which sheet each uses:**

- **[API_AND_DATABASE_REFERENCE.md](../../API_AND_DATABASE_REFERENCE.md)** (project root) – All studio-api routes, methods, and Google Sheet(s) used. Use this for wiring frontend and checking setup.

Backend uses **Google Sheets** (not MySQL). Sheet names and header rows are in the root `*_headers.txt` files and in **ADMIN_TABLES_SETUP.md**, **DANCING_ACADEMY_DATABASE_DESIGN.md**, **ATTENDANCE_GOOGLE_SHEETS_SETUP.md**, etc.

## Contents of this folder

| File | Description |
|------|-------------|
| **API_SPECIFICATION.md** | Legacy/spec API list (table form). Some paths or methods may differ from the implemented API; prefer **API_AND_DATABASE_REFERENCE.md** for current behaviour. |
| **API_SPECIFICATION.csv** | Same as above in CSV for Excel/Sheets. |
| **STRIPE_PAYMENT_METHOD_MATRIX.md** | Stripe Hosted Checkout test matrix and step-by-step validation guide for payment methods. |
| **STUDENT_UPCOMING_CLASSES_SPEC.md** | `GET /student/upcoming-classes` contract (one row per lesson, profile scope, leave index). |

## Response format

- Success: `{"success": true, "data": [...]}` or, for login, `{"success": true, "token": "...", "user": {...}}`
- Failure: `{"success": false, "msg": "Error description"}`

Use HTTP: `400` (bad request), `401` (unauthorized), `404` (not found), `500` (server error).

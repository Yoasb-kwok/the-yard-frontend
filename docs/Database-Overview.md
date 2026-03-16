# Database Overview

This document lists all tables used by the Studio CMS backend. The schema is MySQL (InnoDB, utf8mb4). Some columns or tables are added via migrations on an existing database.

**Base schema** lives in the backend repo: `database/schema.sql` (root) or `studio_backend/database/schema.sql`. **Migrations** are in `database/migrations/` or `studio_backend/database/migrations/`.

---

## Table List (alphabetical)

| Table | Purpose |
|-------|--------|
| **audit_log** | Log actions (refund, attendance, applications, etc.) |
| **class_enrollments** | Student enrollment in a class (links user, class, optional user_token) |
| **class_notices** | Admin-sent notices per class (students in that class see in popup / 訊息中心) |
| **classes** | Class / course schedule and metadata |
| **coupons** | Discount codes for purchases |
| **extension_requests** | Student requests to extend class (e.g. make-up) |
| **holidays** | Holiday calendar |
| **instructors** | Instructor list |
| **news** | News / announcements (with published_at) |
| **orders** | Purchase orders (token packages) |
| **otp_codes** | OTP for forgot-password flow |
| **profiles** | User profiles (e.g. family members; includes student_id) |
| **refund_records** | Refund history per enrollment |
| **sick_leave_requests** | Sick leave / personal leave requests per enrollment (optional lesson_index, leave_type) |
| **site_content** | Static pages (about, terms, privacy, faq) by page_key |
| **token_packages** | Token package definitions (name, price, validity_days, etc.) |
| **trial_applications** | Trial class applications (links to user if registered; optional assigned_lessons) |
| **user_tokens** | User’s token balance per package (remaining_tokens, expiry_date) |
| **users** | User accounts (login, role, is_admin, must_change_password, etc.) |
| **verification_codes** | OTP for email/mobile change (purpose: email_change, mobile_change) |

---

## Table Definitions

### users

User accounts (login, admin, student). Used for auth and profile ownership.

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| username | VARCHAR(255) | Optional; often same as email |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password | VARCHAR(255) | NOT NULL (hashed) |
| name | VARCHAR(255) | |
| full_name | VARCHAR(255) | |
| country_code | VARCHAR(20) | |
| mobile | VARCHAR(50) | |
| role | VARCHAR(50) | Default 'student' |
| is_admin | TINYINT(1) | Default 0 |
| isActivated | TINYINT(1) | Default 1 |
| **must_change_password** | **TINYINT(1)** | **Optional (migration). Default 0. 1 = prompt to change password (e.g. after trial auto-register).** |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | ON UPDATE |

---

### profiles

Per-user profile (e.g. family member / child). One user can have multiple profiles. Used for student_id, contact details.

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT | NOT NULL, FK → users(id) ON DELETE CASCADE |
| full_name | VARCHAR(255) | |
| nick_name | VARCHAR(255) | |
| date_of_birth | DATE | |
| sex | TINYINT(1) | |
| parents_name | VARCHAR(255) | |
| contact_number | VARCHAR(50) | |
| residential_district | VARCHAR(100) | |
| has_joined_courses | TINYINT(1) | |
| level | VARCHAR(50) | |
| student_id | VARCHAR(50) | e.g. 'std000123' |
| id_first_four | VARCHAR(20) | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### news

News / announcements. Only rows with `published_at <= NOW()` are shown on public API.

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| title | VARCHAR(500) | NOT NULL |
| content | TEXT | |
| image_url | VARCHAR(500) | |
| published_at | DATETIME | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### token_packages

Definitions of token packages (for purchase / display).

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | |
| token_count | INT | NOT NULL, default 0 |
| price | INT | NOT NULL, default 0 |
| validity_days | INT | NOT NULL, default 60 |
| is_active | TINYINT(1) | Default 1 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### user_tokens

User’s token balance (per package). One row per “wallet” (e.g. one purchase or one admin-assigned package).

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT | NOT NULL, FK → users(id) ON DELETE CASCADE |
| package_id | INT | FK → token_packages(id) ON DELETE SET NULL |
| remaining_tokens | INT | NOT NULL, default 0 |
| total_tokens | INT | NOT NULL, default 0 |
| expiry_date | DATE | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### instructors

Instructor list (name, optional image).

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| name | VARCHAR(255) | NOT NULL |
| profile_image_url | VARCHAR(500) | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### classes

Class / course schedule. `is_cancelled = 1` means class is cancelled.

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| name | VARCHAR(255) | NOT NULL |
| class_code | VARCHAR(50) | |
| instructor | VARCHAR(255) | |
| substitute_instructor | VARCHAR(255) | |
| start_time | DATETIME | NOT NULL |
| end_time | DATETIME | NOT NULL |
| location | VARCHAR(100) | |
| program_code | VARCHAR(50) | |
| level | VARCHAR(50) | Default 'entry' |
| age_tag | VARCHAR(20) | |
| capacity | INT | Default 10 |
| enrolled_count | INT | Default 0 |
| weekday | TINYINT | 0=Sun..6=Sat |
| total_lessons | INT | Default 8 |
| is_cancelled | TINYINT(1) | Default 0 |
| is_internal | TINYINT(1) | Default 0 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### holidays

Holiday calendar (name, date, description).

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| name | VARCHAR(255) | NOT NULL |
| date | DATE | NOT NULL |
| description | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### site_content

Static pages (about, terms, privacy, faq) by `page_key`.

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| page_key | VARCHAR(50) | NOT NULL, UNIQUE |
| title | VARCHAR(255) | |
| content | TEXT | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### coupons

Discount codes (code, discount_type, discount_value, validity, etc.).

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| code | VARCHAR(50) | NOT NULL, UNIQUE |
| discount_type | VARCHAR(20) | Default 'percentage' |
| discount_value | DECIMAL(10,2) | Default 0 |
| min_order_amount | INT | Default 0 |
| quantity | INT | Default 0 |
| used_count | INT | Default 0 |
| valid_from | DATE | |
| valid_until | DATE | |
| is_active | TINYINT(1) | Default 1 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### audit_log

Action log (actor, action, target_type, target_id, details).

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| actor | VARCHAR(255) | |
| actor_id | VARCHAR(100) | |
| action | VARCHAR(100) | NOT NULL |
| target_type | VARCHAR(50) | |
| target_id | VARCHAR(100) | |
| details | TEXT | |
| created_at | TIMESTAMP | |

---

### orders

Purchase orders (user_id, package_id, total, payment_status, token_count).

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT | NOT NULL, FK → users(id) ON DELETE CASCADE |
| order_id | VARCHAR(50) | |
| package_id | INT | FK → token_packages(id) ON DELETE SET NULL |
| total | INT | Default 0 |
| payment_status | VARCHAR(50) | Default 'pending' |
| payment_method | VARCHAR(50) | |
| token_count | INT | Default 0 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### class_enrollments

Student enrollment in a class. Links user + class; optional user_token for which package is used.

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| class_id | INT | NOT NULL, FK → classes(id) ON DELETE CASCADE |
| user_id | INT | NOT NULL, FK → users(id) ON DELETE CASCADE |
| user_token_id | INT | FK → user_tokens(id) ON DELETE SET NULL |
| status | VARCHAR(50) | Default 'enrolled' |
| check_in_time | DATETIME | |
| check_out_time | DATETIME | |
| sick_leave_document_url | VARCHAR(500) | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

*Note: In `studio_backend` schema, `profile_id` (FK → profiles) may exist for “which child” in the enrollment.*

---

### otp_codes

OTP for forgot-password flow (email, otp, expires_at).

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| email | VARCHAR(255) | NOT NULL |
| otp | VARCHAR(10) | NOT NULL |
| expires_at | DATETIME | NOT NULL |
| created_at | TIMESTAMP | |

---

### verification_codes

OTP for email/mobile change. One row per pending verification (user_id, purpose, target_value, otp, expires_at).

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT | NOT NULL, FK → users(id) ON DELETE CASCADE |
| purpose | ENUM('email_change','mobile_change') | NOT NULL |
| target_value | VARCHAR(255) | NOT NULL (new email or mobile) |
| otp | VARCHAR(10) | NOT NULL |
| expires_at | DATETIME | NOT NULL |
| created_at | TIMESTAMP | |

---

### trial_applications

Trial class applications. If applicant is new, backend creates user + profile then inserts here with user_id. If existing user, only insert with user_id.

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| class_id | INT | NOT NULL, FK → classes(id) ON DELETE CASCADE |
| user_id | INT | FK → users(id) ON DELETE SET NULL (set when user exists or after auto-register) |
| full_name | VARCHAR(255) | |
| nick_name | VARCHAR(255) | |
| date_of_birth | DATE | |
| sex | TINYINT(1) | |
| parents_name | VARCHAR(255) | |
| country_code | VARCHAR(20) | |
| contact_number | VARCHAR(50) | |
| email | VARCHAR(255) | |
| residential_district | VARCHAR(100) | |
| has_joined_courses | TINYINT(1) | |
| password | VARCHAR(255) | Optional legacy |
| status | VARCHAR(50) | Default 'pending' |
| **assigned_lessons** | **INT** | **Optional (migration). Number of lessons assigned (e.g. 1 trial, 4 for package).** |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

*Admin may also add an `admin_notes` column via migration for internal notes.*

---

### class_notices

Admin-sent notices per class. Students enrolled in that class see these (e.g. popup, 訊息中心). Created by migration.

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| class_id | INT | NOT NULL, FK → classes(id) ON DELETE CASCADE |
| message | TEXT | NOT NULL |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### extension_requests

Student request to extend / make up a class (class_enrollment_id, reason, status). Optional: user_token_id, rejection_reason.

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| class_enrollment_id | INT | NOT NULL, FK → class_enrollments(id) ON DELETE CASCADE |
| user_token_id | INT | FK → user_tokens(id) ON DELETE SET NULL |
| reason | TEXT | |
| status | VARCHAR(50) | Default 'pending' |
| rejection_reason | TEXT | Optional (studio_backend) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### sick_leave_requests

Sick leave / personal leave per enrollment. Optional: lesson_index (0-based; NULL = whole course), leave_type (sick/personal), document_url, rejection_reason.

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| class_enrollment_id | INT | NOT NULL, FK → class_enrollments(id) ON DELETE CASCADE |
| lesson_index | INT | Optional; 0-based; NULL = whole course |
| leave_type | VARCHAR(20) | Optional; e.g. 'sick', 'personal' |
| reason | TEXT | |
| document_url | VARCHAR(500) / MEDIUMTEXT | Optional (migration may use MEDIUMTEXT) |
| status | VARCHAR(50) | Default 'pending' |
| rejection_reason | TEXT | Optional |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

### refund_records

Refund history (enrollment_id, user_id, user_name, class_id, class_name, tokens_refunded, remarks, refunded_by, refunded_at).

| Column | Type | Notes |
|--------|------|--------|
| id | INT AUTO_INCREMENT | PK |
| enrollment_id | INT | NOT NULL, FK → class_enrollments(id) ON DELETE CASCADE |
| user_id | INT | |
| user_name | VARCHAR(255) | |
| class_id | INT | |
| class_name | VARCHAR(255) | |
| class_code | VARCHAR(50) | |
| tokens_refunded | INT | Default 0 |
| remarks | TEXT | |
| refunded_by | VARCHAR(255) | |
| refunded_at | DATETIME | |
| created_at | TIMESTAMP | |

---

## Migrations (run if table/column missing)

- **users.must_change_password**: `add_must_change_password.sql`
- **trial_applications.assigned_lessons**: `add_assigned_lessons_to_trial_applications.sql`
- **class_notices** table: `add_class_notices.sql`
- **verification_codes** table: `add_verification_codes.sql` (if not in base schema)

Run example (from backend repo):

```bash
mysql -u root -p studio_backend < database/migrations/add_must_change_password.sql
mysql -u root -p studio_backend < database/migrations/add_assigned_lessons_to_trial_applications.sql
mysql -u root -p studio_backend < database/migrations/add_class_notices.sql
```

---

*Last updated from the-yard-backend `database/schema.sql`, `studio_backend/database/schema.sql`, and migrations.*

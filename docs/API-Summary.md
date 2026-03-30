# API Summary（含 Request Body、成功／失敗回傳）

Backend base URL: `/api`（例：`http://localhost:3002/api`）

認證：需登入的 API 請在 Header 帶上 `Authorization: Bearer <token>`。

錯誤回傳通用格式：`{ success: false, msg: string }`，部分 API 會多帶 `errors`（validation）或 `debug`（開發環境）。

---

## 一、公開 API（毋須登入）

### GET /news

- **Query**：`limit`（可選，預設 20）、`offset`（可選，預設 0）
- **成功 (200)**：`{ success: true, data: [{ id, title, content, image_url, published_at }, ...] }`
- **失敗**：`500` — `{ success: false, msg }`

### GET /news/:id

- **成功 (200)**：`{ success: true, data: { id, title, content, image_url, published_at } }`
- **失敗**：`404` — `{ success: false, msg: 'Not found' }`；`500` — `{ success: false, msg }`

### GET /classes

- **Query**：`from`, `to`, `location`, `level`（皆可選）
- **成功 (200)**：`{ success: true, data: [{ id, name, instructor, start_time, end_time, location, program_code, level, age_tag, capacity, enrolled_count, weekday, total_lessons, is_cancelled }, ...] }`
- **失敗**：`500` — `{ success: false, msg }`

### GET /holidays

- **Query**：`from`, `to`（可選）
- **成功 (200)**：`{ success: true, data: [{ id, name, date, description }, ...] }`
- **失敗**：`500` — `{ success: false, msg }`

### GET /site-content/:pageKey

- **成功 (200)**：`{ success: true, data: { page_key, title, content } }`
- **失敗**：`404` — `{ success: false, msg: 'Not found' }`；`500` — `{ success: false, msg }`

### GET /health（或 /api/health）

- **成功 (200)**：`{ ok: true, serverId?: string }`
- **失敗**：依 server 設定

---

### POST /trial-application（試堂申請）

- **Body**：
  - 必填：`classId`（number 或前端 demo 用 id）、`fullName`（string）、`email`（string）
  - 選填：`contactNumber`, `countryCode`, `nickName`, `dateOfBirth`, `sex`, `parentsName`, `residentialDistrict`, `hasJoinedCourses`
- **成功 (201) — 已有帳號**：  
  `{ success: true, msg: 'Trial application submitted.', applicationId: number, existingUser: true }`
- **成功 (201) — 新帳號**：  
  `{ success: true, msg: 'Trial application submitted.', applicationId: number, existingUser: false, accountCreated: true, requirePasswordChange: true, temporaryPassword: string, message: '帳號已建立，請使用以下臨時密碼登入，並在登入後立即更改密碼。' }`
- **失敗**：  
  - `400` — `{ success: false, msg: 'fullName and email are required.' }`  
  - `400` — `{ success: false, msg: 'No class available for trial. Please add a class in the admin first.' }`  
  - `500` — `{ success: false, msg }`（或帶 `debug`）

---

## 二、用戶／認證（/api/user、/api/auth）

### POST /api/user/login

- **Body**：`{ loginIdentifier: string, password: string, rememberMe?: boolean }`  
  - `loginIdentifier`：email 或 username
- **成功 (200)**：  
  `{ success: true, msg: 'Logged In', token: string, user: { ID, username, name, email } }`  
  - 若後端有實作：可多帶 `requirePasswordChange: boolean`
- **失敗**：  
  - `400` — `{ success: false, errors: [{ msg, path }] }`（validation）  
  - `401` — `{ success: false, msg: 'Invalid Email or Password.' }`  
  - `500` — `{ success: false, msg: 'Database error' }`

### POST /api/user/register

- **Body**：`{ email: string, password: string, fullName: string, idLastFour?: string, countryCode?: string, mobile?: string }`
- **成功 (200)**：`{ success: true, msg: 'Registered', user: { ID, email }, profile: {} }`
- **失敗**：  
  - `400` — `{ success: false, errors }`  
  - `409` — `{ success: false, msg: 'Email already exists.' }`  
  - `500` — `{ success: false, msg }`

### POST /api/user/forgot-password

- **Body**：`{ email?: string, mobile?: string, countryCode?: string }`（至少 email 或 mobile）
- **成功 (200)**：`{ success: true, msg: 'OTP sent to email.' }`
- **失敗**：`400` — `{ success: false, msg: 'Email or mobile required.' }`

### POST /api/user/verify-otp

- **Body**：`{ email: string, otp: string }`
- **成功 (200)**：`{ success: true, msg: 'Verified. You can reset password.', tempToken?: null }`
- **失敗**：`400` — `{ success: false, msg: 'Email and OTP required.' }`

### POST /api/user/reset-password

- **Body**：`{ email: string, otp: string, newPassword: string }`
- **成功 (200)**：`{ success: true, msg: 'Password reset successfully.' }`
- **失敗**：`400` — `{ success: false, errors }`；`500` — `{ success: false, msg }`

### GET /api/user/me 或 GET /api/auth/me（需登入）

- **成功 (200)**：  
  `{ success: true, user: { ID, id, username, name, email, mobile }, profile: { ... }, profiles: [...] }`  
  - 若後端有實作：user 或頂層可多帶 `requirePasswordChange: boolean`
- **失敗**：`401` — `{ success: false, msg: 'Unauthorized' }` 或 `'User not found'`；`500` — `{ success: false, msg }`

### POST /api/user/change-password（需登入）

- **Body**：`{ currentPassword: string, newPassword: string }`
- **成功 (200)**：`{ success: true, msg: 'Password updated successfully.' }`
- **失敗**：  
  - `400` — `{ success: false, errors }` 或 `{ success: false, msg: 'Current password is incorrect.' }`  
  - `401` — `{ success: false, msg: 'Unauthorized' }` 或 `'User not found'`  
  - `500` — `{ success: false, msg }`

### PATCH /api/user/account（需登入）

- **Body**：`{ email?: string, mobile?: string, countryCode?: string }`（至少一個）
- **成功 (200)**：`{ success: true, msg: 'Account updated.', user?: { id, email } }`
- **失敗**：  
  - `400` — `{ success: false, msg: 'No fields to update.' }` 或 `errors`  
  - `401` — `{ success: false, msg: 'Unauthorized' }`  
  - `409` — `{ success: false, msg: 'Email already in use.' }`  
  - `500` — `{ success: false, msg }`

### POST /api/user/send-verify-email（需登入）

- **Body**：`{ newEmail: string }`
- **成功 (200)**：`{ success: true, msg: 'Verification code sent to your new email.', devOtp?: string }`
- **失敗**：`400` — `{ success: false, msg: 'New email is required.' }` 或 `errors`；`401`；`409` — Email already in use；`500`

### POST /api/user/confirm-email（需登入）

- **Body**：`{ newEmail: string, otp: string }`
- **成功 (200)**：`{ success: true, msg: 'Email updated successfully.' }`
- **失敗**：`400` — `{ success: false, msg: 'New email and OTP are required.' }` 或 `'Invalid or expired verification code.'`；`401`；`500`

### POST /api/user/send-verify-mobile（需登入）

- **Body**：`{ countryCode: string, mobile: string }`
- **成功 (200)**：`{ success: true, msg: 'Verification code sent to your new mobile.', devOtp?: string }`
- **失敗**：`400` — `{ success: false, msg: 'Country code and mobile are required.' }` 或 `errors`；`401`；`500`

### POST /api/user/confirm-mobile（需登入）

- **Body**：`{ countryCode: string, mobile: string, otp: string }`
- **成功 (200)**：`{ success: true, msg: 'Mobile updated successfully.' }`
- **失敗**：`400` — `{ success: false, msg: 'Mobile and OTP are required.' }` 或 `'Invalid or expired verification code.'`；`401`；`500`

---

## 三、學生端（/api/student）— 皆需登入

### GET /api/student/tokens

- **成功 (200)**：`{ success: true, data: [{ id, remaining_tokens, total_tokens, expiry_date }, ...] }`
- **失敗**：`401` — `{ success: false, msg: 'Unauthorized' }`；`500` — `{ success: false, msg }`

### GET /api/student/upcoming-classes

- **成功 (200)**：  
  `{ success: true, data: [{ id, status, user_id, user_name, class: { name, instructor, start_time, end_time, program_code, location }, total_lessons, attended_lessons }, ...] }`
- **失敗**：`401`；`500`

### GET /api/student/trial-applications

- **成功 (200)**：  
  `{ success: true, data: [{ id, class_name, status: 'pending'|'confirmed', applied_date }, ...] }`
- **失敗**：`401`；`500` — `{ success: false, msg }`

### GET /api/student/class-notices

- **成功 (200)**：  
  `{ success: true, data: [{ id, class_id, class_name, message, created_at }, ...] }`  
  - 僅回傳該學生已報讀班別、且 30 天內的通知
- **失敗**：`401`；`500` — `{ success: false, msg }`

---

## 四、Admin 端（/api/admin）— 需 Admin 權限 + 登入

### GET /api/admin/trial-applications

- **成功 (200)**：  
  `{ success: true, data: [{ id, applicant_name, applicant_email, applicant_phone, trial_class, preferred_datetime, trial_date, status, assigned_class_id, assigned_class_name, assigned_lessons, class_total_lessons, notes, applied_at, updated_at, full_name, nick_name, date_of_birth, parents_name, residential_district, has_joined_courses }, ...] }`
- **失敗**：`401` / `403`；`500` — `{ success: false, msg }`

### PATCH /api/admin/trial-applications/:id

- **Body**：`{ status?: string, assigned_class_id?: number, assigned_lessons?: number }`  
  - 至少提供一個欄位。`admin_notes` 若後端有欄位可一併傳入。
- **成功 (200)**：`{ success: true, msg: 'Updated' }`（若 fallback 無堂數：`msg: 'Updated (assigned_lessons requires migration)'`）
- **失敗**：  
  - `400` — `{ success: false, msg: 'Missing trial application id' }` 或 `'Provide status and/or assigned_class_id and/or assigned_lessons'` 或 `'Run migration to add assigned_lessons column, or only send assigned_class_id.'`  
  - `404` — `{ success: false, msg: 'Trial application not found' }`  
  - `500` — `{ success: false, msg }`

### GET /api/admin/class-notices

- **成功 (200)**：`{ success: true, data: [{ id, class_id, class_name?, message?, message_zh_tw?, message_zh_cn?, message_en?, created_at }, ...] }`
- **失敗**：`401` / `403`；`500`

### POST /api/admin/class-notices

- **Body**：`{ classId: number, message?: string, message_zh_tw?: string, message_zh_cn?: string, message_en?: string }`  
  - `classId` 須為有效且未取消的班別 ID（對應 `classes.id`）。  
  - 至少提供一種內容：`message` 或任一 `message_zh_*`；前端會以第一個非空語言填 `message` 作後備。
- **成功 (201)**：`{ success: true, id: number, msg: 'Class notice sent' }`
- **失敗**：  
  - `400` — `{ success: false, msg: 'Valid classId is required' }` 或 `'Message is required' }`  
  - `404` — `{ success: false, msg: 'Class not found' }`  
  - `500` — `{ success: false, msg }`

### PATCH /api/admin/class-notices/:id

- **Body**：可更新 `message`、`message_zh_tw`、`message_zh_cn`、`message_en`（及後端允許之欄位）。
- **成功 (200)**：`{ success: true }`
- **失敗**：`400` / `404` / `500`

### DELETE /api/admin/class-notices/:id

- **成功 (200)**：`{ success: true }`
- **失敗**：`404` / `500`

---

### 其他 Admin API（Body／成功／失敗摘要）

| Method | Path | Body / Query | 成功回傳 | 失敗回傳 |
|--------|------|--------------|----------|----------|
| GET | /api/admin/pending-counts | — | `{ success, data }` | 401/403, 500 |
| GET | /api/admin/dashboard/stats | — | `{ success, data }` | 401/403, 500 |
| GET | /api/admin/dashboard/today-classes | — | `{ success, data }` | 401/403, 500 |
| GET | /api/admin/classes | query 可選 | `{ success, data: [class] }` | 401/403, 500 |
| POST | /api/admin/classes | body: class 欄位 | `{ success, data }` / 201 | 400, 401/403, 500 |
| POST | /api/admin/classes/recurring | body: 循環課堂參數 | 201 / success | 400, 500 |
| GET | /api/admin/classes/:id | — | `{ success, data }` | 404, 500 |
| PATCH | /api/admin/classes/:id | body: 更新欄位 | `{ success }` | 400, 404, 500 |
| DELETE | /api/admin/classes/:id | — | 200 / success | 404, 500 |
| GET | /api/admin/classes/:classId/enrollments | — | `{ success, data }` | 500 |
| PATCH | /api/admin/class-enrollments/:id | body: 出勤等 | `{ success }` | 400, 404, 500 |
| GET | /api/admin/instructors | — | `{ success, data }` | 500 |
| POST | /api/admin/instructors | body: 導師欄位 | 201 / success | 400, 500 |
| PATCH | /api/admin/instructors/:id | body: 更新欄位 | `{ success }` | 400, 404, 500 |
| DELETE | /api/admin/instructors/:id | — | 200 / success | 404, 500 |
| GET | /api/admin/users | — | `{ success, data }` | 500 |
| PATCH | /api/admin/users/:id | body: 更新欄位 | `{ success }` | 400, 404, 500 |
| POST | /api/admin/users/:id/send-password-reset | — | `{ success, msg }` | 404, 500 |
| GET/POST/PATCH/DELETE | /api/admin/holidays, /:id | body 依 CRUD | `{ success, data }` / 200/201 | 400, 404, 500 |
| GET/POST/PATCH/DELETE | /api/admin/coupons, /:id | body 依 CRUD | `{ success, data }` | 400, 404, 500 |
| GET | /api/admin/audit-log | query 可選 | `{ success, data }` | 500 |
| GET/POST/PATCH/DELETE | /api/admin/news, /:id | body 依 CRUD | `{ success, data }` | 400, 404, 500 |
| GET | /api/admin/conversion-funnel | query 可選 | `{ success, data }` | 500 |
| GET | /api/admin/renewal-churn | query 可選 | `{ success, data }` | 500 |
| GET | /api/admin/class-health | query 可選 | `{ success, data }` | 500 |
| GET | /api/admin/instructor-performance | query 可選 | `{ success, data }` | 500 |
| GET | /api/admin/attendance-anomaly | query 可選 | `{ success, data }` | 500 |

---

## 五、與前端對應關係（簡表）

| 功能 | 前端用途 | API |
|------|----------|-----|
| 試堂申請（提交） | 預約試堂表單 | POST `/api/trial-application` |
| 我的試堂申請 | 學生 Dashboard 區塊 | GET `/api/student/trial-applications` |
| 試堂申請管理 | Admin 試堂申請頁 | GET `/api/admin/trial-applications`、PATCH `/api/admin/trial-applications/:id` |
| 全班通知（列表／發送／編輯／刪除） | Admin 全班通知頁 | GET/POST `/api/admin/class-notices`、PATCH/DELETE `/api/admin/class-notices/:id` |
| 全班通知（顯示） | 學生端彈出視窗 | GET `/api/student/class-notices` |
| 登入／改密碼提示 | 登入後、getMe | POST `/api/user/login`、GET `/api/user/me`、POST `/api/user/change-password` |

---

*最後更新：依 the-yard-backend 與 studio 前後端實際使用之 routes 與 controller 整理。*

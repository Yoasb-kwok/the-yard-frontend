# API Summary

Backend base URL: `/api`（例：`http://localhost:3002/api`）

認證：需登入的 API 請在 Header 帶上 `Authorization: Bearer <token>`。

---

## 一、公開 API（毋須登入）

| Method | Path | 說明 |
|--------|------|------|
| GET | `/news` | 取得最新消息列表 |
| GET | `/news/:id` | 取得單則消息詳情 |
| GET | `/classes` | 取得課程列表（可帶 query：from, to 等） |
| GET | `/holidays` | 取得假期列表 |
| GET | `/site-content/:pageKey` | 取得指定頁面靜態內容 |
| GET | `/health` | 健康檢查（部分後端掛在 /api/health） |
| **POST** | **`/trial-application`** | **試堂申請**（新用戶會自動建帳號並回傳臨時密碼；已註冊則只新增試堂申請） |

### POST /trial-application（試堂申請）

- **Body**：`{ classId, fullName, email, contactNumber?, countryCode?, nickName?, dateOfBirth?, sex?, parentsName?, residentialDistrict?, hasJoinedCourses? }`
- **回傳（新帳號）**：`{ success, applicationId, existingUser: false, accountCreated: true, requirePasswordChange: true, temporaryPassword, message }`
- **回傳（已有帳號）**：`{ success, applicationId, existingUser: true }`

---

## 二、用戶 / 認證（/api/user、/api/auth）

| Method | Path | 認證 | 說明 |
|--------|------|------|------|
| POST | `/api/user/login` | 否 | 登入，回傳含 `token`、`requirePasswordChange` |
| POST | `/api/user/register` | 否 | 註冊 |
| POST | `/api/user/forgot-password` | 否 | 忘記密碼 |
| POST | `/api/user/verify-otp` | 否 | 驗證 OTP |
| POST | `/api/user/reset-password` | 否 | 重設密碼 |
| GET | `/api/user/me` | 是 | 取得當前用戶（含 `requirePasswordChange`） |
| GET | `/api/auth/me` | 是 | 同上（視後端掛在哪條 route） |
| POST | `/api/user/change-password` | 是 | 更改密碼（成功後 `requirePasswordChange` 會變 false） |
| PATCH | `/api/user/account` | 是 | 更新帳號資料 |
| POST | `/api/user/send-verify-email` | 是 | 發送驗證電郵 |
| POST | `/api/user/confirm-email` | 是 | 確認電郵 |
| POST | `/api/user/send-verify-mobile` | 是 | 發送驗證手機 |
| POST | `/api/user/confirm-mobile` | 是 | 確認手機 |

---

## 三、學生端（/api/student）— 皆需登入

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/student/tokens` | 我的代幣套票（user_tokens） |
| GET | `/api/student/upcoming-classes` | 即將到來的課堂（已報讀班別） |
| GET | **`/api/student/trial-applications`** | **我的試堂申請列表**（dashboard「我的試堂申請」） |
| GET | **`/api/student/class-notices`** | **全班通知列表**（供彈出視窗／訊息中心顯示） |

---

## 四、Admin 端（/api/admin）— 需 Admin 權限 + 登入

### 試堂申請

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/admin/trial-applications` | 取得所有試堂申請（含班別、狀態、分配班別、堂數等） |
| PATCH | `/api/admin/trial-applications/:id` | 更新單筆：狀態、備註、分配班別、堂數（body: status?, admin_notes?, assigned_class_id?, assigned_lessons?） |

### 全班通知

| Method | Path | 說明 |
|--------|------|------|
| POST | **`/api/admin/class-notice`** | **發送全班通知**。Body: `{ classId: number, message: string }`。寫入 `class_notices`，有報讀該班的學生可在學生介面看到彈出。 |

### 其他 Admin API（摘要）

| 類別 | Method | Path | 說明 |
|------|--------|------|------|
| 待辦 | GET | `/api/admin/pending-counts` | 待處理數量 |
| 儀表板 | GET | `/api/admin/dashboard/stats` | 儀表板統計 |
| | GET | `/api/admin/dashboard/today-classes` | 今日課堂 |
| 班別 | GET | `/api/admin/classes` | 班別列表 |
| | POST | `/api/admin/classes` | 新增班別 |
| | POST | `/api/admin/classes/recurring` | 建立循環課堂 |
| | GET | `/api/admin/classes/:id` | 單一班別 |
| | PATCH | `/api/admin/classes/:id` | 更新班別 |
| | DELETE | `/api/admin/classes/:id` | 刪除班別 |
| | GET | `/api/admin/classes/:classId/enrollments` | 班別報讀名單 |
| 報讀 | PATCH | `/api/admin/class-enrollments/:id` | 更新報讀（如出勤） |
| 導師 | GET/POST/PATCH/DELETE | `/api/admin/instructors`、`/:id` | 導師 CRUD |
| 用戶 | GET | `/api/admin/users` | 用戶列表 |
| | PATCH | `/api/admin/users/:id` | 更新用戶 |
| | POST | `/api/admin/users/:id/send-password-reset` | 發送重設密碼 |
| 假期 | GET/POST/PATCH/DELETE | `/api/admin/holidays`、`/:id` | 假期 CRUD |
| 優惠券 | GET/POST/PATCH/DELETE | `/api/admin/coupons`、`/:id` | 優惠券 CRUD |
| 審計 | GET | `/api/admin/audit-log` | 審計日誌 |
| 消息 | GET/POST/PATCH/DELETE | `/api/admin/news`、`/:id` | 消息 CRUD |
| 報表 | GET | `/api/admin/conversion-funnel` | 轉換漏斗 |
| | GET | `/api/admin/renewal-churn` | 續約／流失 |
| | GET | `/api/admin/class-health` | 班別健康度 |
| | GET | `/api/admin/instructor-performance` | 導師表現 |
| | GET | `/api/admin/attendance-anomaly` | 出勤異常 |

---

## 五、與前端對應關係（簡表）

| 功能 | 前端用途 | API |
|------|----------|-----|
| 試堂申請（提交） | 預約試堂表單 | POST `/api/trial-application` |
| 我的試堂申請 | 學生 Dashboard 區塊 | GET `/api/student/trial-applications` |
| 試堂申請管理 | Admin 試堂申請頁 | GET `/api/admin/trial-applications`、PATCH `/api/admin/trial-applications/:id` |
| 全班通知（發送） | Admin 全班通知頁 | POST `/api/admin/class-notice` |
| 全班通知（顯示） | 學生端彈出視窗 | GET `/api/student/class-notices` |
| 登入／改密碼提示 | 登入後、getMe | POST `/api/user/login`、GET `/api/user/me`、POST `/api/user/change-password` |

---

*最後更新：依 the-yard-backend 與 studio 前後端實際使用之 routes 整理。若後端同時存在根目錄與 studio_backend，請以實際運行的 entry（如 server.js）為準。*

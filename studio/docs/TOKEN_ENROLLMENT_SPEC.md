# Token ↔ Class Enrollment Spec

> 代幣與報名課堂：1 堂 = 1 代幣（可透過 `classes.token_cost` 調整每堂倍率）。  
> **2026-06 客戶要求**：學生提交報名後，**不即時扣代幣**；管理員收到通知，於後台「分配代幣」完成入班。

---

## 1. 流程（現行）

| 步驟 | 角色 | 說明 |
| --- | --- | --- |
| 1 | 學生 | 購買套票 → 代幣入帳（`user_tokens`，未分配池） |
| 2 | 學生 | 日曆選課 → 提交 **報名申請**（`POST /class-enrollment-requests`） |
| 3 | 系統 | 建立 `status=pending` 申請；通知管理員（待辦計數 + email，後端實作） |
| 4 | 管理員 | 「待分配代幣報名」列表 → 「分配代幣」→ 該學員分配頁 |
| 5 | 管理員 | `POST /api/admin/token-assignment/assign-to-class` 分配代幣並建立 `class_enrollments` |
| 6 | 系統 | 將對應 `enrollment_request` 標記為 `fulfilled`；寄送**報名確認信**至學生（見 §3.1） |

**不再使用**學生端 `POST /class-enrollments` 即時扣款（舊流程，已棄用）。

---

## 2. 規則

| 情境 | 所需代幣（供 admin 分配參考） |
| --- | --- |
| 報名單一堂 | `1 × token_cost` |
| 報名全期 | `total_lessons × token_cost` |

- 學生提交申請前須**已購買套票**（帳戶有代幣餘額 > 0），但**不扣款**。
- 管理員分配時從學生**未分配**代幣池扣除，並建立 `class_enrollments`。
- 同一用戶同一 `class_id` 不可重複 `status=enrolled`；pending 申請亦不可重複。

---

## 3. API

### `POST /api/class-enrollment-requests`（學生，需登入）

**Request:**

```json
{
  "class_id": "42",
  "lesson_count": 1,
  "enrollment_scope": "single_lesson",
  "tokens_required": 1
}
```

**成功 200:**

```json
{
  "success": true,
  "data": {
    "id": "er_123",
    "status": "pending",
    "class_id": "42",
    "lesson_count": 1,
    "tokens_required": 1
  }
}
```

**失敗:** `NO_TOKENS_PURCHASED` | `CLASS_FULL` | `ALREADY_ENROLLED` | `ALREADY_PENDING` | `CLASS_PAST` | `CLASS_CANCELLED`

### `GET /api/admin/enrollment-requests?status=pending`

管理員待處理列表。每筆含：`id`, `user_id`, `student_name`, `user_mobile`, `class_id`, `class_name`, `lesson_count`, `tokens_required`, `enrollment_scope`, `created_at`.

### `PATCH /api/admin/enrollment-requests/:id`

拒絕申請：
```json
{ "status": "rejected", "rejection_reason": "..." }
```

**更改報名課程／範圍**（管理員，不含 `status`）：
```json
{
  "class_id": "42",
  "lesson_count": 8,
  "enrollment_scope": "full_course",
  "tokens_required": 8
}
```

後端應依 `classes.total_lessons`、`classes.token_cost` 驗算 `tokens_required = lesson_count × token_cost`；若與請求不符可拒絕或覆寫。

或分配完成後由後端自動：`{ "status": "fulfilled" }`.

### `POST /api/admin/enrollment-requests/:id/send-insufficient-tokens-email`（Admin）

管理員手動通知學生代幣不足（寄至該學生帳戶 email）。

- Auth: Admin
- 後端依 `enrollment_request` 取得 `user_id`、課程名稱、`tokens_required`、學生可用未分配代幣等，寄出通知信
- 成功：`{ "success": true, "msg": "..." }`

### `GET /api/admin/pending-counts`

回傳新增欄位：

```json
{
  "pendingApplications": 0,
  "pendingTrials": 0,
  "pendingEnrollmentRequests": 0
}
```

### Admin 分配代幣（既有）

`POST /api/admin/token-assignment/assign-to-class` — 見 `API_SPECIFICATION.md`。  
分配成功且對應 pending request 存在時，後端應標記 request 為 `fulfilled`。

#### §3.1 報名確認信（`class_enrollment_confirmed`）

管理員分配代幣成功後，前端會在 **assign-to-class** 請求 body 附帶確認信欄位（學生有 email 時）。後端應依 `language` 寄信，**正文須列出已報讀的全部堂數**，每堂含：

- 堂次（`lesson_index`）
- 日期與時間範圍（建議使用 `date_time_formatted`；亦可由 `start_time` / `end_time` ISO 自行格式化）
- 若該堂因公眾假期順延，可顯示 `postponed_from`（原定日期）

**觸發條件：** `send_confirmation_email: true` 且 `confirmation_email_type: "class_enrollment_confirmed"`。

**Request 額外欄位（與 snake_case / camelCase 擇一接受即可）：**

```json
{
  "send_confirmation_email": true,
  "confirmation_email_type": "class_enrollment_confirmed",
  "language": "zh-TW",
  "student_name": "陳大文",
  "student_email": "student@example.com",
  "class_name": "兒童街舞初級",
  "class_id": "42",
  "lesson_count": 4,
  "tokens_assigned": 4,
  "enrollment_scope": "full_course",
  "class_code": "KID-DANCE-01",
  "instructor": "Amy",
  "branch": "kwun_tong",
  "branch_label": "觀塘",
  "lessons": [
    {
      "lesson_index": 1,
      "start_time": "2026-06-07T10:00:00.000Z",
      "end_time": "2026-06-07T11:00:00.000Z",
      "date_time_formatted": "2026年6月7日（週六）10:00 – 11:00"
    },
    {
      "lesson_index": 2,
      "start_time": "2026-06-14T10:00:00.000Z",
      "end_time": "2026-06-14T11:00:00.000Z",
      "date_time_formatted": "2026年6月14日（週六）10:00 – 11:00"
    }
  ]
}
```

- `lessons` 長度應等於本次分配的 `lesson_count` / `tokens_assigned`（與日曆排期邏輯一致，含假期順延）。
- 前端建構：`enrollmentConfirmedEmailPayload.ts` + `getEnrollmentLessonSlots()`（與學生報名預覽相同）。
- 勿僅顯示首堂；全期報名須列出每一堂。

### `GET /api/class-enrollments/me`

僅回傳**已分配代幣、已入班**的紀錄（`status=enrolled` 等）。pending 申請不回傳為已報名課程。

---

## 4. 前端

| 檔案 | 用途 |
| --- | --- |
| `ClassEnrollModal.tsx` | 學生提交報名申請 |
| `PendingEnrollmentRequestsPage.tsx` | 管理員待分配列表 |
| `TokenAssignmentPage.tsx` | 管理員分配代幣到課程 |
| `enrollmentConfirmedEmailPayload.ts` | 分配成功時附帶確認信課表 |
| `useAdminPendingCounts.ts` | 側欄／儀表板紅點 |

---

## 5. 後端待實作

- [ ] `POST /class-enrollment-requests` — insert pending，不扣 `user_tokens`
- [ ] `GET /admin/enrollment-requests` — 列表
- [ ] `PATCH /admin/enrollment-requests/:id` — reject / fulfill
- [ ] `pending-counts` 加入 `pendingEnrollmentRequests`
- [ ] 分配代幣成功時自動 fulfill 對應 request（可帶 `request_id` query）
- [ ] Email／站內通知：admin 新申請、學生分配完成／拒絕
- [ ] `assign-to-class`：讀取 §3.1 欄位並寄送 `class_enrollment_confirmed`（列出全部 `lessons`）
- [ ] 停用或拒絕學生端 `POST /class-enrollments` 即時扣款（若仍保留 endpoint）

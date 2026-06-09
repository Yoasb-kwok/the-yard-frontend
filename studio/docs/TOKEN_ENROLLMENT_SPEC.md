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

#### §3.2 管理員整期分配（多堂一次完成）— **後端必改**

學生端 `POST /class-enrollment-requests` 會拒絕 `CLASS_PAST`；**管理員**在「分配代幣」頁為**全期報名**扣款時，必須能分配到該課程系列中**已開始／已過去**的課堂列（`classes` 表中同 `program_code` 的每一行），否則前端逐堂呼叫時只會成功未來的第一堂，其餘回 `CLASS_PAST`（例如「已分配 1/7 堂」）。

**`POST /api/admin/token-assignment/assign-to-class` 建議行為：**

| 欄位 | 說明 |
| --- | --- |
| `enrollment_scope` | `"full_course"` 表示整期（非單堂） |
| `allow_past_lessons` | `true` 時**管理員**分配不套用 `CLASS_PAST`（僅此 endpoint + admin auth） |
| `lesson_class_ids` | 可選；同系列所有 `class_id` 陣列。若提供，後端應為每一 id 建立／更新 `class_enrollments` 並扣對應代幣 |
| `enrollment_request_id` | 可選；`quantity` 須等於申請的 `tokens_required` |
| `quantity` | 整期總代幣數（通常 = `lesson_class_ids.length × token_cost`） |

**建議實作（擇一或並存）：**

1. **單次請求（推薦）：** 當 `enrollment_scope=full_course` 且帶 `lesson_class_ids` + `quantity`，後端在同一 transaction 內為每個 `class_id` 入班並扣代幣，略過 `CLASS_PAST`（若 `allow_past_lessons=true`）。
2. **逐堂請求：** 若仍一次只處理一個 `class_id`，則當 `allow_past_lessons=true` 且為 admin 時，該堂 `start_time < now` 仍允許分配（學生自助報名仍維持 `CLASS_PAST`）。

**錯誤碼：** 學生自助報名保留 `CLASS_PAST`；管理員整期分配不應因已過期課堂而失敗。

**前端（已送出的 body）：** 整期分配時會附 `enrollment_scope`, `allow_past_lessons`, `lesson_class_ids`（見 `adminTokenAssignment.ts`）。後端部署前，行為不會改變。

#### §3.3 管理員移除已分配代幣（退回未分配池）— **後端必實作**

管理員在「分配代幣」頁的 **已分配** 分頁，可對**單一堂**移除代幣分配。前台呼叫後端後，代幣應**自動退回**該學員（或該子女 profile）的**未分配**餘額，並取消該堂入班紀錄。

**Endpoint：** `POST /api/admin/token-assignment/unassign-from-class`  
**Auth：** Admin

**Request（snake_case / camelCase 擇一接受）：**

```json
{
  "enrollment_id": "enr_abc",
  "user_id": 1,
  "class_id": 42,
  "student_profile_id": "profile-uuid",
  "remarks": "Admin removed token assignment: 兒童芭蕾 第3堂"
}
```

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `enrollment_id` | 是 | `class_enrollments.id`（該堂入班紀錄） |
| `user_id` | 是 | 帳戶 user id |
| `class_id` | 是 | 該堂 `classes.id`（與 enrollment 一致，供校驗） |
| `student_profile_id` | 多子女時建議 | 從該 profile 的已分配池退回 |
| `remarks` | 否 | 稽核／退幣紀錄備註 |

**成功 200：**

```json
{
  "success": true,
  "data": {
    "tokens_refunded": 1,
    "remaining_tokens": 6,
    "assigned_tokens": 2,
    "enrollment_request_id": "er_123",
    "enrollment_request_status": "pending"
  }
}
```

- `tokens_refunded`：本次退回代幣數（通常 = 該 enrollment 的 `tokens_charged`，或 `classes.token_cost`）。
- `remaining_tokens` / `assigned_tokens`：操作後該學員（或 profile）錢包快照，供前台更新餘額顯示。
- `enrollment_request_status`：若有关联報名申請且因移除而需改狀態，回傳 `pending`（見下方流程）。

**建議後端流程（同一 transaction）：**

1. **載入並鎖定** `class_enrollments`（`enrollment_id`），確認 `user_id`、`class_id` 與請求一致。
2. **校驗可移除：**
   - `tokens_charged`（或等價欄位）> 0，否則 `NOT_TOKEN_ASSIGNED`。
   - 若業務規定已點名／已出席不可退：當 `status` 為 `attended`（或已確認出席）→ `CANNOT_UNASSIGN_ATTENDED`（可改為允許管理員強制退，需與客戶確認）。
3. **退回代幣：**
   - `refund_qty = tokens_charged`（無則用 `classes.token_cost`，至少 1）。
   - 自該 user／`student_profile_id` 的**已分配**代幣扣減 `refund_qty`，**未分配**餘額加回 `refund_qty`（與 `assign-to-class` 相反）。
   - 不得使 `assigned_tokens < 0` 或 `remaining + assigned > total_tokens`。
4. **更新入班：**
   - 刪除該 `class_enrollments` 列，或設 `status=cancelled` / `refunded` 且 `tokens_charged=0`（學生端 `GET /class-enrollments/me`、`GET /student/upcoming-classes` 不得再顯示此堂）。
   - `classes.enrolled_count` 對該 `class_id` 減 1（若 assign 時有加）。
5. **關聯報名申請（可選但建議）：**
   - 若此 enrollment 來自 `enrollment_request` 且該 request 為 `fulfilled`：
     - 若該 request 下**已無任何**仍為「已分配代幣」的 enrollment → 將 request 改回 `pending`（或 `partially_assigned` 若支援部分完成）。
     - 若仍有其他堂已分配 → 維持 `fulfilled` 或改 `partially_assigned`。
   - 前台**不會**在移除單堂後自動 PATCH request；建議後端在 unassign 內一併處理。
6. **稽核（建議）：**
   - 寫入 `refund_records` 或 `token_ledger`：`kind=unassign`，`tokens_refunded=refund_qty`，`refunded_by`=admin，`remarks`。
   - 可選 audit log：`action=unassign_tokens_from_class`。
7. **提交 transaction**；失敗則全部回滾。

**錯誤碼（建議）：**

| code | 說明 |
| --- | --- |
| `ENROLLMENT_NOT_FOUND` | 找不到 enrollment 或 id／user／class 不一致 |
| `NOT_TOKEN_ASSIGNED` | 該堂從未分配代幣或已移除 |
| `CANNOT_UNASSIGN_ATTENDED` | 已出席／已點名，政策不允許退 |
| `PROFILE_MISMATCH` | `student_profile_id` 與 enrollment 不符 |

**與點名頁「退還代幣」的差異：**

| | `unassign-from-class` | `POST /admin/refund-records`（點名） |
| --- | --- | --- |
| 用途 | 取消該堂**入班＋分配**，代幣回未分配池 | 病假等退幣紀錄，可能仍保留 enrollment |
| 誰觸發 | 分配代幣頁「移除」 | 課堂點名／出席管理 |

**前端：** `adminTokenAssignment.ts` → `postAdminUnassignTokensFromClass`；`TokenAssignmentPage.tsx` 已分配列表「移除」按鈕。

### `GET /api/class-enrollments/me`

僅回傳**已分配代幣、已入班**的紀錄（`status=enrolled` 等）。pending 申請不回傳為已報名課程。

---

## 4. 前端

| 檔案 | 用途 |
| --- | --- |
| `ClassEnrollModal.tsx` | 學生提交報名申請 |
| `PendingEnrollmentRequestsPage.tsx` | 管理員待分配列表 |
| `TokenAssignmentPage.tsx` | 管理員分配／移除代幣到課程 |
| `adminTokenAssignment.ts` | `assign-to-class`、`unassign-from-class` |
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
- [ ] `assign-to-class`：§3.2 整期分配支援 `allow_past_lessons` + `lesson_class_ids`（管理員不受 `CLASS_PAST` 限制）
- [ ] `unassign-from-class`：§3.3 移除單堂分配、代幣退回未分配池、更新 enrollment／request 狀態
- [ ] 停用或拒絕學生端 `POST /class-enrollments` 即時扣款（若仍保留 endpoint）

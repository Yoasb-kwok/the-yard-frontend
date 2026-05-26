# Token ↔ Class Enrollment Spec

> 代幣與報名課堂：1 堂 = 1 代幣（可透過 `classes.token_cost` 調整每堂倍率）。  
> 報名 N 堂（或全期 N 堂）需扣除 N × `token_cost` 個代幣；餘額不足則拒絕報名。

---

## 1. 規則

| 情境 | 扣除代幣 |
| --- | --- |
| 報名單一堂（日曆選一堂） | `1 × token_cost`（預設 1） |
| 報名全期課程 | `total_lessons × token_cost`（例：8 堂 = 8 代幣） |

- 從學生**有效**套票（`user_tokens.balance > 0` 且未過期）扣除，優先扣**最早到期**的套票。
- 建立 `class_enrollments` 時寫入 `user_token_id`（主要扣款套票）與 `tokens_charged`。
- 同一用戶同一 `class_id` 不可重複 `status=enrolled`。

---

## 2. API

### `POST /api/class-enrollments`（學生，需登入）

**Request:**

```json
{
  "class_id": "42",
  "user_token_id": "ut_001",
  "lesson_count": 1,
  "enrollment_scope": "single_lesson"
}
```

| 欄位 | 說明 |
| --- | --- |
| `class_id` | 必填 |
| `user_token_id` | 選填；後端可自動選套票 |
| `lesson_count` | 預設 `1`；全期報名傳 `total_lessons` |
| `enrollment_scope` | `single_lesson` \| `full_course`（供日誌／email） |

**成功 200:**

```json
{
  "success": true,
  "data": {
    "id": "enr_123",
    "class_id": "42",
    "user_token_id": "ut_001",
    "tokens_charged": 1,
    "remaining_tokens": 10
  }
}
```

**失敗:**

| HTTP / code | 說明 |
| --- | --- |
| `INSUFFICIENT_TOKENS` | 代幣不足 |
| `CLASS_FULL` | 名額已滿 |
| `ALREADY_ENROLLED` | 已報名 |
| `CLASS_PAST` / `CLASS_CANCELLED` | 不可報名 |

### `GET /api/class-enrollments/me` / `GET /api/student/upcoming-classes`

學生已報名課程（含 `class` join）。

**日曆顯示堂數**必須用「已報名／已扣代幣」堂數，**不要**只回傳課程全期 `classes.total_lessons`（例如 16）當作學生要上的堂數。

| 欄位 | 說明 |
| --- | --- |
| `tokens_charged` | 報名時扣除的代幣（建議必填） |
| `lessons_remaining` | 尚餘可上堂數 |
| `lessons_used` / `attended_lessons` | 已上堂數 |
| `course_total_lessons` | 課程全期堂數（僅供參考） |
| `total_lessons` | 可與「已報名堂數」相同；前端亦會用 `lessons_remaining + lessons_used` 或 `tokens_charged ÷ token_cost` 計算 |

若只回 `total_lessons: 16` 而學生只買了 4 堂，日曆會錯誤顯示 16 堂。

### Admin 退還代幣

`POST /api/admin/refund-records` 帶 `enrollment_id`、`tokens_refunded` 時，後端應把代幣加回對應 `user_token`。

---

## 3. 前端

- `studio/src/lib/classEnrollmentTokens.ts` — 計算所需代幣
- `studio/src/components/student/ClassEnrollModal.tsx` — 報名確認（顯示餘額、全期選項）
- `studio/src/pages/public/CalendarPage.tsx` — 日曆「報名」按鈕
- Demo：`POST /class-enrollments` 於 `mock/router.ts`

---

## 4. 後端待實作（正式環境）

- [ ] `POST /class-enrollments` 在 transaction 內扣 `user_tokens.balance` 並 insert enrollment
- [ ] 回傳 `INSUFFICIENT_TOKENS` code
- [ ] `classes.token_cost` 欄位（預設 1）
- [ ] 退還／病假批准時加回代幣（與 refund-records 一致）

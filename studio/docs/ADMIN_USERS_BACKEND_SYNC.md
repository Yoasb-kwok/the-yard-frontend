# 用戶管理（Admin Users）— 後端同步清單

前端「用戶管理」已改為：**家長主帳戶一列 + 展開學員子表**。以下為後端需與之前端對齊的 API 與欄位。

---

## 1. `GET /api/admin/users`

每筆為**登入帳戶（家長 Master）**，需排除 `admin` / `instructor`。

### 建議回傳結構（每筆 user）

| 欄位 | 說明 |
|------|------|
| `id` | 用戶 ID |
| `email` | 登入電郵 |
| `username` / `nick_name` | 用戶名（可選） |
| `full_name` / `name` | 帳戶顯示名 |
| `student_id` / `account_number` | 帳戶編號 |
| `mobile` | 登入手機 |
| `parents_name` | 家長姓名（主帳戶） |
| `contact_number` | 聯絡電話 |
| `residential_district` | 居住地區（建議用 `districts.*` 的 **key**，如 `kwunTong`；中文區名前端會嘗試對應） |
| `created_at` | 加入時間（ISO 8601） |
| `has_trial_application` | 是否曾試堂（boolean，可選，前端亦會對照試堂列表） |
| `user_tokens` | `[{ id, remaining_tokens 或 balance, expiry_date 或 expires_at }]` |
| **`profiles`** | **學員子帳戶陣列（必填，若無子帳戶可 `[]`）** |

### `profiles[]` 每筆學員建議欄位

| 欄位 | 說明 |
|------|------|
| `id` | Profile UUID |
| `profile_kind` | `"student"`（家長聯絡人可 `"parent"`） |
| `full_name` | 學生姓名 |
| `student_id` | 學員編號（可選） |
| `date_of_birth` | `YYYY-MM-DD`（勿只放在 user 主表而 profiles 為空） |
| `sex` 或 `gender` | `true`/`false` 或 `male`/`female` 或 `1`/`0` |
| `id_last_four` / `id_card_last4` | 證件後 4 位 |
| `parents_name` | 家長姓名（可選） |
| `residential_district` | 居住地區 key |
| `nick_name`, `level`, `contact_number` | 可選 |

**常見問題：** 僅在 `users` 表有 `date_of_birth` / `sex`，但 `profiles` 未帶出 → 展開學員表會顯示空白。請在 JOIN profiles 時一併 SELECT，或保證 `profiles` 內有完整學員欄位。

前端亦接受別名：`student_profiles`、`birth_date`、`gender` 等（會正規化）。

---

## 2. `PATCH /api/admin/users/:id`

更新登入帳戶 + 學員子帳戶。

### Request body 範例

```json
{
  "email": "parent@example.com",
  "username": "parent01",
  "mobile": "91234567",
  "parents_name": "陳先生",
  "contact_number": "91234567",
  "residential_district": "shaTin",
  "role": "student",
  "student_profiles": [
    {
      "id": "profile-uuid-1",
      "full_name": "陳小明",
      "date_of_birth": "2014-05-12",
      "sex": false,
      "id_card_last4": "5678",
      "id_last_four": "5678"
    }
  ]
}
```

- `student_profiles`：依 `id` 更新對應 profile；後端需驗證 profile 屬於該 `user_id`。
- 更新家長 `residential_district` 時，建議同步寫入 `profile_kind=parent` 的 profile（若有）。

### Response

建議回傳更新後的 user，並含 `profiles[]`，與 GET 列表一致，方便前端刷新。

---

## 3. 其他既有端點（前端已使用）

| 方法 | 路徑 | 用途 |
|------|------|------|
| `DELETE` | `/api/admin/users/:id` | 刪除帳戶 |
| `PATCH` | `/api/admin/user-tokens/:id` | 編輯代幣到期日 |
| `GET` | `/api/admin/trial-applications` | 試堂申請（判斷「試堂申請」欄） |
| `GET` | `/api/admin/users/:userId/orders` | 購買紀錄 |
| `GET` | `/api/admin/users/:userId/class-enrollments` | 即將到來的課程 |

分配代幣頁、試堂確認信等見其他 spec 文件。

---

## 4. 居住地區 enum

與前台一致，建議 DB 存 **key**（見 `studio/src/lib/hkDistricts.ts`）：

`centralWestern`, `eastern`, `southern`, `wanChai`, `kowloonCity`, `kwunTong`, `shamShuiPo`, `wongTaiSin`, `yauTsimMong`, `islands`, `kwaiTsing`, `north`, `saiKung`, `shaTin`, `taiPo`, `tsuenWan`, `tuenMun`, `yuenLong`

---

## 5. 試堂確認信（另檔）

`PATCH /api/admin/trial-applications/:id` 狀態改為 `confirmed` 時發送確認信 → 見 `studio/docs/TRIAL_SIGNUP_EMAIL_SPEC.md` §12。

---

## 6. 代幣報名（另檔）

`POST /api/class-enrollments`、代幣扣減 → 見 `studio/docs/TOKEN_ENROLLMENT_SPEC.md`。

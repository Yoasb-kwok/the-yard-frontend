# Trial Application — Random Password + Email Delivery Spec

> 對象：後端開發者。  
> 目標：改造 `POST /api/trial-application`，讓未註冊用戶提交試堂時，
> 自動建立帳號，**用隨機臨時密碼**，並**透過 email 寄送**，而不是把密碼 render 在頁面上。
> 同時確保試堂記錄能在**學生 dashboard** 和 **admin 試堂管理頁**同時看到。

---

## 0. TL;DR（最小可行清單）

1. 把 `/api/trial-application` 目前用 DOB / 靜態密碼的邏輯改成「`crypto.randomBytes` 生成 12 字元密碼」。
2. `bcrypt` hash 後寫入 `users.password`，`users.must_change_password = 1`。
3. 用 nodemailer / SendGrid / SES 寄一封 email 給 `payload.email`，內容含臨時密碼 + 登入連結。
4. Response **移除** `temporaryPassword` 欄位（目前可能有），改為多加一個 `emailSent: boolean`。
5. 確保 `trial_applications.user_id` 指向新建（或已有）的帳號。
6. 確保 `GET /api/student/trial-applications` 用 JWT 的 `user_id` 去 filter。
7. 確保 `GET /api/admin/trial-applications` 會 join users 回 applicant name/email。

做完這七步，前端直接可以跑（前端已在 2026-04-17 的 PR 切好了）。

---

## 1. Flow 圖

```
[訪客表單]
   │  POST /api/trial-application
   ▼
[Backend]
   ├─ 1. 查 email 是否已存在於 users
   │
   ├─ 若存在：  
   │    a. 建 trial_applications row (user_id = 舊帳號)
   │    b. response.accountCreated = false, existingUser = true
   │    c. **不寄信**，不改密碼
   │
   └─ 若不存在：
        a. 生成 12 字元隨機臨時密碼
        b. bcrypt hash → 插入 users，must_change_password = 1
        c. 建 profiles（用表單資料）
        d. 建 trial_applications (user_id = 新帳號)
        e. 發 email（明碼密碼 + 登入連結）
        f. response.accountCreated = true, emailSent = true
```

---

## 2. 密碼生成要求

### 2.1 強度

- **長度 12 碼**（email 內讀起來不會太長，但 brute-force 也不可行）
- 字元集合：`A–Z`、`a–z`、`0–9`、常見符號（`!@#$%&*`）
- 至少包含 1 個大寫、1 個小寫、1 個數字、1 個符號
- 排除易混字元：`0/O`、`1/I/l`（用戶從 email 手動輸入時比較不會誤植）

### 2.2 建議 Node 實作

```ts
import crypto from 'crypto';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';      // 排除 I、O
const LOWER = 'abcdefghijkmnopqrstuvwxyz';      // 排除 l
const DIGIT = '23456789';                       // 排除 0、1
const SYMBOL = '!@#$%&*';

function pick(pool: string): string {
  const idx = crypto.randomInt(0, pool.length);
  return pool[idx];
}

export function generateTemporaryPassword(): string {
  const required = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SYMBOL)];
  const all = UPPER + LOWER + DIGIT + SYMBOL;
  const rest = Array.from({ length: 8 }, () => pick(all));
  const chars = [...required, ...rest];
  // Fisher–Yates shuffle with crypto randomness
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
```

### 2.3 儲存

- **DB 絕不儲存明碼**。
- `users.password` = `bcrypt.hash(plaintext, 10)`。
- **明碼只在記憶體中保留到 email 寄出為止**，寄出後立刻丟棄（不要 log、不要塞 response）。

---

## 3. Email 要求

### 3.1 寄件機制（擇一）

| 方案 | 適用 | 備註 |
| --- | --- | --- |
| nodemailer + Gmail SMTP | MVP / 內部測試 | 需開「應用程式密碼」；每日 500 封上限 |
| SendGrid | 正式上線 | 免費 100 封/日；需驗證寄件網域 |
| AWS SES | 正式上線（AWS EC2） | 最便宜；需驗證 domain；沙盒外要申請 |

### 3.2 Email 內容（繁中 / 英雙語，依 `Accept-Language` 或 payload 的 `language` 欄位選）

**Subject（繁中）**：`【The Yard】歡迎預約試堂 — 你的臨時密碼`  
**Subject（英）**：`Welcome to The Yard — Your temporary password`

**Body（繁中範例）**：

```
你好 {{fullName}}，

感謝你預約 The Yard 試堂！我們已為你建立帳號：

  登入信箱：{{email}}
  臨時密碼：{{password}}

請於首次登入後盡快更改密碼：
  {{frontendOrigin}}/login

首次登入後系統會自動帶你到「更改密碼」頁面。
如你未曾提交試堂申請，請忽略本信。

The Yard
```

**注意事項：**
- 一定要有 plain-text 版本（純文字），因為臨時密碼含符號，HTML 的字型可能 render 失真（例：`l` vs `1`）。
- 臨時密碼 **不要** 變成 clickable 連結或 inline button；就是純文字。
- 連結的 `frontendOrigin` 用 env（例：`FRONTEND_ORIGIN=https://theyard.com.hk`）。
- 別把明碼寫進 server log（`console.log` 也不行）。

### 3.3 寄信失敗處理

| 情境 | 建議做法 |
| --- | --- |
| SMTP timeout | 重試 2 次，每次間隔 1 秒；還失敗 → 回 `200 success=true, emailSent=false, msg: "Account created but email failed; please contact support"`；帳號保留、trial row 保留 |
| 無效 email 格式 | backend 做 RFC-5322 檢查；失敗 → 400 `"Invalid email"` |
| 所有其他錯誤 | 回 500；帳號視情況 rollback（建議 DB transaction：email 成功前不 commit，或至少要能自動刪除半建立的帳號） |

---

## 4. API 契約

### 4.1 `POST /api/trial-application`

**Request body**（public，毋須 token）：

```json
{
  "classId": "trial-3",
  "fullName": "陳小明",
  "email": "chan@example.com",

  "contactNumber": "85291234567",
  "countryCode": "852",
  "nickName": "小明",
  "dateOfBirth": "2015-05-01",
  "sex": true,
  "parentsName": "陳媽媽",
  "residentialDistrict": "kowloonCity",
  "hasJoinedCourses": false,
  "hasDanceExperience": false,
  "howDidYouHear": "instagram",
  "promoCode": ""
}
```

**Response 200 — 成功（新帳號）**：

```json
{
  "success": true,
  "data": {
    "applicationId": 42,
    "accountCreated": true,
    "existingUser": false,
    "emailSent": true
  }
}
```

> 或直接在頂層，只要前端能解析 `success/accountCreated/emailSent`；envelope 格式保持跟其他 endpoint 一致即可。

**Response 200 — 成功（已有帳號）**：

```json
{
  "success": true,
  "data": {
    "applicationId": 43,
    "accountCreated": false,
    "existingUser": true,
    "emailSent": false
  }
}
```

**Response 409 — email 已在登入系統但狀態衝突**：

```json
{ "success": false, "msg": "Email is already registered." }
```

> 實際上本 API 設計就是「email 已存在就直接 append 新 trial」，不會 409。409 保留給 race condition / 欄位衝突等例外。

**Response 400 — 資料驗證失敗**：

```json
{ "success": false, "msg": "fullName is required" }
```

**Response 500 — 後端錯誤**：

```json
{ "success": false, "msg": "Internal server error" }
```

### 4.2 ★ 絕不再回傳 `temporaryPassword`

前端已移除相關 UI（`trial-success` 畫面不會再 render 密碼）。即使後端回傳也會被忽略。
為了避免密碼從 API log / 瀏覽器 DevTools 外洩，請後端**主動刪除**：

```ts
// ❌ 錯
res.json({ success: true, data: { applicationId, temporaryPassword: plaintext } });

// ✅ 對
res.json({ success: true, data: { applicationId, accountCreated: true, emailSent: true } });
```

---

## 5. 試堂記錄必須同步顯示

### 5.1 Student 端：`GET /api/student/trial-applications`

- **Auth**：必須 Bearer token；後端從 JWT 拿 `user_id`。
- **過濾**：`SELECT * FROM trial_applications WHERE user_id = :jwtUserId`。
- **排序**：`applied_at DESC`。
- **回傳**：

```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "class_name": "兒童芭蕾試堂",
      "status": "pending",
      "applied_date": "2026-04-17T10:00:00Z",
      "preferred_datetime": "2026-04-20T16:00:00Z",
      "assigned_class_name": null
    }
  ]
}
```

> 前端 `DashboardPage.tsx` 已接好此 endpoint，欄位名稱照本段。

### 5.2 Admin 端：`GET /api/admin/trial-applications`

- **Auth**：Bearer token + `role === 'admin'`。
- **關聯 join**：

```sql
SELECT ta.*,
       u.email  AS applicant_email,
       p.full_name AS applicant_name,
       p.contact_number AS applicant_phone,
       p.residential_district
FROM trial_applications ta
LEFT JOIN users u    ON u.id = ta.user_id
LEFT JOIN profiles p ON p.user_id = ta.user_id
ORDER BY ta.applied_at DESC;
```

- **回傳格式**：見現有 admin 端程式碼 `TrialApplicationsPage.tsx` 的 `TrialApplication` interface；主要欄位：
  - `id`, `applicant_name`, `applicant_email`, `applicant_phone`
  - `residential_district`
  - `trial_class`, `preferred_datetime`
  - `status` — `pending | assigned | cancelled | could_not_assign | confirmed | contacted | attended_trial | converted`
  - `assigned_class_id`, `assigned_class_name`, `assigned_lessons`, `class_total_lessons`
  - `notes`, `applied_at`, `updated_at`, `trial_date`

### 5.3 FK 關鍵：`trial_applications.user_id NOT NULL`

目前可能有舊資料 `user_id IS NULL`（匿名提交）。新流程要求：

```sql
ALTER TABLE trial_applications
  MODIFY user_id INT NOT NULL;
-- 如果有歷史 NULL row，先把它們 link 到一個「legacy guest」帳號或直接清掉。
```

若暫時做不到 NOT NULL，至少新寫入的 row 一定要有 `user_id`，否則 student dashboard 永遠看不到自己的申請。

---

## 6. DB Migration 清單

```sql
-- 1. users 表：加 must_change_password（如果還沒有）
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) NOT NULL DEFAULT 0;

-- 2. trial_applications 表：user_id 要存在且盡量 NOT NULL
-- （如上一節）

-- 3. （選配）加一欄方便 debug
ALTER TABLE trial_applications
  ADD COLUMN IF NOT EXISTS how_did_you_hear VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS promo_code VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS has_dance_experience TINYINT(1) NULL;
```

---

## 7. 首次登入強制改密碼

前端已有邏輯：登入成功後若 `must_change_password === 1` → 立刻導去改密碼頁。
後端需要：

1. **Login response** 回傳 `must_change_password` 欄位（從 `users` 表讀）。
2. **Change password endpoint**（`POST /api/profiles/change-password` 或類似）成功後，把 `must_change_password = 0`。

如果這塊還沒做，改密碼 UI 會變裝飾 —— 請一併確認。

---

## 8. 驗收清單

### Backend
- [ ] `generateTemporaryPassword()` 單測：連跑 1000 次都滿足字元要求、每次都不同
- [ ] DB：bcrypt hash 正確（`bcrypt.compare(plaintext, stored) === true`）
- [ ] DB：新帳號 `must_change_password = 1`
- [ ] DB：`trial_applications.user_id` 指向剛建的帳號
- [ ] Email：收到 email，明碼密碼可讀（單獨測試 `l/1/0/O` 易混字處理）
- [ ] Email：HTML + plain-text 兩版都有
- [ ] Response：**不含** `temporaryPassword`；含 `accountCreated`、`existingUser`、`emailSent`
- [ ] `/api/student/trial-applications` 可以讀到剛提交的 row（用新密碼登入後）
- [ ] `/api/admin/trial-applications` 可以讀到該 row，`applicant_email` 正確

### Frontend（已完成 — 僅供驗證參考）
- [x] 成功畫面不顯示密碼
- [x] 改顯示「密碼已寄到 {{email}}」
- [x] 已移除 DOB-based / `Demo123!` fallback
- [x] 已登入用戶提交 → 自動回 `/dashboard` 看到新 trial row

### 端對端
- [ ] 訪客流程：填表 → 收信 → 登入 → 自動跳改密碼 → 改完 → `/dashboard` 看到 trial
- [ ] 已註冊用戶流程：填表（用已註冊的 email）→ 不收信 → 登入 → `/dashboard` 多一筆 trial
- [ ] Admin 流程：admin 登入 → `/admin/trial-applications` 看到該訪客的 trial，資料齊全

---

## 9. 安全 / 隱私

- 臨時密碼 **只在記憶體中存在到 email 寄出為止**。
- 絕不 log 臨時密碼。
- Rate limit：同一 email 地址 24 小時內最多 3 次提交，避免被人用來騷擾他人信箱。
- Rate limit：同一 IP 1 小時最多 10 次提交。
- CAPTCHA / honeypot：建議在 `/api/trial-application` 前面加 Cloudflare Turnstile 或 reCAPTCHA v3（可列 Phase 2）。

---

## 10. 與前端的介面總結

| Field | Type | 由誰填 | 備註 |
| --- | --- | --- | --- |
| `classId` | string | Frontend | 目前前端丟的是 `"trial-3"` 這種字串；後端可自行 mapping 到 class_id INT 或另建 demo row |
| `fullName`, `email` | string | Frontend | 必填 |
| 其他 profile 欄位 | mixed | Frontend | 選填；後端進 profiles |
| `accountCreated` | boolean | Backend | 新帳號就是 true |
| `existingUser` | boolean | Backend | email 已存在於 users 就是 true |
| `emailSent` | boolean | Backend | 新帳號且 email 寄成功就是 true；寄失敗 = false（帳號仍建立） |
| `applicationId` | number | Backend | `trial_applications.id` |
| `temporaryPassword` | (removed) | — | ★ 不再存在於 response |

---

## 11. 前端相關檔案（僅供後端 code review 時對照）

- `studio/src/pages/public/TrialPage.tsx` — 表單 + 成功畫面（**不再顯示密碼**）
- `studio/src/lib/trialApplyFlow.ts` — 端點常數 + flow 註解
- `studio/src/pages/admin/TrialApplicationsPage.tsx` — admin 管理頁
- `studio/src/pages/student/DashboardPage.tsx` — 學生 dashboard 的「我的試堂申請」區塊

---

若任何 field name 需要調整（例：`accountCreated` → `isNewAccount`），請在這份文件留 comment，前端會用最少改動的方式跟上。

---

## 12. Admin 確認試堂 — 寄給申請人的 Email

當 admin 在試堂管理頁將狀態改為 **已確認**（`confirmed`）並儲存時，前端會對  
`PATCH /api/admin/trial-applications/:id` 附帶 `sendConfirmationEmail: true` 與下列欄位。  
**後端必須在狀態由非 `confirmed` → `confirmed` 時寄信**，且 email 內文須包含申請人需要知道的完整試堂資料（不可只寫「已確認」）。

### 12.1 Request（PATCH body 額外欄位）

| 欄位 | 說明 |
| --- | --- |
| `sendConfirmationEmail` | `true` |
| `confirmationEmailType` | `trial_application_confirmed` |
| `language` | `zh-TW` \| `zh-CN` \| `en` |
| `applicant_name` | 申請人姓名 |
| `applicant_email` | 收件 email |
| `applicant_phone` / `contact_number` | 聯絡電話（建議兩者擇一顯示即可） |
| `trial_class` | 試堂／課程名稱 |
| `course_code` | 課程代碼（如有） |
| `preferred_datetime` / `class_datetime` | ISO 8601 課程日期時間 |
| `class_datetime_formatted` | 已格式化的日期時間字串（依 `language`） |
| `branch` | 分店 key（例 `sanpokong`） |
| `branch_label` | 分店顯示名稱（例「新蒲崗」） |
| `assigned_class_id` | 已分配班別 id（如有） |
| `assigned_class_name` | 已分配班別名稱（如有） |

後端亦可從 DB join `profiles`、`classes` 補齊；若 PATCH 已帶齊欄位，**優先使用 PATCH 值**（與 admin 畫面一致）。

### 12.2 Email 必須包含的內容

- 申請人姓名  
- **聯絡電話**（確認信內可寫「我們記錄的聯絡電話：…」，方便申請人核對）  
- **課程名稱**（`trial_class` 或 `assigned_class_name`）  
- **課程日期及時間**（使用 `class_datetime_formatted`，或自行由 `class_datetime` 格式化）  
- **分店**（使用 `branch_label`，或依 `branch` key 翻譯）  
- 課程代碼（如有）  
- 登入連結（查看試堂狀態）  
- 簡短提醒：請準時到達、如需改期請聯絡中心  

### 12.3 Subject / Body 範例（繁中）

**Subject**：`【The Yard】試堂已確認 — {{trial_class}}`

**Body（plain-text 範例）**：

```
你好 {{applicant_name}}，

你的試堂申請已確認，詳情如下：

  課程：{{trial_class}}
  課程代碼：{{course_code}}
  日期及時間：{{class_datetime_formatted}}
  分店：{{branch_label}}
  聯絡電話：{{applicant_phone}}

請準時到達。如需改期或查詢，請聯絡我們或登入查看：
  {{frontendOrigin}}/dashboard

The Yard
```

### 12.4 Response

建議在 PATCH 成功 response 加上：

```json
{
  "success": true,
  "data": { "...updated row..." },
  "confirmationEmailSent": true
}
```

寄信失敗時：`confirmationEmailSent: false`，狀態仍可更新，並在 `msg` 提示 admin。

### 12.5 前端實作

- `studio/src/pages/admin/TrialApplicationsPage.tsx` — 儲存時組 payload  
- `studio/src/lib/trialConfirmedEmailPayload.ts` — 欄位組裝 helper  

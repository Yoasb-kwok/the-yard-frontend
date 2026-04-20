# Terms / Privacy / FAQ 頁面 CMS — 後端交接規格

> 前端已完成三個新後台編輯頁：
> - `/admin/terms` — 條款與細則（rich text）
> - `/admin/privacy` — 私隱政策（rich text）
> - `/admin/faq` — 常見問題（Q&A 清單 + 標題/簡介，支援增刪改排序）
>
> 對應公開頁：`/terms`、`/privacy`、`/faq`。
>
> **架構原則：每個頁面一張專用 table，不要再把所有內容塞進 `site_content.content` 的 JSON blob。** 目前 DB 只有一張 `site_content`，這份文件說明要**新增哪幾張 table**、開哪幾個 API，讓後台 CRUD 真的是資料表層級的 CRUD，而不是每次讀寫都要 parse 一整坨 JSON。
>
> 跟之前 Contact 規格同一個 pattern（見 `CONTACT_PAGE_CMS_SPEC.md`）。

---

## 0. TL;DR

| # | 事項 | 阻塞前端？ |
|---|---|---|
| 1 | 新增 3 張 table：`terms_page`、`privacy_page`、`faq_page` + `faq_items`（§2） | 是 |
| 2 | 開 §3 列的公開 + admin endpoints | 是 |
| 3 | `/api/admin/*` 加 Bearer + `role=admin` 檢查（慣例） | 是 |
| 4 | Express `express.json({ limit: '10mb' })`（rich text HTML + 可能 inline 圖） | 是 |
| 5 | （選做）`site_content` 內 `terms`、`privacy`、`faq` row 之後可以 drop | 否 |

---

## 1. 需求概述

### 1.1 Terms & Privacy（單例頁）

- **只會有一筆 row**（整個頁面就一份內容）。
- 後台編輯頁：一個標題 input + 一個 rich text editor。
- 前端儲存內容 = HTML 字串（由 Quill 產生）。

### 1.2 FAQ（列表頁）

- 頁面本身有 `title` + `intro`（單例）。
- 下面接一個 **Q&A 清單**：可以新增、刪除、改題目、改答案、**上下調整順序**、切換是否公開。
- 這正是為什麼 FAQ **必須**拆 `faq_items` 表：CRUD 每一題、`display_order` 排序、`is_active` 控制顯示，全部在 JSON blob 裡做會非常麻煩且容易 race condition。

---

## 2. 資料庫 Schema（請新增）

### 2.1 Terms（單例）

```sql
CREATE TABLE terms_page (
  id           INT PRIMARY KEY DEFAULT 1,
  title        VARCHAR(255) NOT NULL DEFAULT '',
  content_html LONGTEXT     NOT NULL,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT terms_page_singleton CHECK (id = 1)
);

INSERT INTO terms_page (id, title, content_html)
VALUES (1, '', '')
ON DUPLICATE KEY UPDATE id = id;
```

### 2.2 Privacy（單例）

```sql
CREATE TABLE privacy_page (
  id           INT PRIMARY KEY DEFAULT 1,
  title        VARCHAR(255) NOT NULL DEFAULT '',
  content_html LONGTEXT     NOT NULL,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT privacy_page_singleton CHECK (id = 1)
);

INSERT INTO privacy_page (id, title, content_html)
VALUES (1, '', '')
ON DUPLICATE KEY UPDATE id = id;
```

### 2.3 FAQ（一張單例 + 一張 items）

```sql
-- 頁面設定（標題 / 簡介），只會有一筆
CREATE TABLE faq_page (
  id         INT PRIMARY KEY DEFAULT 1,
  title      VARCHAR(255) NOT NULL DEFAULT '',
  intro      TEXT         NOT NULL DEFAULT '',
  updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT faq_page_singleton CHECK (id = 1)
);

INSERT INTO faq_page (id) VALUES (1) ON DUPLICATE KEY UPDATE id = id;

-- 每一題 Q&A 一筆 row
CREATE TABLE faq_items (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  question      TEXT         NOT NULL,          -- 純文字
  answer_html   LONGTEXT     NOT NULL,          -- rich text HTML
  display_order INT          NOT NULL DEFAULT 0,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_faq_display (is_active, display_order, id)
);
```

---

## 3. API Endpoints

### 3.1 Terms

```http
GET   /api/terms                        # 公開
GET   /api/admin/terms                  # Admin
PATCH /api/admin/terms                  # Admin：更新
```

**Body / Response shape**

`PATCH /api/admin/terms`

```jsonc
// Request body
{
  "title": "Terms and Conditions",
  "content_html": "<h2>A. Rental Guideline</h2><p>...</p>"
}
```

`GET /api/terms`

```jsonc
{
  "success": true,
  "data": {
    "title": "Terms and Conditions",
    "content_html": "<h2>A. Rental Guideline</h2><p>...</p>",
    "updated_at": "2026-04-17T10:23:00Z"
  }
}
```

空狀態（沒存過）：回 `title: ""`, `content_html: ""`，前端會自動 fallback 到語系檔。

### 3.2 Privacy

結構跟 Terms **完全一樣**，把路徑換成 `/api/privacy` 跟 `/api/admin/privacy`：

```http
GET   /api/privacy
GET   /api/admin/privacy
PATCH /api/admin/privacy
```

### 3.3 FAQ — 頁面設定

```http
GET   /api/admin/faq/settings           # { title, intro }
PATCH /api/admin/faq/settings           # body: { title?, intro? }
```

### 3.4 FAQ — Items CRUD

```http
# Admin：列出所有題目（含 is_active = 0）
GET    /api/admin/faq/items
#   → { success, data: [{ id, question, answer_html, display_order, is_active, created_at, updated_at }, ...] }

# Admin：新增一題
POST   /api/admin/faq/items
#   body: {
#     "question": "What is the minimum rental period?",
#     "answer_html": "<p>The minimum rental period is 1 hour.</p>",
#     "is_active": true,          // optional，default true
#     "display_order": 0           // optional，不填就放最後
#   }
#   → { success, data: { id, ... } }

# Admin：更新單題（部分欄位）
PATCH  /api/admin/faq/items/:id
#   body: 任意欄位組合 { question?, answer_html?, is_active?, display_order? }
#   → { success, data: { id, ... } }

# Admin：刪除
DELETE /api/admin/faq/items/:id
#   → { success: true }

# Admin：一次性重新排序（強烈建議有；否則前端每移一格就要 PATCH N 筆）
POST   /api/admin/faq/items/reorder
#   body: { "order": [itemId1, itemId2, itemId3, ...] }
#   後端用 single transaction 把每個 id 的 display_order 設為 index（0..n-1）
#   → { success: true }
```

### 3.5 FAQ — 公開頁

```http
GET /api/faq
```

回**頁面設定 + 所有啟用的 items（依 display_order 排序）**，前端一次拿完：

```jsonc
{
  "success": true,
  "data": {
    "title": "Frequently Asked Questions",
    "intro": "Find answers to common questions...",
    "items": [
      {
        "id": 3,
        "question": "What is the minimum rental period?",
        "answer_html": "<p>The minimum rental period is 1 hour.</p>",
        "display_order": 0
      },
      {
        "id": 7,
        "question": "How far in advance can I book?",
        "answer_html": "<p>We only accept bookings within 3 months.</p>",
        "display_order": 1
      }
    ]
  }
}
```

公開 endpoint **只回** `is_active = 1` 的 items，並按 `(display_order ASC, id ASC)` 排序。

---

## 4. 共通規則

### 4.1 Auth

- `/api/admin/*` 全部必須驗 Bearer token 且 `role = admin`。
- 公開 `GET /api/terms`、`/api/privacy`、`/api/faq` 不需登入。

### 4.2 Response 統一格式

成功：

```json
{ "success": true, "data": { ... } }
```

失敗：

```json
{ "success": false, "msg": "Human readable error" }
```

### 4.3 常見錯誤碼

| Case | Status | Body |
|---|---|---|
| 未登入 / token 失效 | 401 | `{ success: false, msg: "Unauthorized" }` |
| 非 admin | 403 | `{ success: false, msg: "Forbidden" }` |
| 找不到 item | 404 | `{ success: false, msg: "Item not found" }` |
| Body 欄位缺失 / 型別錯 | 400 | `{ success: false, msg: "Validation error: question is required" }` |
| 伺服器內部錯 | 500 | `{ success: false, msg: "..." }` |

### 4.4 Rich text 欄位

`content_html`（Terms / Privacy）跟 `answer_html`（FAQ）都是由 Quill 編輯器產生的 HTML，**後端不要做 sanitize 或 normalize**，原字串存、原字串回。前端 Quill toolbar 只開：

- `<p>`, `<br>`
- `<h2>`, `<h3>`
- `<strong>`, `<em>`, `<u>`
- `<ul>`, `<ol>`, `<li>`
- `<a href target rel>`

若後端仍想做輸入端 sanitize，請用 allowlist 保留以上 tag/attr，**不要**把 `<a target="_blank" rel="noopener">` 的 attr 砍掉。

### 4.5 體積限制

- Rich text HTML 可能大於 `TEXT` 的 64 KB（Terms 現況已經 ~6 KB，未來加圖片 base64 就會爆），所以所有 rich text 欄位都用 `LONGTEXT`。
- Express `express.json({ limit: '10mb' })`。

### 4.6 邊際情況

| 情況 | 期望行為 |
|---|---|
| `terms_page` / `privacy_page` / `faq_page` 沒有 row | 回 `{ success: true, data: { title: "", ... } }`（初始化 migration 就該 seed，但保險起見 GET 也要 graceful） |
| `PATCH` body 完全空 | 400 或直接 no-op（by design 選一個），不要回 500 |
| `display_order` 重複 | 允許；public GET 用 `(display_order ASC, id ASC)` 排序 |
| `DELETE` 不存在的 id | 回 404 |
| `reorder` body 裡少了部分 id | 回 400 `{ msg: "order must contain exactly all item ids" }`，或視為只排序傳入的 ids（擇一，請告知前端） |

---

## 5. 前端送出範例（方便後端 Postman 測）

### 5.1 Terms

```http
PATCH /api/admin/terms
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "title": "條款與細則",
  "content_html": "<h2>A. 租借守則</h2><p>如有興趣，請致電或 WhatsApp 聯絡我們。</p><p>最短租借時段為 <strong>1 小時</strong>。</p>"
}
```

### 5.2 FAQ — 新增一題

```http
POST /api/admin/faq/items
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "question": "可以穿高跟鞋嗎？",
  "answer_html": "<p>由於地板限制，我們<strong>不接受</strong>高跟鞋舞蹈，如造成損壞需支付 HKD 500 清潔費。</p>",
  "is_active": true
}
```

### 5.3 FAQ — 拖放排序

```http
POST /api/admin/faq/items/reorder
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "order": [7, 3, 12, 5, 1]
}
```

伺服器端：

```sql
START TRANSACTION;
UPDATE faq_items SET display_order = 0 WHERE id = 7;
UPDATE faq_items SET display_order = 1 WHERE id = 3;
UPDATE faq_items SET display_order = 2 WHERE id = 12;
UPDATE faq_items SET display_order = 3 WHERE id = 5;
UPDATE faq_items SET display_order = 4 WHERE id = 1;
COMMIT;
```

---

## 6. 跟現有 `site_content` 的關係

目前 DB 已經有 `site_content` 這張表（用在 `home-about`、`contact`），規格為 `{ page_key, title, content }`。

處置方式：

- **新內容走新表**：Terms、Privacy、FAQ 做完就用 §2 的新 table。
- **`site_content` 保留給現有的 `home-about`**（關於我們）。Contact 那張本來就要按 `CONTACT_PAGE_CMS_SPEC.md` 拆掉，請一並規劃。
- **不要**在 `site_content` 額外塞 `terms` / `privacy` / `faq` 的 row。如果之前有 seed 這三個 key，可以在新 migration 一併 DROP。

---

## 7. 前端現況 & 切換計劃

前端現有兩個 lib 處理這三頁的讀寫：

| 檔案 | 現在在做什麼 | 後端做完後要改什麼 |
|---|---|---|
| `studio/src/lib/sitePageContent.ts` | `loadSimpleSitePage(key)` 打 `GET /site-content/:key`；`saveSimpleSitePage(key, data)` 打 `PATCH /admin/site-content/:key` | 改成 `loadTermsPage()` → `GET /api/terms`、`loadPrivacyPage()` → `GET /api/privacy`（或乾脆合成一個 generic helper with base path） |
| `studio/src/lib/faqContent.ts` | `loadFaqContent()` 打 `GET /site-content/faq`，把 `content` 欄當 JSON parse；`saveFaqContent(full)` 把整個物件 serialize 後 PATCH 回去 | 改成 `GET /api/faq` 拿陣列、分別對 `POST/PATCH/DELETE /api/admin/faq/items`、`POST .../reorder`、`PATCH /api/admin/faq/settings` |

**UI 不會動。** 上面三個 admin 頁 / 三個公開頁都只是換 API 來源。前端估計一個 PR 約 1–1.5 小時即可切完。

---

## 8. 合作節奏

1. **後端（本週）**：跑 §2 migration、實作 §3 endpoints、補 §4 錯誤處理 → 通知前端「可以測了」。
2. **前端（後端就緒後 1 天）**：改 `sitePageContent.ts` + `faqContent.ts`，QA 三頁 → 上線。
3. **清理（前端切換上線後）**：後端 drop `site_content` 裡已不再使用的 row（如 `terms`、`privacy`、`faq`，如果之前有 seed）。

---

## 9. 驗收 Checklist（給後端勾）

### DB
- [ ] `terms_page` 已建、已 seed 一筆 `id = 1`
- [ ] `privacy_page` 已建、已 seed 一筆 `id = 1`
- [ ] `faq_page` 已建、已 seed 一筆 `id = 1`
- [ ] `faq_items` 已建，附 `idx_faq_display (is_active, display_order, id)`
- [ ] 所有 rich text 欄為 `LONGTEXT`

### 公開 API（未登入可呼叫）
- [ ] `GET /api/terms` 回 `{ title, content_html, updated_at }`
- [ ] `GET /api/privacy` 同上
- [ ] `GET /api/faq` 回 `{ title, intro, items: [...] }`，items 已依 `(display_order ASC, id ASC)` 排序且只含 `is_active = 1`

### Admin API（Bearer + role=admin）
- [ ] `GET/PATCH /api/admin/terms`
- [ ] `GET/PATCH /api/admin/privacy`
- [ ] `GET/PATCH /api/admin/faq/settings`
- [ ] `GET /api/admin/faq/items`（**含** `is_active = 0`）
- [ ] `POST /api/admin/faq/items`（回新建 id）
- [ ] `PATCH /api/admin/faq/items/:id`（部分更新）
- [ ] `DELETE /api/admin/faq/items/:id`
- [ ] `POST /api/admin/faq/items/reorder`（single transaction）

### 其他
- [ ] Express `json` body limit ≥ 10 MB
- [ ] 未登入打 admin endpoint 回 401；登入但非 admin 回 403
- [ ] 50 KB 的 `content_html` 可以正常存／讀回（不被截斷、不被 normalize）

---

**有任何欄位命名要調（例如想叫 `body_html` 而非 `content_html`），請在此文件留 comment，前端會對齊。**

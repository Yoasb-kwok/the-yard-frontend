# Contact Us 頁面 CMS — 後端交接規格

> 前端已完成 `/admin/contact`（後台編輯頁）與 `/contact`（公開頁）的 UI，支援**多分店 (branch) 卡片**。本文件交給後端同事，說明需要怎樣建 table 與開放 API。
>
> **架構原則：每個內容類型一個專用 table，不再把所有頁面塞進 `site_content` 的 JSON blob 裡。**
> 本次要新增：`contact_page`（單例設定）＋ `contact_branches`（多分店）。
> FAQ、News 同樣原則，請見文末第 9 節。

---

## 1. 需求概述

一間跳舞學校可能有多間分校。後台要可以新增／編輯／刪除／排序每一間分校；每個分校是一張卡片，顯示：

| 欄位 | 說明 |
| --- | --- |
| 分店名稱 (`name`) | e.g. `"新蒲崗總校"` |
| 地址 (`address`) | 可多行 |
| 開放時間 (`hours`) | 可多行 |
| 分店照片 (`image_url`) | HTTPS URL（推薦）或 base64 data URL，可為空 |
| Google 地圖 (`map_query`) | Google Maps embed URL、分享連結、或純文字地址（三擇一） |
| 顯示順序 (`display_order`) | int，越小越前 |
| 是否啟用 (`is_active`) | boolean；`false` 時前端公開頁不顯示 |

另外頁面本身有兩個可編輯欄位（單例）：

| 欄位 | 說明 |
| --- | --- |
| 頁面標題 (`title`) | 空字串時前端會用 i18n 預設 |
| 介紹文字 (`intro`) | 可空 |

---

## 2. 資料庫 Schema

### 2.1 `contact_page`（頁面設定，單一 row）

```sql
CREATE TABLE contact_page (
  id           INT PRIMARY KEY DEFAULT 1,              -- 只會有一筆 row
  title        VARCHAR(255) NOT NULL DEFAULT '',
  intro        TEXT         NOT NULL DEFAULT '',
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT contact_page_singleton CHECK (id = 1)
);

-- 初始化一筆空 row（id=1）
INSERT INTO contact_page (id) VALUES (1) ON DUPLICATE KEY UPDATE id = id;
```

> 用 `id = 1` 強制單例，後端只會 `SELECT * WHERE id = 1` 或 `UPDATE WHERE id = 1`。

### 2.2 `contact_branches`（分店列表）

```sql
CREATE TABLE contact_branches (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(255) NOT NULL DEFAULT '',
  address        TEXT         NOT NULL DEFAULT '',
  hours          TEXT         NOT NULL DEFAULT '',
  image_url      TEXT         DEFAULT NULL,   -- HTTPS URL or null（避免 base64 太肥，推薦走 uploads endpoint）
  map_query      TEXT         NOT NULL DEFAULT '',
  display_order  INT          NOT NULL DEFAULT 0,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contact_branches_order (display_order, id)
);
```

> 如果後端是用 Google Sheet：分兩個 sheet，`contact_page` 只有一行，`contact_branches` 每間一行即可。

---

## 3. API Endpoints 列表

> 回應格式沿用現有慣例：
> - 成功：`{ "success": true, "data": ... }`
> - 失敗：`{ "success": false, "msg": "..." }`
> - HTTP code：200 / 201 / 400 / 401 / 404 / 500
>
> 所有 `/api/admin/*` 都需要 admin token（Bearer authentication）。

### 3.1 公開頁：一次拿齊

```
GET /api/contact
```

**Response 200**

```json
{
  "success": true,
  "data": {
    "title": "聯絡我們",
    "intro": "歡迎透過以下分店聯絡我們",
    "branches": [
      {
        "id": 1,
        "name": "新蒲崗總校",
        "address": "九龍新蒲崗六合街21號Trium Lab七樓",
        "hours": "Mon–Fri 4pm–11pm\nSat, Sun & PH 12nn–11pm",
        "image_url": "https://cdn.theyard.com.hk/branches/1.jpg",
        "map_query": "21 Luk Hop Street, San Po Kong",
        "display_order": 0
      }
    ]
  }
}
```

**行為：**
- 只回傳 `is_active = 1` 的分店。
- 按 `display_order ASC, id ASC` 排序。
- `contact_page` row 不存在時，`title` 和 `intro` 回空字串（前端會用 i18n fallback）。

---

### 3.2 Admin：頁面設定（單例）

#### `GET /api/admin/contact/settings`

**Response 200**

```json
{
  "success": true,
  "data": {
    "title": "聯絡我們",
    "intro": "歡迎透過以下分店聯絡我們",
    "updated_at": "2026-04-17T10:00:00Z"
  }
}
```

#### `PATCH /api/admin/contact/settings`

**Request Body**

```json
{
  "title": "聯絡我們",
  "intro": "歡迎透過以下分店聯絡我們"
}
```

- 兩個欄位都是選填（partial update）；只傳其中一個時，另一個欄位保持原值。
- 找不到 row 時 upsert（insert id=1）。

**Response 200**

```json
{ "success": true, "data": { "title": "...", "intro": "..." } }
```

---

### 3.3 Admin：分店 CRUD

#### `GET /api/admin/contact/branches`

列出所有分店（含停用的），按 `display_order ASC, id ASC` 排序。

**Response 200**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "新蒲崗總校",
      "address": "...",
      "hours": "...",
      "image_url": "https://cdn.theyard.com.hk/branches/1.jpg",
      "map_query": "...",
      "display_order": 0,
      "is_active": true,
      "created_at": "2026-04-17T10:00:00Z",
      "updated_at": "2026-04-17T10:00:00Z"
    }
  ]
}
```

#### `POST /api/admin/contact/branches`

**Request Body**

```json
{
  "name": "分校二",
  "address": "...",
  "hours": "...",
  "image_url": "https://cdn.theyard.com.hk/branches/2.jpg",
  "map_query": "...",
  "display_order": 1,
  "is_active": true
}
```

- 所有欄位都是選填（除了 `name` 或全部都空的情況，建議後端允許存入空值，交由前端校驗）。
- 若未傳 `display_order`，後端自動放到最後（`MAX(display_order) + 1`）。
- 若未傳 `is_active`，預設 `true`。

**Response 201**

```json
{ "success": true, "data": { "id": 2, /* ...新 row 完整欄位... */ } }
```

#### `GET /api/admin/contact/branches/:id`

**Response 200**
```json
{ "success": true, "data": { "id": 2, /* ... */ } }
```

**Response 404**
```json
{ "success": false, "msg": "Branch not found" }
```

#### `PATCH /api/admin/contact/branches/:id`

Partial update，只會改動傳入的欄位。

**Request Body（全部欄位皆選填）**

```json
{
  "name": "新蒲崗總校（更新）",
  "is_active": false
}
```

**Response 200**
```json
{ "success": true, "data": { "id": 1, /* 更新後完整欄位 */ } }
```

#### `DELETE /api/admin/contact/branches/:id`

**Response 200**
```json
{ "success": true, "data": {} }
```

#### `POST /api/admin/contact/branches/reorder`

批次改動 `display_order`，方便前端「拖拉排序」或「上移/下移」時一次寫入。

**Request Body**

```json
{
  "order": [
    { "id": 3, "display_order": 0 },
    { "id": 1, "display_order": 1 },
    { "id": 2, "display_order": 2 }
  ]
}
```

**Response 200**

```json
{ "success": true, "data": {} }
```

> 如果後端覺得這個 endpoint 多餘，也可以讓前端多次呼叫 `PATCH /api/admin/contact/branches/:id`。但若有 5+ 間分店，批次版會比較有效率。

---

### 3.4 Admin：圖片上載（新增，強烈推薦）

如果不提供這個 endpoint，前端只能把圖片存成 base64 data URL 塞進 DB，會出現：

- 單張 3 MB 圖 ≈ base64 後 4 MB，5 間分校就有 20 MB JSON body；
- 觸發 413 Payload Too Large（之前已經遇過）；
- DB row 肥大，query 慢。

**建議做法：**

```
POST /api/admin/uploads
Authorization: Bearer <admin token>
Content-Type: multipart/form-data

Fields:
  file: <binary>         # required
  purpose: "contact"     # optional，讓後端分資料夾
```

**Response 201**

```json
{
  "success": true,
  "data": {
    "url": "https://cdn.theyard.com.hk/uploads/contact/2026/04/xxx.jpg",
    "mime": "image/jpeg",
    "size": 123456
  }
}
```

前端會把 `url` 直接存入 `contact_branches.image_url`。圖片本身放在：

- S3 / R2 / Cloudinary / Google Drive public folder，或
- 後端本地 `public/uploads/` 資料夾（開發期可用）。

**若暫時做不到**：前端可繼續用 base64，只要確保：

- `image_url` 欄位是 `LONGTEXT`（MySQL）或無長度上限（PostgreSQL `TEXT`）。
- Node body limit ≥ 20 MB：`app.use(express.json({ limit: '20mb' }))`。
- CORS 允許 `PATCH`、`POST` 及 `Authorization` header。

---

## 4. 驗收清單

### DB
- [ ] 建立 `contact_page` table（單例）並插入 `id = 1` 預設 row。
- [ ] 建立 `contact_branches` table，加上 `(display_order, id)` index。

### Public API
- [ ] `GET /api/contact` — 回傳 page 設定 + 啟用中的分店列表，排序正確。

### Admin API
- [ ] `GET /api/admin/contact/settings`
- [ ] `PATCH /api/admin/contact/settings`（partial update + upsert）
- [ ] `GET /api/admin/contact/branches`
- [ ] `POST /api/admin/contact/branches`（`display_order` 預設為 `MAX+1`）
- [ ] `GET /api/admin/contact/branches/:id`
- [ ] `PATCH /api/admin/contact/branches/:id`（partial update）
- [ ] `DELETE /api/admin/contact/branches/:id`
- [ ] `POST /api/admin/contact/branches/reorder`
- [ ] 所有 admin endpoint 驗證 Bearer token。
- [ ] 回傳格式一律 `{ success, data/msg }`。
- [ ] CORS 允許 `GET/POST/PATCH/DELETE` + `Authorization`。

### 圖片
- [ ] 提供 `POST /api/admin/uploads`（推薦），或
- [ ] 確認 `image_url` 欄位為 `LONGTEXT` 且 body size limit ≥ 20 MB（備用方案）。

---

## 5. 完整例子：新增一間分店的 flow

1. 前端按「上載分店照片」
   ```
   POST /api/admin/uploads
   → { "success": true, "data": { "url": "https://cdn.../xxx.jpg" } }
   ```

2. 前端按「儲存」
   ```
   POST /api/admin/contact/branches
   Body: {
     "name": "分校二",
     "address": "...",
     "hours": "...",
     "image_url": "https://cdn.../xxx.jpg",
     "map_query": "https://www.google.com/maps/embed?...",
     "display_order": 1,
     "is_active": true
   }
   → { "success": true, "data": { "id": 2, ... } }
   ```

3. 公開頁
   ```
   GET /api/contact
   → { "success": true, "data": { "title": "...", "intro": "...", "branches": [...] } }
   ```

---

## 6. 邊際情況（請後端注意）

| 情況 | 期望行為 |
| --- | --- |
| `contact_page` 沒有 row | `GET /api/contact` 回 `title: ""`, `intro: ""`。 |
| 所有分店都是 `is_active = 0` | `GET /api/contact` 回 `branches: []`。 |
| 更新不存在的 branch id | 回 404 `{ success: false, msg: "Branch not found" }`。 |
| `PATCH` body 完全空 | 回 400，或直接無動作（by design 選一個）。 |
| `display_order` 重複 | 允許，前端用 `(display_order ASC, id ASC)` 排序處理。 |
| 極長的 `address`/`hours` | 後端不截斷；由前端 CSS `whitespace: pre-line` 處理換行。 |

---

## 7. 安全

- 所有 `/api/admin/*` 必須驗證 Bearer token，且 token 的 role 為 `admin`。
- `image_url` 若接受 HTTPS URL：建議後端做輕量 URL 格式檢查（`^https?://`），避免被塞 `javascript:` 等危險值。前端會顯示於 `<img src>`，因此必須是 HTTP(S) URL 或 `data:image/...` data URL。
- `map_query` 會被前端用於組 Google Maps embed URL，前端有做 host whitelist（`*.google.*`），後端直接存字串即可。

---

## 8. 前端現況

- `studio/src/lib/contactContent.ts` — 現在走的是舊版（`site_content` JSON blob），後端接好新 API 後，前端會改成呼叫 `/api/contact`, `/api/admin/contact/*`。
- `studio/src/pages/admin/AdminContactPage.tsx` — 後台 UI 已做好，切換 API 時改動量不大。
- `studio/src/pages/public/ContactPage.tsx` — 公開頁，會跟著 `contactContent.ts` 換 API。

> **建議合作節奏：** 後端先按本文做好 DB + API，告訴前端「可以測了」，前端一個 PR 把 `contactContent.ts` 切過去（約 1 小時工），然後上線。

---

## 9. 同款 Pattern 套用到 FAQ / Latest News

為保持架構一致，其他動態頁面也拆 table，**不要再塞進 `site_content`**。簡化 schema 如下（供後端規劃用）：

### 9.1 FAQ

```sql
CREATE TABLE faq_page (
  id INT PRIMARY KEY DEFAULT 1,
  title VARCHAR(255) NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT faq_page_singleton CHECK (id = 1)
);

CREATE TABLE faq_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE faq_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NULL,                         -- FK → faq_categories.id（可為 NULL）
  question TEXT NOT NULL,
  answer_html TEXT NOT NULL,                    -- 允許 rich text
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_faq_order (category_id, display_order, id)
);
```

建議 endpoints（參考 Contact）：

- `GET /api/faq` — 公開，回 `{ title, intro, categories: [...], items: [...] }`
- `GET|POST /api/admin/faq/categories`, `PATCH|DELETE /api/admin/faq/categories/:id`
- `GET|POST /api/admin/faq/items`, `PATCH|DELETE /api/admin/faq/items/:id`
- `POST /api/admin/faq/items/reorder`
- `GET|PATCH /api/admin/faq/settings`

### 9.2 Latest News

News 一般已經有類似 CMS 的需求（圖片、作者、發佈日期、草稿）：

```sql
CREATE TABLE news_articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(191) NOT NULL UNIQUE,            -- URL 用
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL DEFAULT '',             -- 摘要，列表用
  cover_image_url TEXT NULL,
  body_html LONGTEXT NOT NULL,                  -- rich text
  author VARCHAR(255) DEFAULT '',
  published_at TIMESTAMP NULL,                  -- NULL = 草稿；有值 = 已發佈
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_news_published (published_at DESC)
);

-- 多語系（可選）
CREATE TABLE news_translations (
  article_id INT NOT NULL,
  locale VARCHAR(10) NOT NULL,                  -- 'en' | 'zh-TW' | 'zh-CN'
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body_html LONGTEXT NOT NULL,
  PRIMARY KEY (article_id, locale),
  FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE
);
```

建議 endpoints：

- `GET /api/news?page=&pageSize=` — 公開，只回 `published_at IS NOT NULL AND is_active = 1 AND published_at <= NOW()`，按 `published_at DESC`
- `GET /api/news/:slug` — 公開，單篇
- `GET|POST /api/admin/news`（含草稿與已停用）
- `GET /api/admin/news/:id`
- `PATCH|DELETE /api/admin/news/:id`
- `POST /api/admin/news/:id/publish`（把 `published_at` 設為 now）
- `POST /api/admin/news/:id/unpublish`（`published_at = NULL`）

> FAQ / News 本文件只做 schema 預告，實作時再另出正式規格。目前請先完成第 2–6 節的 Contact 部分。

---

## 10. 相關前端檔案（供後端參考）

- `studio/src/lib/contactContent.ts` — 資料型別定義、API client（API 換新後會更新）。
- `studio/src/pages/admin/AdminContactPage.tsx` — 後台編輯頁。
- `studio/src/pages/public/ContactPage.tsx` — 公開頁。

有問題直接聯絡前端。

— Jason / Frontend

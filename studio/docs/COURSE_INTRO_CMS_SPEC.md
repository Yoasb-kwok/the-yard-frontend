# 課堂介紹 CMS — 後端交接規格

> 前端 `/admin/course-intro` 與公開 `/courses`（課程介紹）已改為**只走 API**，不再使用 `localStorage`。
>
> 架構與 Contact / News 相同：專用 table + REST CRUD。

---

## 1. 資料表

```sql
CREATE TABLE course_intros (
  id                      INT PRIMARY KEY AUTO_INCREMENT,
  class_code              VARCHAR(64) NOT NULL,
  name_zh_tw              VARCHAR(255) NOT NULL DEFAULT '',
  name_zh_cn              VARCHAR(255) NOT NULL DEFAULT '',
  name_en                 VARCHAR(255) NOT NULL DEFAULT '',
  intro_zh_tw             TEXT         NOT NULL,
  intro_zh_cn             TEXT         NOT NULL DEFAULT '',
  intro_en                TEXT         NOT NULL DEFAULT '',
  trial_class_name_zh_tw  VARCHAR(255) NOT NULL DEFAULT '',
  trial_class_name_zh_cn  VARCHAR(255) NOT NULL DEFAULT '',
  trial_class_name_en     VARCHAR(255) NOT NULL DEFAULT '',
  display_order           INT          NOT NULL DEFAULT 0,
  is_active               TINYINT(1)   NOT NULL DEFAULT 1,
  created_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_course_intros_class_code (class_code),
  INDEX idx_course_intros_active (is_active, display_order)
);
```

- `class_code` = 課程 program code（與 `classes.class_code` / `courses.program_code` 對應）。
- 刪除列 = `DELETE` 整筆 row，前台不再顯示該課程的自訂介紹（仍可依班表顯示預設課程聚合，若 classes 仍有該 code）。

---

## 2. API

### 公開

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/course-intros` | 只回 `is_active = 1`，依 `display_order`, `id` 排序 |

Success:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "class_code": "BALLET-JR",
      "name_zh_tw": "兒童芭蕾",
      "name_zh_cn": "",
      "name_en": "Kids Ballet",
      "intro_zh_tw": "……",
      "intro_zh_cn": "",
      "intro_en": "",
      "trial_class_name_zh_tw": "兒童芭蕾試堂",
      "trial_class_name_zh_cn": "",
      "trial_class_name_en": "",
      "display_order": 0,
      "is_active": 1,
      "updated_at": "2026-06-01T12:00:00.000Z"
    }
  ]
}
```

### 管理員（Bearer + admin）

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/admin/course-intros` | 全部列（含 `is_active = 0`） |
| POST | `/api/admin/course-intros` | 新增 |
| GET | `/api/admin/course-intros/:id` | 單筆（選用） |
| PATCH | `/api/admin/course-intros/:id` | 部分更新 |
| DELETE | `/api/admin/course-intros/:id` | **整筆刪除** |

POST / PATCH body（欄位皆可選，POST 時 `class_code` 必填）：

```json
{
  "class_code": "BALLET-JR",
  "name_zh_tw": "兒童芭蕾",
  "name_zh_cn": "",
  "name_en": "Kids Ballet",
  "intro_zh_tw": "課程簡介……",
  "intro_zh_cn": "",
  "intro_en": "",
  "trial_class_name_zh_tw": "試堂名稱",
  "trial_class_name_zh_cn": "",
  "trial_class_name_en": "",
  "is_active": true,
  "display_order": 0
}
```

錯誤：

- `409` — `class_code` 重複（POST）
- `404` — id 不存在

---

## 3. 與課程列表的關係

- 前台 `GET /api/courses?fromClasses=1`（或 `/api/classes`）提供**班表聚合**（導師、地點、試堂時段等）。
- **公開課程介紹頁只顯示** `GET /api/course-intros` 回傳且 `is_active = 1` 的 `class_code`；與班表交集後才出現卡片與「預約試堂」。
- 後台 `DELETE` 某筆 `course_intros` 後，該 `class_code` **必須從前台列表消失**（即使班表仍有課堂）。
- CMS 覆寫 `name`、`intro`、`trial_class_name`（三語欄位）。
- 後台列表**只顯示** `course_intros` 表內的列；「新增」時從班表取得可選 `class_code`（尚未建立 CMS 的 code）。

---

## 4. 前端檔案

| 檔案 | 職責 |
|------|------|
| `studio/src/lib/courseIntroApi.ts` | API client、型別、語系解析 |
| `studio/src/pages/admin/AdminCourseIntroPage.tsx` | 後台 CRUD |
| `studio/src/pages/public/CoursesPage.tsx` | `GET /course-intros` 合併顯示 |

舊 key `the_yard_course_intros`（localStorage）已棄用，前端啟動時會清除。

---

## 5. 後端 checklist

- [ ] 建立 `course_intros` table
- [ ] `GET /api/course-intros`（active only）
- [ ] `GET|POST /api/admin/course-intros`
- [ ] `PATCH|DELETE /api/admin/course-intros/:id`
- [ ] Admin 路由 Bearer + `is_admin`
- [ ] `express.json` 足夠大（intro 為 TEXT）

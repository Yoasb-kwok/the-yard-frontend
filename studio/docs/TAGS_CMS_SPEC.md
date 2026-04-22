# Class Tag Catalog — Backend Spec

Scope: a small generic CMS for admin-editable dimensions that describe a
class. There are **two** admin-managed resources:

1. **Tag types** (標籤主題) — the dimensions themselves, e.g. 程度 / 年齡 /
   課程分類 / 舞種. Admin can add new types, rename labels, reorder, or
   retire types via the UI; no code change or DB migration needed.
2. **Tags** (標籤) — the individual values inside a type, e.g. `entry`,
   `intermediate`, `advanced` inside the `level` type.

Phase 1 ships with three **system** types pre-seeded (`level`, `age`,
`category`) that cannot be deleted — they can only be renamed or
deactivated. Any type the admin creates after that is a regular user-made
type and is fully deletable (as long as nothing references it).

---

## 0. Backend update checklist (delta from previous spec)

> Read this first. If the previous version of this spec was already
> implemented (single `class_tags` table, 3 hardcoded types), the items
> below are the **incremental** work required to support admin-managed
> tag types.

### 0.1 Database migration (required)

One-off migration to run **before** deploying the new endpoints:

```sql
-- File: database/migrations/20260417_add_class_tag_types.sql

-- 1) New table for admin-managed tag types
CREATE TABLE IF NOT EXISTS class_tag_types (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(32)   NOT NULL,
  label_zh_tw   VARCHAR(128)  NOT NULL,
  label_zh_cn   VARCHAR(128)  NULL,
  label_en      VARCHAR(128)  NULL,
  sort_order    INT           NOT NULL DEFAULT 0,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  is_system     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_class_tag_types_code (code),
  KEY        ix_class_tag_types_order (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Seed the three built-ins (idempotent)
INSERT IGNORE INTO class_tag_types
  (code, label_zh_tw, label_zh_cn, label_en, sort_order, is_active, is_system)
VALUES
  ('level',    '程度',     '程度',     'Level',    1, 1, 1),
  ('age',      '年齡',     '年龄',     'Age',      2, 1, 1),
  ('category', '課程分類', '课程分类', 'Category', 3, 1, 1);

-- 3) (Optional sanity check) Any class_tags.type values not in class_tag_types?
--    Run manually after migration; should return 0 rows.
-- SELECT DISTINCT t.type FROM class_tags t
--   LEFT JOIN class_tag_types tt ON tt.code = t.type
--   WHERE tt.id IS NULL;
```

No change to the existing `class_tags` table.

### 0.2 New endpoints to implement

All under admin auth (existing admin bearer middleware). Response envelope
`{ success, msg?, data? }` as usual.

| Method | Path                                | Purpose                                       |
|--------|-------------------------------------|-----------------------------------------------|
| GET    | `/api/tag-types`                    | Public — list active tag types (see §2.1)     |
| GET    | `/api/admin/tag-types`              | Admin — list all tag types                    |
| POST   | `/api/admin/tag-types`              | Admin — create a user-defined type            |
| PATCH  | `/api/admin/tag-types/:id`          | Admin — edit label / code / sort / active     |
| DELETE | `/api/admin/tag-types/:id`          | Admin — delete (400 if system, 409 if in use) |
| POST   | `/api/admin/tag-types/reorder`      | Admin — bulk reorder (see §2.2)               |

Full request/response shapes: see §2.1–§2.2 below.

### 0.3 Existing tag endpoints — behaviour changes

The `/api/tags`, `/api/admin/tags`, `/api/admin/tags/*` endpoints
themselves keep the **same URL + body**, but some assumptions change:

1. **Remove any hardcoded whitelist** of `type ∈ {level, age, category}`.
   Allowed values are now "any row in `class_tag_types.code`". Load that
   list from DB at request time (or cache with a short TTL).

2. **`GET /api/tags` (no `type` param)** must return keys dynamically —
   one key per active type code, not a fixed three-key object. Example:

   ```jsonc
   { "success": true,
     "data": { "level": [...], "age": [...], "category": [...], "dance_style": [...] } }
   ```

3. **`POST /api/admin/tags` validation**: reject with 400 "Unknown tag
   type" if `body.type` has no matching row in `class_tag_types` (active
   OR inactive — admin may pre-populate an inactive type).

4. **`PATCH /api/admin/tags/:id`**: `type` remains immutable (unchanged
   from previous spec).

### 0.4 Tag-type rename → cascade

When `PATCH /api/admin/tag-types/:id { code: 'new' }` is called for a
row whose current `code = 'old'`, do the rename **and** the cascade in
the same transaction:

```sql
START TRANSACTION;
  UPDATE class_tag_types SET code = :new WHERE id = :id;
  UPDATE class_tags      SET type = :new WHERE type = :old;
COMMIT;
```

Unique-key conflict (`ux_class_tag_types_code`) → roll back and return
400 "Tag type with this code already exists".

### 0.5 Delete guards for tag types

`DELETE /api/admin/tag-types/:id`:

1. Load the row. If `is_system = 1` → `400 { msg: "Cannot delete a system tag type" }`.
2. Count `SELECT COUNT(*) FROM class_tags WHERE type = :code`.
   - `> 0` → `409 { msg: "Tag type has N tags; delete tags first" }` (frontend
     renders this as a hint to deactivate instead).
   - `= 0` → hard delete the row, return `200 { data: { deleted: true } }`.

`is_system` is a write-protected flag: ignore it on any POST/PATCH
bodies; new rows always default to `is_system = 0`.

### 0.6 Reorder endpoints (unchanged pattern)

Both reorder endpoints accept `{ order: [id, id, ...] }` (and `{ type, order }`
for tags) and assign `sort_order = index + 1` to each id inside a
transaction. See §2.2 and §2.4.

### 0.7 Acceptance (copy-paste curls)

After deploy, run these against your local backend. `$ADMIN` = a valid
admin JWT.

```bash
# 1. Seeded built-ins present + is_system=1
curl -s -H "Authorization: Bearer $ADMIN" \
  http://localhost:3002/api/admin/tag-types | python3 -m json.tool

# 2. Create a user-made type
curl -s -X POST -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"code":"dance_style","label_zh_tw":"舞種","label_zh_cn":"舞种","label_en":"Dance Style"}' \
  http://localhost:3002/api/admin/tag-types | python3 -m json.tool
# → { success:true, data:{ id: <N>, is_system:false, ... } }

# 3. Public list shows it
curl -s http://localhost:3002/api/tag-types | python3 -m json.tool

# 4. Create a tag under it (arbitrary type must be accepted now)
curl -s -X POST -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"type":"dance_style","code":"ballet","label_zh_tw":"芭蕾","label_zh_cn":"芭蕾","label_en":"Ballet"}' \
  http://localhost:3002/api/admin/tags | python3 -m json.tool

# 5. Unknown type is rejected
curl -s -X POST -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"type":"does_not_exist","code":"x","label_zh_tw":"X"}' \
  http://localhost:3002/api/admin/tags
# → 400 Unknown tag type

# 6. Delete a system type is rejected
curl -s -X DELETE -H "Authorization: Bearer $ADMIN" \
  http://localhost:3002/api/admin/tag-types/1
# → 400 Cannot delete a system tag type

# 7. Delete a user type with tags under it is rejected with 409
curl -s -X DELETE -H "Authorization: Bearer $ADMIN" \
  http://localhost:3002/api/admin/tag-types/<dance_style_id>
# → 409 Tag type has 1 tags; delete tags first

# 8. Rename cascade: rename dance_style → style
curl -s -X PATCH -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"code":"style"}' \
  http://localhost:3002/api/admin/tag-types/<dance_style_id> | python3 -m json.tool
# Then confirm cascade:
curl -s -H "Authorization: Bearer $ADMIN" \
  "http://localhost:3002/api/admin/tags?type=style" | python3 -m json.tool
# → returns the ballet row
```

### 0.8 Frontend files already wired

No further frontend work required for Phase 1 admin UI **and** Phase 2A
consumption (admin class form + public calendar filter):

- `studio/src/lib/tagCatalog.ts` — API client for both tag types and tags.
- `studio/src/lib/useClassTags.ts` — React hook that loads
  `/api/tag-types` + `/api/tags` (active rows only) once per page-load,
  cached at the module level. Exposes `tagsByType`, `getTagLabel`,
  `getTypeLabel`, and `refetch`. Built-in **safe fallback** to the
  shipped seed values if the backend is unreachable, so consumers never
  break during a partial deploy.
- `studio/src/pages/admin/AdminTagsPage.tsx` — tabbed UI + "Manage types"
  modal. Tabs are fully dynamic, driven by `GET /api/admin/tag-types`.
  Calls `invalidateClassTagsCache()` after every successful save so
  other pages pick up the new tags on their next mount.
- `studio/src/pages/admin/ClassesPage.tsx` — the **新增/編輯班別** form's
  "程度" (level) `<select>` is now populated from
  `tagsByType.level`. Adding a new level tag in 標籤管理 immediately
  appears as an option here.
- `studio/src/pages/public/CalendarPage.tsx` — the 課程表/日曆 filter
  chips for **程度 / 年齡 / 課程分類** are now generated from
  `tagsByType.level / age / category`, with localized labels and a
  hash-based color for any admin-created codes outside the seed list.
  The level/age chip on each lesson card likewise uses the CMS label
  with a graceful fallback.
- i18n keys added for zh-TW / zh-CN / en (`admin.tags.*`,
  `admin.classes.levelManagedByTags`).

Nothing else breaks if the backend ships the above — the page falls back
to the seeded values if `GET /api/tag-types` 404s.

### 0.9 Phase 2 follow-ups still on the frontend backlog

- `studio/src/lib/coursesData.ts` still ships hardcoded `LEVELS`,
  `AGE_TAGS`, `COURSE_TYPES` constants used by demo / fallback courses
  and a few legacy filters. These can keep their current values (they
  match the seed) but should eventually be replaced with `useClassTags`
  in the remaining places that import them — currently
  `CoursesPage.tsx` (course-intro filters) and the demo course generator.
- `studio/src/contexts/AuthContext.tsx` still defines `CourseLevel` and
  `AgeTag` as string-literal unions. These are accepted by the type
  system as `string` super-types in our new code, but tightening to
  `string` everywhere would make admin-created codes (e.g. a new
  "professional" level) fully type-safe.
- For admin-created tag types beyond level/age/category (e.g.
  `dance_style`), the `classes` table still has nowhere to store the
  selection. Suggested model: the `class_tag_values (class_id, tag_id)`
  pivot in §3, plus a multi-select widget in `ClassesPage`'s class
  form. This is gated on backend Phase 2 work.

---

## 1. Database

### 1.1 `class_tag_types` (admin-managed list of types)

```sql
CREATE TABLE class_tag_types (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(32)   NOT NULL,        -- stable slug used as class_tags.type, e.g. 'level'
  label_zh_tw   VARCHAR(128)  NOT NULL,
  label_zh_cn   VARCHAR(128)  NULL,            -- falls back to zh_tw if empty
  label_en      VARCHAR(128)  NULL,            -- falls back to zh_tw if empty
  sort_order    INT           NOT NULL DEFAULT 0,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  is_system     TINYINT(1)    NOT NULL DEFAULT 0,  -- 1 = built-in, cannot be deleted; label/order still editable
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_class_tag_types_code (code),
  KEY        ix_class_tag_types_order (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO class_tag_types (code, label_zh_tw, label_zh_cn, label_en, sort_order, is_active, is_system) VALUES
  ('level',    '程度',      '程度',      'Level',    1, 1, 1),
  ('age',      '年齡',      '年龄',      'Age',      2, 1, 1),
  ('category', '課程分類',  '课程分类',  'Category', 3, 1, 1);
```

### 1.2 `class_tags` (admin-managed values inside a type)

```sql
CREATE TABLE class_tags (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type          VARCHAR(32)   NOT NULL,        -- references class_tag_types.code (not a hard FK — see §3)
  code          VARCHAR(64)   NOT NULL,        -- stable slug used by classes.level, classes.age_tag, etc.
  label_zh_tw   VARCHAR(128)  NOT NULL,
  label_zh_cn   VARCHAR(128)  NULL,            -- falls back to zh_tw if empty
  label_en      VARCHAR(128)  NULL,            -- falls back to zh_tw if empty
  sort_order    INT           NOT NULL DEFAULT 0,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_class_tags_type_code (type, code),
  KEY        ix_class_tags_type_order (type, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 1.3 Seed tags (backwards-compatible with current hardcoded values)

```sql
INSERT INTO class_tags (type, code, label_zh_tw, label_zh_cn, label_en, sort_order, is_active) VALUES
  ('level',    'entry',        '入門',      '入门',      'Entry',          1, 1),
  ('level',    'intermediate', '中級',      '中级',      'Intermediate',   2, 1),
  ('level',    'advanced',     '高級',      '高级',      'Advanced',       3, 1),
  ('age',      '5-8',          '5-8 歲',    '5-8 岁',    'Age 5-8',        1, 1),
  ('age',      '9-12',         '9-12 歲',   '9-12 岁',   'Age 9-12',       2, 1),
  ('age',      '13-16',        '13-16 歲',  '13-16 岁',  'Age 13-16',      3, 1),
  ('category', 'regular',      '常規班',    '常规班',    'Regular Term',   1, 1),
  ('category', 'summer',       '暑假班',    '暑假班',    'Summer Term',    2, 1),
  ('category', 'short_term',   '短期班',    '短期班',    'Short Course',   3, 1),
  ('category', 'workshop',     '工作坊',    '工作坊',    'Workshop',       4, 1);
```

### 1.4 Referential integrity (no hard FK)

We intentionally do **not** add a SQL FK from `class_tags.type` to
`class_tag_types.code` because:

- `code` is user-editable and FKs on a text column complicate rename
  cascades.
- The admin API enforces the relationship in application code (see §2
  and §3). On any `class_tags` insert/update, backend validates that a
  matching `class_tag_types` row exists (it may be inactive).

## 2. Endpoints

All admin endpoints require admin bearer token. All responses use the
shared `{ success: boolean, msg?: string, data?: ... }` envelope.

### 2.1 Tag types — public

`GET /api/tag-types`

- Returns only `is_active = 1`, sorted by `sort_order ASC, id ASC`.
- Intended for public filters that want to iterate every tag dimension.

```jsonc
{
  "success": true,
  "data": [
    { "id": 1, "code": "level",    "label_zh_tw": "程度",     "label_zh_cn": "程度",     "label_en": "Level",    "sort_order": 1, "is_system": true },
    { "id": 2, "code": "age",      "label_zh_tw": "年齡",     "label_zh_cn": "年龄",     "label_en": "Age",      "sort_order": 2, "is_system": true },
    { "id": 3, "code": "category", "label_zh_tw": "課程分類", "label_zh_cn": "课程分类", "label_en": "Category", "sort_order": 3, "is_system": true }
  ]
}
```

### 2.2 Tag types — admin

`GET /api/admin/tag-types`

- Returns **all** rows (active + inactive), sorted by `sort_order ASC, id
  ASC`. Each row includes `is_system` so the frontend can disable the
  Delete button on built-ins.

`POST /api/admin/tag-types`

```jsonc
// body
{
  "code":        "dance_style",
  "label_zh_tw": "舞種",
  "label_zh_cn": "舞种",         // optional
  "label_en":    "Dance Style",  // optional
  "sort_order":  4,              // optional; defaults to MAX(sort_order) + 1
  "is_active":   true            // optional; defaults to true
}
// 200 { "success": true, "data": { "id": 4, "is_system": false, ... } }
// 400 { "success": false, "msg": "Tag type with this code already exists" }
```

Validation:

- `code` required, matches `^[a-z][a-z0-9_\-]*$` (lowercase letter first,
  then digits / `_` / `-`), length ≤ 32, unique.
- `label_zh_tw` required, length ≤ 128.
- `is_system` is **not** settable via the API — always defaults to
  `false` for user-created rows.

`PATCH /api/admin/tag-types/:id`

```jsonc
// body (any subset)
{
  "code":        "dance_style",
  "label_zh_tw": "舞種",
  "label_zh_cn": "舞种",
  "label_en":    "Dance Style",
  "sort_order":  2,
  "is_active":   true
}
// 200 { "success": true, "data": { /* full row incl. is_system */ } }
```

Notes:

- Changing `code` is allowed but requires cascading: the backend must
  update `class_tags.type = :new_code WHERE type = :old_code` in the
  same transaction.
- `is_system` cannot be toggled via PATCH. Attempting to send it is
  silently ignored.

`DELETE /api/admin/tag-types/:id`

```
200 { "success": true, "data": { "deleted": true } }
400 { "success": false, "msg": "Cannot delete a system tag type" }       // is_system = 1
409 { "success": false, "msg": "Tag type has 5 tags; delete tags first" } // any class_tags referencing it
```

Behaviour:

- Built-in types (`level`, `age`, `category` — `is_system = 1`) are
  protected: return 400.
- For user-created types, hard delete only if no `class_tags` row
  references it. Otherwise 409 — admin must delete or reassign the
  child tags first (the frontend can present this as "deactivate
  instead").

`POST /api/admin/tag-types/reorder`

```jsonc
// body
{ "order": [3, 1, 4, 2] }
// 200 { "success": true, "data": { "updated": 4 } }
```

Updates `sort_order = index + 1` for each id in `order`. The frontend
always sends the full list.

### 2.3 Tags — public (for dropdowns / filters)

`GET /api/tags?type=:code`

- Returns only `is_active = 1` rows for the given `type` code, sorted by
  `sort_order ASC, id ASC`.
- `type` is optional; if omitted, returns all active rows grouped by
  their type code (see shape below).
- No whitelist on `type` other than "must be an existing code in
  `class_tag_types`" — backend reads the allowed list from DB so new
  admin-created types "just work".

```jsonc
// GET /api/tags?type=level
{
  "success": true,
  "data": [
    { "id": 1, "type": "level", "code": "entry",        "label_zh_tw": "入門", "label_zh_cn": "入门", "label_en": "Entry",        "sort_order": 1 },
    { "id": 2, "type": "level", "code": "intermediate", "label_zh_tw": "中級", "label_zh_cn": "中级", "label_en": "Intermediate", "sort_order": 2 }
  ]
}

// GET /api/tags  (no type) — dynamic keys, one per active type
{
  "success": true,
  "data": {
    "level":    [...],
    "age":      [...],
    "category": [...],
    "dance_style": [...]
  }
}
```

### 2.4 Tags — admin

`GET /api/admin/tags?type=:code`

- Returns **all** rows (active + inactive) for the given type, sorted by
  `sort_order ASC, id ASC`. `type` may be any existing type code, not
  restricted to a hardcoded list.
- If `type` omitted, returns all rows across all types.

`POST /api/admin/tags`

```jsonc
// body
{
  "type": "category",
  "code": "contemporary",
  "label_zh_tw": "當代舞",
  "label_zh_cn": "当代舞",         // optional
  "label_en":    "Contemporary",   // optional
  "sort_order":  7,                // optional; defaults to MAX(sort_order WHERE type=:type) + 1
  "is_active":   true              // optional; defaults to true
}
// 200 { "success": true, "data": { "id": 13, ... } }
// 400 { "success": false, "msg": "Tag with this code already exists" }
// 400 { "success": false, "msg": "Unknown tag type" }   // type not in class_tag_types
```

Validation:

- `type` must match an existing `class_tag_types.code` (active OR
  inactive — admin may pre-populate an inactive type).
- `code` required, `^[a-z0-9_\-]+$`, length ≤ 64.
- `(type, code)` must be unique.
- `label_zh_tw` required, length ≤ 128.

`PATCH /api/admin/tags/:id`

```jsonc
// body (any subset)
{
  "code":        "contemporary",
  "label_zh_tw": "當代舞蹈",
  "label_zh_cn": "当代舞蹈",
  "label_en":    "Contemporary Dance",
  "sort_order":  5,
  "is_active":   false
}
// 200 { "success": true, "data": { /* full row */ } }
```

Notes:

- `type` is **not** changeable after creation (would orphan classes).
  If an admin wants to move a tag between types, delete + recreate.
- Changing `code` is allowed but discouraged; backend should update any
  `classes.level` / `classes.age_tag` / etc. that reference the old code
  in the same transaction (see §3).

`DELETE /api/admin/tags/:id`

```
200 { "success": true, "data": { "deleted": true } }
409 { "success": false, "msg": "Tag is referenced by 8 classes; deactivate instead." }
```

- Hard delete only permitted if no `classes` row references the tag's
  `code` on the corresponding column (`level` / `age_tag` / `category`
  once wired). Otherwise respond with 409 and the admin UI will prompt
  the user to toggle `is_active = false` instead.

`POST /api/admin/tags/reorder`

```jsonc
// body
{
  "type":  "category",
  "order": [3, 7, 1, 2, 9]   // array of tag ids, in desired order
}
// 200 { "success": true, "data": { "updated": 5 } }
```

- Updates `sort_order = index + 1` for each id in `order`, within the
  given `type`.

## 3. Classes table coupling

Phase 1 does **not** change the `classes` schema; it continues to store
free-text `level` / `age_tag` columns whose values should match a
`class_tags.code`.

For `category` (常規班 / 暑假班 / 短期班 / 工作坊…) the `classes` table
does **not** yet have a column — Phase 2 needs to add:

```sql
ALTER TABLE classes
  ADD COLUMN category VARCHAR(64) NULL AFTER age_tag,
  ADD INDEX idx_classes_category (category);
```

and populate existing rows (most likely defaulting to `'regular'`).

For **admin-created tag types** (e.g. `dance_style`), Phase 2 will need a
separate column per active type OR a pivot table `class_tag_values (class_id, tag_id)`
to allow many-to-many. Recommendation: start with a pivot table —

```sql
CREATE TABLE class_tag_values (
  class_id INT UNSIGNED NOT NULL,
  tag_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (class_id, tag_id),
  KEY ix_class_tag_values_tag (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

This sidesteps the need to `ALTER TABLE classes` every time a new type
is introduced and makes multi-value tagging possible (e.g. a class can
be both `regular` and `workshop`). The three legacy system types keep
their existing scalar columns for now to avoid churn.

Phase 2 (frontend follow-up, tracked separately) will:

1. Replace hardcoded `CourseLevel` / `AgeTag` TypeScript unions with
   values loaded from `GET /api/tags`.
2. Surface validation: class create/update rejects tag codes that don't
   exist or are inactive, unless an admin explicitly chooses "keep
   legacy value".
3. When an admin renames a code via `PATCH /api/admin/tags/:id { code }`
   (or `PATCH /api/admin/tag-types/:id { code }`), the backend must
   migrate matching rows in the same transaction:

   ```sql
   -- Renaming a tag code
   UPDATE classes SET level    = :new_code WHERE level    = :old_code;  -- type='level'
   UPDATE classes SET age_tag  = :new_code WHERE age_tag  = :old_code;  -- type='age'
   UPDATE classes SET category = :new_code WHERE category = :old_code;  -- type='category'

   -- Renaming a tag type code
   UPDATE class_tags SET type = :new_code WHERE type = :old_code;
   ```

## 4. Frontend contract summary

- `studio/src/lib/tagCatalog.ts` provides:
  - Tag types: `fetchPublicTagTypes`, `fetchAdminTagTypes`,
    `createTagType`, `updateTagType`, `deleteTagType`,
    `reorderTagTypes`, `validateTagTypeDraft`.
  - Tags: `fetchPublicTags`, `fetchAdminTagsByType`, `createTag`,
    `updateTag`, `deleteTag`, `reorderTags`, `validateTagDraft`.
- `studio/src/pages/admin/AdminTagsPage.tsx` offers a tabbed UI with one
  tab per tag type (tabs are **loaded dynamically** from
  `/api/admin/tag-types`) plus a "Manage Types" modal to add, rename,
  reorder, deactivate, or delete types.
- No change to the public student-facing UI until phase 2 (the existing
  hardcoded enums keep working). Admin can add/retire tags and tag types
  in preparation.

## 5. Acceptance

1. `GET /api/admin/tag-types` → at least the 3 seeded rows with
   `is_system = true`.
2. `POST /api/admin/tag-types` with `{ code: 'dance_style', label_zh_tw: '舞種' }`
   → 200 with id; subsequent `GET` includes it with `is_system = false`.
3. `DELETE /api/admin/tag-types/:id` on a system type → 400.
4. `DELETE /api/admin/tag-types/:id` on a user type with no tags → 200;
   with tags → 409 with helpful `msg`.
5. `GET /api/admin/tags?type=dance_style` after creation → empty array,
   not 400 (arbitrary admin-created type is accepted).
6. `POST /api/admin/tags` with `{ type: 'does_not_exist', ... }` → 400
   "Unknown tag type".
7. `POST /api/admin/tags` with `{ type: 'dance_style', code: 'ballet', label_zh_tw: '芭蕾' }`
   → 200; `GET /api/admin/tags?type=dance_style` returns it.
8. `PATCH /api/admin/tag-types/:id` to rename `dance_style` → `style`
   cascades: all `class_tags` with `type = 'dance_style'` updated to
   `type = 'style'` atomically.
9. Reorder endpoints update `sort_order = index + 1` for both tag types
   and tags as expected.

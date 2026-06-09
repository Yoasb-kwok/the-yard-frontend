# Student upcoming classes API (frontend contract)

Backend should implement **`GET /api/student/upcoming-classes`** so the student schedule matches admin class rows (including public-holiday dates set at class creation).

## Query

| Param | Required | Notes |
|-------|----------|--------|
| `profile_id` / `student_profile_id` | When multi-child account | Scope to active student profile |

## Response

```json
{
  "success": true,
  "data": [
    {
      "id": "enrollment-row-uuid",
      "class_id": "42",
      "user_id": "1",
      "student_profile_id": "profile-uuid",
      "profile_id": "profile-uuid",
      "status": "active",
      "lesson_count": 1,
      "lessons_remaining": 1,
      "lessons_used": 0,
      "attended_lessons": 0,
      "tokens_charged": 1,
      "leave_requests": [
        { "lesson_index": 3, "leave_type": "personal", "status": "approved" }
      ],
      "class": {
        "id": "42",
        "name": "兒童芭蕾 A",
        "instructor": "Miss Chan",
        "program_code": "BAL-001",
        "class_code": "BAL-001",
        "lesson_number": 3,
        "start_time": "2026-04-15T17:00:00+08:00",
        "end_time": "2026-04-15T18:00:00+08:00",
        "location": "sanpokong",
        "token_cost": 1,
        "is_cancelled": false
      }
    }
  ]
}
```

## Rules (important)

### 1. One row per lesson (preferred)

For a full course with 7 lessons, return **7 enrollment rows** (or 7 linked rows), each with:

- Its own `id` (enrollment id)
- `class_id` pointing at that lesson’s `classes` row
- `class.start_time` / `class.end_time` = **final** scheduled time (holidays already applied in admin; do not expect the app to shift again)
- `lesson_count`: **1**
- `class.lesson_number`: **1..N** within the program

Frontend uses each row’s `start_time`/`end_time` directly on the calendar.

### 2. Legacy single row (fallback)

One enrollment with `lesson_count` > 1 and a single `class.start_time`: frontend falls back to weekly dates from the first lesson **without** re-applying public-holiday skip.

### 3. Leave requests

- Leave **does not** postpone lessons on the calendar.
- `leave_requests[].lesson_index` should match **`class.lesson_number`** (1-based) or 0-based index consistent with backend docs; frontend accepts both `n` and `n-1` when matching.
- Approved leave only changes the label on that slot.

### 4. Profile scoping

Every row must include `student_profile_id` or `profile_id` for multi-child accounts.

### 5. Grouping key

`class.program_code` (or `class_code`) is used to merge rows in “各課程剩餘堂數” and sidebar course list.

## Frontend files

| File | Role |
|------|------|
| `src/lib/studentUpcomingClasses.ts` | Parse API + `fetchStudentUpcomingClasses` |
| `src/lib/studentEnrollments.ts` | Schedule dates, grouping, leave helpers |

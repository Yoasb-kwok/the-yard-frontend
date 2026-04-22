# Class Health & Attendance Anomaly — Backend Spec

Scope: two admin dashboard endpoints that power

- `AdminClassHealthPage` (`班級營運健康度`) — `GET /api/admin/class-health`
- `AdminAttendanceAnomalyPage` (`出席率異常`) — `GET /api/admin/attendance-anomaly`

Both are currently **wired up on the frontend but not implemented on the
backend**. Because the API returns `success: false`, the frontend silently
falls back to the demo data in `studio/src/lib/adminReportData.ts`. The raw
data needed to compute these metrics already exists — admins record
attendance per enrolment through `PATCH /api/admin/class-enrollments/:id`
(`status: enrolled | attended | absent | sick_leave`, plus `check_in_time`
/ `check_out_time`).

## 1. Shared data model / assumptions

- `classes` — each row represents a single session (`start_time`,
  `end_time`, `capacity`, `program_code`, `instructor`,
  `attendance_confirmed`, `is_cancelled`).
- `enrollments` (a.k.a. `class_enrollments`) — one row per `(user, class)`
  with a single `status` column. Admins update `status` during / after the
  session. `status = 'enrolled'` means "not yet marked" after the class has
  passed, so treat unmarked rows on past classes the same as 'absent' (see
  §4).
- Metrics are always scoped to a calendar month via `?month=YYYY-MM`. The
  relevant population is classes whose `start_time` falls in that month.
- Cancelled classes (`classes.is_cancelled = 1`) are **excluded** from both
  endpoints.
- Internal / trial / demo classes (`classes.is_internal = 1`) are
  **excluded** from health + anomaly metrics to avoid skewing ratios. (If
  the business later wants trials included, add `?include_internal=1`.)
- Auth: admin bearer token. Same middleware as other `/api/admin/*`.
- Optional `?demo=1`: return plausible demo data only if the month has
  **zero** eligible classes. Must be ignored once real data exists.

## 2. `GET /api/admin/class-health`

### 2.1 Query params

| name    | required | example      | notes |
|---------|----------|--------------|-------|
| `month` | yes      | `2026-04`    | cohort month |
| `demo`  | no       | `1`          | see §1 |

### 2.2 Response shape

`200 { success: true, data: ClassHealthData }`

```ts
interface ClassHealthData {
  // Row per class *series* in the month. A "series" = distinct
  // (program_code, instructor, weekday-time-slot) within the month. If the
  // backend schema already stores classes as series rather than sessions,
  // use that directly.
  byClass: {
    classId: string;          // stable id (class series id, or first session id)
    className: string;
    programCode: string;
    instructor: string;
    avgAttendance: number;    // mean # students marked 'attended' per session
    capacity: number;         // capacity of the class (same across sessions)
    fillRate: number;         // % (0-100), 1 decimal. See §2.3
  }[];

  // Subset of byClass where avgAttendance < lowAttendanceThreshold.
  // Sorted ascending by avgAttendance (most at-risk first).
  lowAttendanceClasses: ClassHealthData['byClass'];

  // Threshold used to compute `lowAttendanceClasses`. Default 5 students.
  // Source: env var or constant. Frontend displays this threshold in the UI.
  lowAttendanceThreshold: number;

  // Summary per instructor. Active classes only (not cancelled).
  byInstructor: {
    instructor: string;
    classCount: number;       // distinct class series this instructor taught
    totalStudents: number;    // distinct unique students across those series
  }[];
}
```

### 2.3 Metric definitions

Let `S` = set of non-cancelled `classes` with `start_time` in `:month`.

Let `E` = enrolments attached to those classes.

- **avgAttendance** (per class series):
  `SUM(status='attended') / COUNT(DISTINCT sessions in series)`.
  If the class is modelled as a single row per session already, group by
  `(program_code, instructor, weekday, start_time::time)` across the month
  and take the average.

- **capacity**: the class's configured `capacity` (same across sessions of
  the same series). If it changes mid-month, take the most common value.

- **fillRate**: `AVG_per_session(attended / capacity) * 100`, 1 decimal.
  Rationale: more robust against over-booking and makes cross-class
  comparisons fair.

- **lowAttendanceThreshold** default: `5`. Override via env
  `CLASS_HEALTH_LOW_ATTENDANCE_THRESHOLD`.

- **byInstructor.totalStudents**: `COUNT(DISTINCT e.user_id)` where `e`
  joined class taught by that instructor in `:month`. Do **not** double
  count students who appear in multiple classes by the same instructor.

### 2.4 Pseudo-SQL sketch

```sql
-- Assume classes table holds one row per session.
WITH month_classes AS (
  SELECT c.*
  FROM classes c
  WHERE c.start_time >= :month_start
    AND c.start_time <  :month_end_plus_1
    AND c.is_cancelled = 0
    AND c.is_internal  = 0
),
series AS (
  SELECT
    CONCAT(program_code, ':', instructor, ':', WEEKDAY(start_time), ':', TIME(start_time)) AS series_key,
    MIN(id)                  AS class_id_repr,
    MAX(name)                AS class_name,
    program_code,
    instructor,
    AVG(capacity)            AS capacity,
    COUNT(*)                 AS session_count
  FROM month_classes
  GROUP BY series_key
),
attendance AS (
  SELECT
    mc.id AS class_id,
    SUM(CASE WHEN e.status = 'attended' THEN 1 ELSE 0 END) AS attended_count,
    SUM(CASE WHEN e.status IN ('attended','absent','sick_leave','enrolled') THEN 1 ELSE 0 END) AS eligible_count
  FROM month_classes mc
  LEFT JOIN enrollments e ON e.class_id = mc.id
  GROUP BY mc.id
)
SELECT
  s.class_id_repr  AS classId,
  s.class_name     AS className,
  s.program_code   AS programCode,
  s.instructor,
  ROUND(AVG(a.attended_count), 1) AS avgAttendance,
  ROUND(s.capacity)               AS capacity,
  ROUND(AVG(a.attended_count / NULLIF(s.capacity, 0)) * 100, 1) AS fillRate
FROM series s
JOIN month_classes mc
  ON CONCAT(mc.program_code, ':', mc.instructor, ':', WEEKDAY(mc.start_time), ':', TIME(mc.start_time)) = s.series_key
JOIN attendance a ON a.class_id = mc.id
GROUP BY s.series_key;
```

`byInstructor`:

```sql
SELECT
  c.instructor,
  COUNT(DISTINCT CONCAT(c.program_code, ':', c.instructor, ':', WEEKDAY(c.start_time), ':', TIME(c.start_time))) AS classCount,
  COUNT(DISTINCT e.user_id) AS totalStudents
FROM month_classes c
LEFT JOIN enrollments e ON e.class_id = c.id
GROUP BY c.instructor;
```

## 3. `GET /api/admin/attendance-anomaly`

### 3.1 Query params

| name    | required | example      | notes |
|---------|----------|--------------|-------|
| `month` | yes      | `2026-04`    | cohort month |
| `demo`  | no       | `1`          | see §1 |

### 3.2 Response shape

`200 { success: true, data: AttendanceAnomalyData }`

```ts
interface AttendanceAnomalyData {
  // Overall % of (attended) over (attended + absent) across all eligible
  // enrolments for classes in :month. Sick-leave is excluded from both
  // numerator and denominator (see §4). 1 decimal.
  overallMonthlyAttendanceRate: number;

  // Classes with per-class attendance rate strictly below
  // lowAttendanceRateThreshold. Default threshold: 80%.
  lowAttendanceRateThreshold: number;
  lowAttendanceRateClasses: {
    classId: string;          // class series id (same scheme as §2)
    className: string;
    programCode: string;
    instructor: string;
    attendanceRate: number;   // % (0-100), 1 decimal
    enrolledCount: number;    // distinct students enrolled in the series
  }[];

  // Students with ≥ consecutiveAbsenceThreshold consecutive absences in
  // the selected month. Default threshold: 3.
  consecutiveAbsenceThreshold: number;
  consecutiveAbsenceStudents: {
    studentId: string;
    full_name: string;
    mobile: string;
    consecutiveAbsences: number;     // current streak count
    lastClassDate: string;           // YYYY-MM-DD of the most recent absence
    className: string;               // class/series where the streak is happening
  }[];
}
```

### 3.3 Metric definitions

- **overallMonthlyAttendanceRate**: for all enrolments in `month_classes`,
  `100 * SUM(status='attended') / SUM(status IN ('attended','absent'))`,
  1 decimal. Sick-leave (`'sick_leave'`) and still-'enrolled' rows are
  excluded from both numerator and denominator (they represent excused /
  unprocessed slots).

- **lowAttendanceRateThreshold** default: `80`. Override via env
  `ATTENDANCE_LOW_RATE_THRESHOLD`.

- **lowAttendanceRateClasses**: per-class-series rate computed the same way
  (`attended / (attended + absent)`), include only series with at least
  one measurable session (denominator ≥ 1). Sort ascending.

- **consecutiveAbsenceThreshold** default: `3`. Override via env
  `ATTENDANCE_CONSECUTIVE_ABSENCE_THRESHOLD`.

- **consecutiveAbsenceStudents**: for each student, walk their enrolments
  in chronological order (by session `start_time`) across all classes they
  were enrolled in during the month. Count current trailing streak of
  `status = 'absent'` rows. Report students whose streak ≥ threshold. Use
  the class/series of the **last** absence as `className` and its date as
  `lastClassDate`. Break the streak on any non-absent row (`attended`,
  `sick_leave`, or `enrolled`-but-future). Excluded from streak: future
  sessions and cancelled classes.

### 3.4 Pseudo-SQL sketch

Overall:

```sql
SELECT ROUND(
  100 * SUM(CASE WHEN e.status = 'attended' THEN 1 ELSE 0 END) /
  NULLIF(SUM(CASE WHEN e.status IN ('attended','absent') THEN 1 ELSE 0 END), 0),
  1
) AS overallMonthlyAttendanceRate
FROM enrollments e
JOIN classes c ON c.id = e.class_id
WHERE c.start_time >= :month_start
  AND c.start_time <  :month_end_plus_1
  AND c.is_cancelled = 0
  AND c.is_internal  = 0;
```

Consecutive absences — window function approach:

```sql
WITH ordered AS (
  SELECT
    e.user_id,
    c.id       AS class_id,
    c.name     AS class_name,
    c.start_time,
    e.status,
    ROW_NUMBER() OVER (PARTITION BY e.user_id ORDER BY c.start_time DESC) AS rn
  FROM enrollments e
  JOIN classes c ON c.id = e.class_id
  WHERE c.start_time >= :month_start
    AND c.start_time <  :month_end_plus_1
    AND c.is_cancelled = 0
    AND c.is_internal  = 0
    AND c.start_time <= NOW()    -- only count already-held classes
),
trailing AS (
  -- From latest back, count absents up to the first non-absent row.
  SELECT user_id,
         class_id,
         class_name,
         start_time,
         SUM(CASE WHEN status = 'absent' THEN 0 ELSE 1 END)
           OVER (PARTITION BY user_id ORDER BY rn ROWS UNBOUNDED PRECEDING) AS break_seen
  FROM ordered
),
streaks AS (
  SELECT user_id,
         MIN(start_time)  AS first_absence,
         MAX(start_time)  AS last_absence,
         COUNT(*)         AS consecutive_count,
         MAX(class_id)    AS last_class_id,
         MAX(class_name)  AS last_class_name
  FROM trailing
  WHERE break_seen = 0      -- we're still in the trailing-absent window
  GROUP BY user_id
)
SELECT u.id               AS studentId,
       u.full_name,
       u.mobile,
       s.consecutive_count AS consecutiveAbsences,
       DATE(s.last_absence) AS lastClassDate,
       s.last_class_name    AS className
FROM streaks s
JOIN users u ON u.id = s.user_id
WHERE s.consecutive_count >= :threshold
ORDER BY s.consecutive_count DESC;
```

(MySQL 8+ supports window functions. For MySQL 5.7 fall back to a
self-join / variable accumulator.)

## 4. Handling the `'enrolled'` status

The enrolment starts as `'enrolled'` and only gets updated to one of
`attended / absent / sick_leave` after the class. This means the status of a
**future** session is always `'enrolled'`. Rules:

- **Future session (start_time > NOW())** → ignore completely (not yet
  held, not an absence, not an attendance).
- **Past session (start_time ≤ NOW()), status still `'enrolled'`** →
  treat as `'absent'` for rate calculations. This is the default
  interpretation; if the admin hasn't marked it, the student almost
  certainly didn't show up. This is important so that un-confirmed
  attendance doesn't silently inflate fill rates.
- **Class-level `attendance_confirmed = 0`** → still aggregate (admin may
  have marked individual enrolments without ticking the class-level flag).
  A separate dashboard widget can later surface classes with
  `attendance_confirmed = 0` as an admin TODO.

## 5. Indexes

```sql
CREATE INDEX idx_classes_month_active
  ON classes (start_time, is_cancelled, is_internal);
CREATE INDEX idx_enrol_class
  ON enrollments (class_id);
CREATE INDEX idx_enrol_user_class
  ON enrollments (user_id, class_id);
CREATE INDEX idx_classes_series
  ON classes (program_code, instructor, start_time);
```

## 6. Frontend contract summary

The frontend does not need any change once the backend ships these
endpoints. Acceptance:

1. `curl 'http://<backend>/api/admin/class-health?month=2026-04' -H 'Authorization: Bearer …'`
   → `{ success: true, data: { byClass: [...], lowAttendanceClasses: [...], lowAttendanceThreshold: 5, byInstructor: [...] } }`
2. `curl 'http://<backend>/api/admin/attendance-anomaly?month=2026-04' -H 'Authorization: Bearer …'`
   → `{ success: true, data: { overallMonthlyAttendanceRate, lowAttendanceRateThreshold, lowAttendanceRateClasses, consecutiveAbsenceThreshold, consecutiveAbsenceStudents } }`
3. Admin dashboard `班級營運健康度` and `出席率異常` tabs should show real
   numbers instead of the existing demo fallback.
4. Turning off `?demo=1` once a real month has data should not change the
   numbers (i.e. `demo=1` must be a no-op when real data exists).

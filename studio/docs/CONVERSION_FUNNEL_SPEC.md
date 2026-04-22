# Conversion Funnel — Backend Spec

Scope: `GET /api/admin/conversion-funnel?month=YYYY-MM` — powers the
`AdminFunnelPage` (`新生轉化漏斗`) in the admin dashboard.

## 1. Business rule (authoritative)

> **A trial application counts as a successful conversion when the same
> applicant subsequently enrols in the same course as the trial.**

"Same course" is matched by **program** (e.g. `program_code`), *not* by the
exact class slot the trial used. Rationale: a trial is usually for one
specific time slot of a program, but the student may pay for a different slot
of the same program (different weekday / term). Requiring identical
`class_id` would produce false negatives.

If a stricter definition is ever needed, it can be toggled by future query
param `?match=class` (default stays `program`). Initial implementation only
needs the `program` match.

## 2. Conversion detection query

Assumptions confirmed by product:

- The trial signup flow **auto-creates a user account** from the submitted
  email (see `TRIAL_SIGNUP_EMAIL_SPEC.md`). Therefore
  `trial_applications.user_id` is expected to be populated for every new
  trial. The email fallback below only exists for legacy rows that pre-date
  that change.
- Students may enrol via **two flows**:
  1. Trial → paid enrolment (this is what the funnel measures).
  2. Direct enrolment without a prior trial.
  Pre-existing enrolments for a student are therefore **expected** and
  must not be misread as trial conversions. This makes
  `e.created_at >= T.applied_at` a **hard requirement**, not a defensive
  guard — it is what distinguishes "this trial drove the enrolment" from
  "this student was already enrolled before the trial".
- The system's only anti-duplicate rule is at the **class level**: a student
  cannot hold two concurrent active enrolments in the **same `class_id`**.
  Two enrolments in the same `program_code` but different class slots are
  allowed (e.g. upgrading to an extra weekday), and a conversion still
  counts in that case as long as the new enrolment is post-trial.
- Refunded or cancelled enrolments **do not count** as conversions; only
  confirmed / active ones do.

Pseudo-SQL for "is trial T converted?":

```sql
SELECT 1
FROM enrollments e
JOIN classes      c_enrol ON c_enrol.id = e.class_id
JOIN classes      c_trial ON c_trial.id = T.assigned_class_id
WHERE e.user_id        = T.user_id
  AND c_enrol.program_code = c_trial.program_code
  AND e.created_at    >= T.applied_at        -- REQUIRED: excludes pre-existing direct enrolments
  AND e.payment_status IN ('paid', 'not_required')
  AND e.status NOT IN ('cancelled', 'refunded', 'void')
LIMIT 1;
```

The `e.created_at >= T.applied_at` filter is what makes the funnel honest:
students who were already enrolled in the same program before they applied
for a trial would otherwise be double-counted. Do **not** remove it.

What invalidates a conversion (must be excluded):

| signal                                 | source field                    |
|----------------------------------------|---------------------------------|
| Enrolment was never paid               | `payment_status NOT IN ('paid','not_required')` |
| Enrolment was later cancelled          | `enrolments.status = 'cancelled'` |
| Enrolment was refunded (full/partial)  | `enrolments.status = 'refunded'` OR a matching row in `refunds` with `status='succeeded'` |
| Enrolment soft-deleted                 | `enrolments.deleted_at IS NOT NULL` |

If the project uses a separate `payments` / `refunds` table, the canonical
check is "there exists a paid payment for this enrolment AND no successful
refund against it".

Edge cases:

- **Trial without a linked user** (`trial_applications.user_id IS NULL`,
  should only occur for legacy rows) — match fallback on
  `(LOWER(email), phone)` against `users`, then look up enrolments for that
  user. If no user can be resolved, the trial cannot be counted as
  converted.
- **Trial never assigned to a class** (`assigned_class_id IS NULL`) — fall
  back to matching by `trial_applications.trial_class` against
  `classes.name` or a program keyword map. If no program can be resolved,
  the trial is counted as "not converted" (do **not** count as converted by
  any enrolment).
- **Multiple enrolments** — once any qualifying enrolment exists the trial
  is considered converted; do **not** double-count.

## 3. Month scoping

`?month=YYYY-MM` selects which trials are evaluated:

- `trial_applications` with
  `DATE_FORMAT(applied_at, '%Y-%m') = :month` are the cohort for that
  month's funnel.
- A trial that was itself cancelled (`trial_applications.status =
  'cancelled'`) is excluded from both `totalTrialCount` and from any
  conversion count.
- An enrolment can convert a trial *regardless of which month the enrolment
  itself was paid*, as long as it happened **after** the trial application.
  This is the standard cohort-based funnel definition.
- If an enrolment that previously converted a trial is later refunded or
  cancelled, the trial's status flips back to "not converted" in any
  subsequent recomputation — numbers are always recomputed from current
  enrolment state, never cached into `trial_applications.status`.

## 4. Response shape

`200 { success: true, data: ConversionFunnelData }`

```ts
interface ConversionFunnelData {
  // Headline numbers for the selected month's trial cohort.
  totalTrialCount: number;           // count of trials applied in :month
  newEnrollmentCount: number;        // subset of totalTrialCount that converted
  trialToEnrollmentRate: number;     // % (0–100), 1 decimal place
  relatedRevenue: number;            // SUM(enrollments.total) across the
                                     //   converting enrolments (HKD)

  // Simple 2-stage visual: [trial, enrolled]
  funnelStages: { nameKey: 'trial' | 'enrolled'; name: string; value: number }[];

  // Breakdown by marketing channel (trial_applications.how_did_you_hear,
  // normalised). `channelKey` is a stable slug; `channel` is the display label.
  byChannel: {
    channel: string;
    channelKey: string;      // e.g. 'ig' | 'fb' | 'referral' | 'google' | 'walkin' | 'other'
    trialCount: number;
    enrollmentCount: number;
    conversionRate: number;  // %, 1 decimal place
    revenue: number;
  }[];
}
```

### Channel normalisation

Map `trial_applications.how_did_you_hear` (free text) to canonical keys:

| raw (case-insensitive)                | channelKey |
|---------------------------------------|------------|
| `instagram`, `ig`                     | `ig`       |
| `facebook`, `fb`                      | `fb`       |
| `google`, `search`                    | `google`   |
| `referral`, `friend`, `朋友`, `介紹`   | `referral` |
| `walk-in`, `walk_in`, `walkin`, `路過`| `walkin`   |
| anything else / empty                 | `other`    |

`channel` display label should be the Traditional-Chinese version shown on
the trial form (e.g. `IG`, `FB`, `Google`, `朋友推薦`, `Walk-in`, `其他`).

## 5. Auth & demo mode

- Requires admin bearer token (same middleware as other `/api/admin/*` routes).
- Optional `?demo=1` query: return a plausible dataset if there are **no**
  trials in the selected month, so the UI isn't empty in staging. When real
  data exists, `demo=1` must be ignored and real numbers returned.

## 6. Minimal indexes

```sql
CREATE INDEX idx_trial_app_month    ON trial_applications (applied_at);
CREATE INDEX idx_trial_app_user     ON trial_applications (user_id);
CREATE INDEX idx_enrol_user_created ON enrollments (user_id, created_at);
CREATE INDEX idx_classes_program    ON classes (program_code);
```

## 7. Frontend contract summary

The frontend (`studio/src/pages/admin/AdminFunnelPage.tsx`) currently:

1. Calls `GET /api/admin/conversion-funnel?demo=1&month=YYYY-MM`.
2. Renders `funnelStages`, KPI cards, and a `byChannel` table.
3. Exposes a CSV export using the same fields.

No frontend change is required once the backend implements this spec — the
UI description string already reads "學員完成試堂申請後，若繼續報讀同一門課
程，即計算為成功轉化" to match the rule.

# API Specification

Use this table in Excel or docs with columns: **API name**, **Page**, **Type**, **Path**, **Parameters**, **Success return**, **Failure return**, **Remarks**.

---

## Auth

| API name | Page | Type | Path | Parameters | Success return | Failure return | Remarks |
|----------|------|------|------|------------|----------------|----------------|---------|
| login | Login | POST | /api/user/login | {<br>    "loginIdentifier": "01admin",<br>    "password": "111111",<br>    "rememberMe": true<br>} | {<br>    "success": true,<br>    "msg": "Logged In",<br>    "token": "eyJ...",<br>    "user": {<br>        "ID": 1,<br>        "username": "01admin",<br>        "name": "01 管理員",<br>        "email": "01tech.hk@gmail.com"<br>    }<br>} | {<br>    "success": false,<br>    "msg": "Invalid Email or Password."<br>} | loginIdentifier = username or email |
| | | | | | | | |
| register | Register | POST | /api/user/register | {<br>    "email": "a@b.com",<br>    "password": "xxx",<br>    "fullName": "張三",<br>    "idLastFour": "A123",<br>    "countryCode": "852",<br>    "mobile": "91234567"<br>} | {<br>    "success": true,<br>    "msg": "Registered",<br>    "user": {<br>        "ID": 1,<br>        "email": "a@b.com"<br>    },<br>    "profile": {}<br>} | {<br>    "success": false,<br>    "msg": "Email already exists."<br>} | Creates users + profiles |
| | | | | | | | |
| forgotPassword | ForgotPassword | POST | /api/user/forgot-password | {<br>    "email": "a@b.com"<br>} | {<br>    "success": true,<br>    "msg": "OTP sent to email."<br>} | {<br>    "success": false,<br>    "msg": "Email not found."<br>} | Sends OTP, stores in otp_codes |
| | | | | | | | |
| verifyOtp | OTPVerification | POST | /api/user/verify-otp | {<br>    "email": "a@b.com",<br>    "otp": "123456"<br>} | {<br>    "success": true,<br>    "msg": "Verified. You can reset password.",<br>    "tempToken": "optional"<br>} | {<br>    "success": false,<br>    "msg": "Invalid or expired OTP."<br>} | Optional: return tempToken for reset |
| | | | | | | | |
| resetPassword | OTPVerification (post-verify) | POST | /api/user/reset-password | {<br>    "email": "a@b.com",<br>    "otp": "123456",<br>    "newPassword": "newpass123"<br>} | {<br>    "success": true,<br>    "msg": "Password reset successfully."<br>} | {<br>    "success": false,<br>    "msg": "Invalid or expired OTP."<br>} | After OTP verified; invalidates OTP |
| | | | | | | | |
| getMe | Login, Dashboard, Profile, etc. | GET | /api/auth/me | {<br>    "Authorization": "Bearer &lt;token&gt;"<br>} | {<br>    "success": true,<br>    "user": {<br>        "ID": 1,<br>        "username": "01admin",<br>        "name": "01 管理員",<br>        "email": "01tech.hk@gmail.com"<br>    },<br>    "profile": {}<br>} | {<br>    "success": false,<br>    "msg": "Unauthorized"<br>} | Header: Authorization: Bearer &lt;token&gt; |
| | | | | | | | |

---

## Public (no auth or optional)

| API name | Page | Type | Path | Parameters | Success return | Failure return | Remarks |
|----------|------|------|------|------------|----------------|----------------|---------|
| getNewsList | News | GET | /api/news | {<br>    "limit": 20,<br>    "offset": 0,<br>    "lang": "zh-TW" \| "zh-CN" \| "en"<br>} | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "title": "...",<br>            "content": "...",<br>            "image_url": "...",<br>            "published_at": "..."<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Query: limit, offset, **lang** (optional). Return title/content in requested language if backend supports i18n; else return default. Published only. |
| | | | | | | | |
| getNewsDetail | NewsDetail | GET | /api/news/:id | **lang** (optional): "zh-TW" \| "zh-CN" \| "en" | {<br>    "success": true,<br>    "data": {<br>        "id": 1,<br>        "title": "...",<br>        "content": "...",<br>        "image_url": "...",<br>        "published_at": "..."<br>    }<br>} | {<br>    "success": false,<br>    "msg": "Not found"<br>} | Return title/content in requested language if backend supports i18n. |
| | | | | | | | |
| getTokenPackages | TokenPackage | GET | /api/token-packages | — | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "name": "...",<br>            "description": "...",<br>            "token_count": 10,<br>            "price": 900,<br>            "validity_days": 60<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | is_active=1 only |
| | | | | | | | |
| validateCoupon | TokenPackage | POST | /api/coupons/validate | {<br>    "code": "WELCOME10",<br>    "subtotal": 1000<br>} | {<br>    "success": true,<br>    "data": {<br>        "id": 1,<br>        "discount_type": "percentage",<br>        "discount_value": 10<br>    }<br>} | {<br>    "success": false,<br>    "msg": "Invalid or expired coupon."<br>} | Check valid_from, valid_until, quantity |
| | | | | | | | |
| createOrder | TokenPackage (checkout) | POST | /api/orders | {<br>    "package_id": 1,<br>    "quantity": 1,<br>    "coupon_id": null,<br>    "referral_code": "std123456",<br>    "payment_method": "fps",<br>    "payment_slip_url": null<br>} | {<br>    "success": true,<br>    "data": {<br>        "id": 1,<br>        "total": 900,<br>        "payment_status": "pending"<br>    }<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Auth required. referral_code optional; stored for audit. No discount applied at the moment. |
| | | | | | | | |
| getClasses | Calendar | GET | /api/classes | {<br>    "from": "2026-01-01",<br>    "to": "2026-01-31",<br>    "location": "sanpokong",<br>    "level": "entry"<br>} | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "name": "...",<br>            "instructor": "...",<br>            "start_time": "...",<br>            "end_time": "...",<br>            "location": "...",<br>            "program_code": "...",<br>            "level": "...",<br>            "age_tag": "9-12",<br>            "capacity": 10,<br>            "enrolled_count": 5,<br>            "weekday": 3,<br>            "total_lessons": 8<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Query. Filter by student level if logged in. weekday: 0=Sun..6=Sat. total_lessons: 8 or 16. |
| | | | | | | | |
| getHolidays | Calendar | GET | /api/holidays | {<br>    "from": "2026-01-01",<br>    "to": "2026-12-31"<br>} | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "name": "...",<br>            "date": "2026-01-29",<br>            "description": "..."<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Query. For calendar to mark holiday dates |
| | | | | | | | |
| getSiteContent | About, Terms, Privacy, FAQ | GET | /api/site-content/:pageKey | — | {<br>    "success": true,<br>    "data": {<br>        "page_key": "about",<br>        "title": "...",<br>        "content": "..."<br>    }<br>} | {<br>    "success": false,<br>    "msg": "Not found"<br>} | pageKey: about, terms, privacy, faq |
| | | | | | | | |
| getCourseIntros | Courses | GET | /api/course-intros | — | {<br>    "success": true,<br>    "data": [{ "id": 1, "class_code": "...", "name_zh_tw": "...", "intro_zh_tw": "...", "is_active": 1 }]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Active rows only. Merged on frontend by `class_code` / `program_code`. See `COURSE_INTRO_CMS_SPEC.md`. |
| | | | | | | | |

---

## Trial

| API name | Page | Type | Path | Parameters | Success return | Failure return | Remarks |
|----------|------|------|------|------------|----------------|----------------|---------|
| createTrialApplication | Trial | POST | /api/trial-applications | {<br>    "class_id": 1<br>}<br>or<br>{<br>    "class_id": 1,<br>    "fullName": "張三",<br>    "nickName": "小明",<br>    "dateOfBirth": "2010-05-15",<br>    "sex": true,<br>    "parentsName": "張大華",<br>    "countryCode": "852",<br>    "contactNumber": "91234567",<br>    "email": "a@b.com",<br>    "residentialDistrict": "Kowloon",<br>    "hasJoinedCourses": true,<br>    "password": "20100515"<br>} | {<br>    "success": true,<br>    "msg": "Application submitted."<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | From Calendar class_id; new user creates user+profile+app |
| | | | | | | | |

---

## Student (auth required)

| API name | Page | Type | Path | Parameters | Success return | Failure return | Remarks |
|----------|------|------|------|------------|----------------|----------------|---------|
| getProfile | Profile | GET | /api/profiles/me | {<br>    "Authorization": "Bearer &lt;token&gt;"<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "Unauthorized"<br>} | May include profiles[] for multi-profile |
| | | | | | | | |
| updateProfile | Profile | PATCH | /api/profiles/me | {<br>    "full_name": "...",<br>    "nick_name": "...",<br>    "date_of_birth": "...",<br>    "sex": true,<br>    "parents_name": "...",<br>    "contact_number": "...",<br>    "residential_district": "...",<br>    "has_joined_courses": true,<br>    "level": "entry"<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | For sub-accounts: PATCH /api/profiles/:id |
| | | | | | | | |
| addProfile | Profile | POST | /api/student/profiles | Same body as below (no `user_id`) | {<br>    "success": true,<br>    "data": {}<br>} | 401 / 403 / 400 | **Parent/student portal** — adds child under logged-in account |
| addProfileAdmin | Profile | POST | /api/profiles | {<br>    "user_id": 123,<br>    "full_name": "張三",<br>    ...<br>} | 201 + profile | 403 without admin JWT | **Admin only** — create profile for any user |
| | | | | | | | |
| deleteProfile | Profile | DELETE | /api/profiles/:id | — | {<br>    "success": true,<br>    "msg": "Deleted."<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Cannot delete primary profile |
| | | | | | | | |
| getUserTokens | Dashboard | GET | /api/user-tokens | {<br>    "Authorization": "Bearer &lt;token&gt;"<br>} | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "remaining_tokens": 5,<br>            "total_tokens": 10,<br>            "expiry_date": "2026-02-15"<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | For current user |
| getStudentTokenUsage | Schedule, Dashboard | GET | /api/student/token-usage | — | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": "enr_1",<br>            "date": "2026-05-01T10:00:00Z",<br>            "class_name": "兒童芭蕾",<br>            "change": -1,<br>            "kind": "spend"<br>        },<br>        {<br>            "id": "ord_1",<br>            "date": "2026-04-20T12:00:00Z",<br>            "class_name": "10堂套票",<br>            "change": 10,<br>            "kind": "purchase"<br>        },<br>        {<br>            "id": "ref_1",<br>            "date": "2026-05-10T09:00:00Z",<br>            "class_name": "兒童芭蕾",<br>            "change": 1,<br>            "kind": "refund"<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | `change` negative = spent, positive = purchase/refund. Frontend merges `GET /student/token-refunds` (or `/student/refund-records`) when refunds are not included. Falls back to enrollments + orders if token-usage is missing. |
| getStudentTokenRefunds | Schedule, Dashboard | GET | /api/student/token-refunds | — | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": "ref_1",<br>            "refunded_at": "2026-05-10T09:00:00Z",<br>            "class_name": "兒童芭蕾",<br>            "remarks": "病假不補堂",<br>            "tokens_refunded": 1<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Optional; frontend also tries `/student/refund-records`, `/refunds/me`. |
| | | | | | | | |
| getUpcomingEnrollments | Dashboard, Schedule | GET | /api/class-enrollments/me | {<br>    "upcoming": 1<br>}<br>or {<br>    "past": 1<br>} | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "status": "enrolled",<br>            "class": {},<br>            "extension_application": null,<br>            "sick_leave_application": null<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Query. Include extension/sick_leave |
| | | | | | | | |
| createClassEnrollment | Calendar, Schedule | POST | /api/class-enrollments | {<br>    "class_id": 1,<br>    "user_token_id": 1,<br>    "lesson_count": 1,<br>    "enrollment_scope": "single_lesson"<br>} | {<br>    "success": true,<br>    "data": { "tokens_charged": 1, "remaining_tokens": 10 }<br>} | {<br>    "success": false,<br>    "code": "INSUFFICIENT_TOKENS",<br>    "msg": "..."<br>} | 1 lesson = 1 token (× token_cost). Full course: lesson_count = total_lessons. See TOKEN_ENROLLMENT_SPEC.md |
| | | | | | | | |
| getOrders | PaymentHistory | GET | /api/orders/me | {<br>    "Authorization": "Bearer &lt;token&gt;"<br>} | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "created_at": "...",<br>            "total": 900,<br>            "payment_status": "paid",<br>            "payment_method": "fps",<br>            "package_id": 1,<br>            "order_id": "ORD-001",<br>            "token_count": 10<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| createExtensionRequest | Dashboard, Schedule | POST | /api/extension-requests | {<br>    "class_enrollment_id": 1,<br>    "user_token_id": 1,<br>    "reason": "..."<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| createSickLeaveRequest | Dashboard, Schedule | POST | /api/sick-leave-requests | {<br>    "class_enrollment_id": 1,<br>    "reason": "...",<br>    "document_url": null<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |

---

## Admin (auth + is_admin required)

| API name | Page | Type | Path | Parameters | Success return | Failure return | Remarks |
|----------|------|------|------|------------|----------------|----------------|---------|
| getDashboardStats | AdminDashboard | GET | /api/admin/dashboard/stats | — | {<br>    "success": true,<br>    "data": {<br>        "todayRevenue": 1250,<br>        "newUsersThisMonth": 12,<br>        "expiringStudents": 3,<br>        "lowTokenStudents": 5<br>    }<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| getTodayClasses | AdminDashboard | GET | /api/admin/dashboard/today-classes | {<br>    "location": "sanpokong"<br>} | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "name": "...",<br>            "class_code": "...",<br>            "instructor": "...",<br>            "start_time": "...",<br>            "enrolled_count": 8,<br>            "capacity": 12,<br>            "location": "..."<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Query |
| | | | | | | | |
| getUsers | Users | GET | /api/admin/users | {<br>    "search": "張"<br>} | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "full_name": "...",<br>            "parents_name": "...",<br>            "residential_district": "shaTin",<br>            "role": "student",<br>            "mobile": "...",<br>            "created_at": "...",<br>            "user_tokens": [],<br>            "profiles": [<br>                {<br>                    "id": "...",<br>                    "profile_kind": "student",<br>                    "full_name": "...",<br>                    "date_of_birth": "2014-05-12",<br>                    "sex": false,<br>                    "id_last_four": "1234"<br>                }<br>            ]<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | See **studio/docs/ADMIN_USERS_BACKEND_SYNC.md**. Each row = login account; **profiles[]** must include student sub-accounts with DOB, sex, district. |
| | | | | | | | |
| updateUser | Users | PATCH | /api/admin/users/:id | {<br>    "email": "...",<br>    "username": "...",<br>    "mobile": "...",<br>    "parents_name": "...",<br>    "contact_number": "...",<br>    "residential_district": "...",<br>    "role": "student",<br>    "student_profiles": [<br>        {<br>            "id": "profile-uuid",<br>            "full_name": "...",<br>            "date_of_birth": "2010-05-15",<br>            "sex": true,<br>            "id_card_last4": "1234"<br>        }<br>    ]<br>} | {<br>    "success": true,<br>    "data": { "profiles": [] }<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Updates login account + nested student sub-profiles. |
| | | | | | | | |
| sendPasswordReset | Users | POST | /api/admin/users/:id/send-password-reset | — | {<br>    "success": true,<br>    "msg": "Reset email sent."<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| updateUserTokenExpiry | Users | PATCH | /api/admin/user-tokens/:id | {<br>    "expiry_date": "2026-03-01"<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| getClasses | Classes, TokenAssignment | GET | /api/admin/classes | {<br>    "from": "2026-01-01",<br>    "to": "2026-01-31",<br>    "month": "2026-01",<br>    "location": "sanpokong"<br>} | {<br>    "success": true,<br>    "data": []<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Query. month: optional YYYY-MM; filter by class start_time in that month. |
| | | | | | | | |
| createClass | Classes | POST | /api/admin/classes | {<br>    "name": "...",<br>    "instructor": "...",<br>    "start_time": "...",<br>    "end_time": "...",<br>    "capacity": 10,<br>    "location": "...",<br>    "program_code": "...",<br>    "level": "entry",<br>    "is_internal": 0<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| updateClass | Classes | PATCH | /api/admin/classes/:id | {<br>    "name": "...",<br>    "instructor": "...",<br>    "is_cancelled": 1<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| getClassEnrollments | ClassAttendance | GET | /api/admin/classes/:classId/enrollments | — | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "user_id": "...",<br>            "user_name": "...",<br>            "user_mobile": "...",<br>            "status": "attended",<br>            "check_in_time": "...",<br>            "check_out_time": "...",<br>            "sick_leave_document_url": null<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| updateEnrollmentAttendance | ClassAttendance | PATCH | /api/admin/class-enrollments/:id | {<br>    "status": "attended",<br>    "check_in_time": "...",<br>    "check_out_time": "..."<br>}<br>or<br>{<br>    "status": "sick_leave",<br>    "sick_leave_document_url": "..."<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| getPublicInstructors | Instructors (public) | GET | /api/instructors | — | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "name": "...",<br>            "profile_image_url": "...",<br>            "intro_zh_tw": "...",<br>            "awards": [],<br>            "years_dancing": 10,<br>            "teaching_experience": 5,<br>            "dance_school": "..."<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | No auth; used by /instructors page |
| getInstructors | Instructors | GET | /api/admin/instructors | — | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "name": "...",<br>            "profile_image_url": "...",<br>            "created_at": "..."<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Admin auth |
| | | | | | | | |
| createInstructor | Instructors | POST | /api/admin/instructors | {<br>    "name": "...",<br>    "profile_image_url": null<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| updateInstructor | Instructors | PATCH | /api/admin/instructors/:id | {<br>    "name": "...",<br>    "profile_image_url": "..."<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| deleteInstructor | Instructors | DELETE | /api/admin/instructors/:id | — | {<br>    "success": true,<br>    "msg": "Deleted."<br>} | {<br>    "success": false,<br>    "msg": "Not found"<br>} | — |
| | | | | | | | |
| getAdminCourseIntros | AdminCourseIntro | GET | /api/admin/course-intros | — | {<br>    "success": true,<br>    "data": []<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | All rows. See `COURSE_INTRO_CMS_SPEC.md`. |
| | | | | | | | |
| createCourseIntro | AdminCourseIntro | POST | /api/admin/course-intros | body: class_code + 3-lang fields | {<br>    "success": true,<br>    "data": {}<br>} | 409 if class_code exists | — |
| | | | | | | | |
| updateCourseIntro | AdminCourseIntro | PATCH | /api/admin/course-intros/:id | partial body | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| deleteCourseIntro | AdminCourseIntro | DELETE | /api/admin/course-intros/:id | — | {<br>    "success": true,<br>    "msg": "Deleted."<br>} | 404 | Removes entire CMS row |
| | | | | | | | |
| getCoupons | Coupons | GET | /api/admin/coupons | {<br>    "search": "SUMMER"<br>} | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "code": "...",<br>            "discount_type": "percentage",<br>            "discount_value": 20,<br>            "min_order_amount": 500,<br>            "quantity": 100,<br>            "used_count": 45,<br>            "valid_from": "...",<br>            "valid_until": "...",<br>            "is_active": 1<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Query |
| | | | | | | | |
| createCoupon | Coupons | POST | /api/admin/coupons | {<br>    "code": "...",<br>    "discount_type": "percentage",<br>    "discount_value": 20,<br>    "min_order_amount": 500,<br>    "quantity": 100,<br>    "valid_from": "...",<br>    "valid_until": "...",<br>    "is_active": 1<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "Code already exists."<br>} | Code unique |
| | | | | | | | |
| updateCoupon | Coupons | PATCH | /api/admin/coupons/:id | {<br>    "is_active": 0<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| getOrders | UserPurchaseHistory | GET | /api/admin/orders | {<br>    "user_id": 1,<br>    "from": "2026-01-01",<br>    "to": "2026-01-31"<br>} | {<br>    "success": true,<br>    "data": []<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Query |
| | | | | | | | |
| updateOrderPaymentStatus | UserPurchaseHistory | PATCH | /api/admin/orders/:id | {<br>    "payment_status": "paid" \| "pending" \| "failed" \| "not_required"<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Admin; :id = order row id from GET admin/orders. |
| | | | | | | | |
| getOrdersByUser | UserPurchaseHistoryDetail | GET | /api/admin/users/:userId/orders | — | {<br>    "success": true,<br>    "data": []<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| getUserEnrollments | UserSchedule | GET | /api/admin/users/:userId/class-enrollments | — | {<br>    "success": true,<br>    "data": []<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| assignTokens | TokenAssignment | POST | /api/admin/user-tokens/assign | {<br>    "user_id": 1,<br>    "package_id": 1,<br>    "quantity": 1,<br>    "expiry_date": "2026-06-01"<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "Assigned tokens would exceed total."<br>} | Manual token grant from package. quantity: any positive integer. Validate assigned_tokens + quantity ≤ total_tokens (or package cap); reject if exceeded. |
| | | | | | | | |
| assignTokensToClass | TokenAssignment | POST | /api/admin/token-assignment/assign-to-class | {<br>    "user_id": 1,<br>    "class_id": 1,<br>    "quantity": 2<br>} | {<br>    "success": true,<br>    "data": { "enrollments": [] }<br>} | {<br>    "success": false,<br>    "msg": "Assigned tokens would exceed total. Currently assigned: X, total: Y."<br>} | Assigns quantity tokens from user's pool to class (creates quantity class_enrollments). Fails if user.assigned_tokens + quantity > user.total_tokens. |
| unassignTokensFromClass | TokenAssignment | POST | /api/admin/token-assignment/unassign-from-class | {<br>    "enrollment_id": "...",<br>    "user_id": 1,<br>    "class_id": 42,<br>    "student_profile_id": "...",<br>    "remarks": "..."<br>} | {<br>    "success": true,<br>    "data": { "tokens_refunded": 1, "remaining_tokens": 6, "assigned_tokens": 2 }<br>} | ENROLLMENT_NOT_FOUND, NOT_TOKEN_ASSIGNED, CANNOT_UNASSIGN_ATTENDED | Removes one lesson's token assignment; refunds tokens to unassigned pool. See TOKEN_ENROLLMENT_SPEC §3.3. |
| | | | | | | | |
| reassignEnrollment | ReassignStudents | PATCH | /api/admin/class-enrollments/:id | {<br>    "user_token_id": 2<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Change token used for enrollment |
| | | | | | | | |
| getHolidays | Holidays | GET | /api/admin/holidays | {<br>    "search": "..."<br>} | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "name": "...",<br>            "date": "2026-01-29",<br>            "description": "...",<br>            "created_at": "..."<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Query |
| | | | | | | | |
| createHoliday | Holidays | POST | /api/admin/holidays | {<br>    "name": "Chinese New Year",<br>    "date": "2026-01-29",<br>    "description": "Lunar New Year"<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | date: YYYY-MM-DD |
| | | | | | | | |
| updateHoliday | Holidays | PATCH | /api/admin/holidays/:id | {<br>    "name": "...",<br>    "date": "2026-01-29",<br>    "description": "..."<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| deleteHoliday | Holidays | DELETE | /api/admin/holidays/:id | — | {<br>    "success": true,<br>    "msg": "Deleted."<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| getRefundRecords | RefundRecords | GET | /api/admin/refund-records | {<br>    "search": "...",<br>    "from": "2026-01-01",<br>    "to": "2026-01-31"<br>} | {<br>    "success": true,<br>    "data": [<br>        {<br>            "id": 1,<br>            "enrollment_id": "...",<br>            "user_name": "...",<br>            "class_name": "...",<br>            "class_code": "...",<br>            "tokens_refunded": 1,<br>            "remarks": "...",<br>            "refunded_by": "...",<br>            "refunded_at": "..."<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | Query |
| | | | | | | | |
| createRefundRecord | ClassAttendance | POST | /api/admin/refund-records | {<br>    "enrollment_id": "...",<br>    "user_id": "...",<br>    "user_name": "...",<br>    "class_id": "...",<br>    "class_name": "...",<br>    "class_code": "...",<br>    "tokens_refunded": 1,<br>    "remarks": "..."<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | refunded_by from auth; backend may update user_tokens |
| | | | | | | | |
| getSiteContentList | Settings | GET | /api/admin/site-content | — | {<br>    "success": true,<br>    "data": [<br>        {<br>            "page_key": "about",<br>            "title": "...",<br>            "content": "..."<br>        }<br>    ]<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |
| updateSiteContent | Settings | PATCH | /api/admin/site-content/:pageKey | {<br>    "title": "...",<br>    "content": "..."<br>} | {<br>    "success": true,<br>    "data": {}<br>} | {<br>    "success": false,<br>    "msg": "..."<br>} | — |
| | | | | | | | |

---

## Response format

- **Success:** `{"success": true, "msg": "Optional message", "data": {...}}` or `{"success": true, "token": "...", "user": {...}}` for login.
- **Failure:** `{"success": false, "msg": "Error description"}`. HTTP: 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error).

---

## Notes

- **getClasses (Public vs Admin):** They do **not** conflict. Public uses `GET /api/classes` (Calendar; no or optional auth). Admin uses `GET /api/admin/classes` (Classes, TokenAssignment; requires `is_admin`). Different paths and middleware; register both on the backend.

- **News：三語輸入、前台依 lang 顯示：** Admin 在後台輸入三種語言（繁體中文、简体中文、English）的標題與內文。後端儲存 `title_zh_tw`、`title_zh_cn`、`title_en`、`content_zh_tw`、`content_zh_cn`、`content_en`（或等價欄位）。前台請求 `GET /api/news` 或 `GET /api/news/:id` 時帶上查詢參數 `lang`（zh-TW | zh-CN | en），後端依 `lang` 回傳對應的 title 與 content。無需翻譯 API；客戶端不支付額外翻譯費用。

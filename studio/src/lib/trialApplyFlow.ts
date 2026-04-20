/**
 * 預約試堂 — 前後端交互流程（Backend flow for trial application）
 *
 * 端點：`POST /api/trial-application`（公開，毋須登入）
 *
 * Request body：
 *   必填：classId, fullName, email
 *   選填：contactNumber, countryCode, nickName, dateOfBirth, sex, parentsName,
 *         residentialDistrict, hasJoinedCourses, hasDanceExperience,
 *         howDidYouHear, promoCode
 *
 * Response（新版，隨機密碼 + Email 流程）：
 *   { success: true,
 *     applicationId: number,
 *     accountCreated: boolean,   // 是否剛剛新建帳號
 *     existingUser: boolean,     // email 是否已有舊帳號
 *     emailSent?: boolean,       // 是否已寄出臨時密碼 email（新帳號時應為 true）
 *     message?: string }
 *
 * ★ 重要：response **絕不再包含 temporaryPassword**。
 *         後端會用 email 寄一次性密碼給用戶，前端完全不接觸密碼。
 *
 * 後端行為：
 *   1. 若 email 已有帳號：直接建立 trial_applications row（user_id = 該帳號），不重設密碼，不寄信。
 *   2. 若 email 未註冊：
 *      a. 自動建帳號（隨機 12 字元密碼、bcrypt 雜湊入 DB、must_change_password = 1）
 *      b. 建立 profile（用表單資料）
 *      c. 建立 trial_applications row，user_id 指向新帳號
 *      d. 寄 email 告知用戶：登入信箱 + 臨時密碼 + 「請登入後立即更改密碼」
 *
 * 前端顯示：
 *   - 新帳號 → 只顯示「密碼已寄到 email」，不再把密碼 render 在畫面上。
 *   - 已有帳號 → 請用原本密碼登入查看試堂狀態。
 *
 * 詳細後端規格見 `studio/docs/TRIAL_SIGNUP_EMAIL_SPEC.md`。
 */

export const TRIAL_APPLY_ENDPOINT = 'trial-application';

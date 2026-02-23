/**
 * 預約試堂 — 後端邏輯說明（Backend flow for trial application）
 *
 * 當用戶提交試堂表單（未登入）時，後端應：
 *
 * 1. 自動建立帳號
 *    - 使用用戶填寫的 email 作為登入帳號
 *    - 密碼：由後端產生 random 密碼（例如 8–12 位隨機字元），不要用出生日期
 *
 * 2. 發送一封 email 給用戶
 *    - 主旨：例如「The YARD 試堂確認及帳號資料」
 *    - 內容應包含：
 *      a) 臨時密碼（第一次登入用）
 *      b) 改密碼連結：例如 https://yoursite.com/reset-password?token=xxx
 *        （token 由後端產生並存入 DB，設定過期時間 e.g. 7 日）
 *    - 提醒用戶首次登入後請立即更改密碼
 *
 * 3. 建立試堂申請記錄
 *    - 關聯到剛建立的 user id、所選課堂、申請時間等
 *
 * API 建議：
 *   POST /trial/apply
 *   Body: { email, fullName, nickName, dateOfBirth, sex, parentsName, contactNumber,
 *           residentialDistrict, hasJoinedCourses, hasDanceExperience, howDidYouHear,
 *           classId, className, classStartTime, classEndTime, location, programCode, instructor }
 *   Response: { success: true } 或 { success: false, msg: "..." }
 *
 * 前端會先呼叫此 API；若後端未實作或連線失敗，則 fallback 用現有 signUp（DOB 密碼）並仍顯示同一段成功說明文案，讓用戶看到預期流程。
 */

export const TRIAL_APPLY_ENDPOINT = 'trial/apply';

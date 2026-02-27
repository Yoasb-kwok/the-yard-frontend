/**
 * 預約試堂 — 後端邏輯說明（Backend flow for trial application）
 *
 * 當用戶提交試堂表單（未登入）時，後端：
 * POST /api/trial-application（毋須登入）
 * Body 必填：classId, fullName, email
 * 選填：contactNumber, countryCode, nickName, dateOfBirth, sex, parentsName, residentialDistrict, hasJoinedCourses
 *
 * 若 email 已有帳號：只新增試堂申請。
 * 若 email 未註冊：自動建帳號（隨機臨時密碼、must_change_password=1）、建 profile、建試堂申請，
 * 回傳 temporaryPassword 與 message，前端顯示「請用此密碼登入並立即更改」。
 */

export const TRIAL_APPLY_ENDPOINT = 'trial-application';

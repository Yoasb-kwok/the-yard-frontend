/**
 * 預約試堂 — 前後端交互流程（Backend flow for trial application）
 *
 * 端點：`POST /api/trial-application`（公開，毋須登入）
 *
 * Request body：
 *   必填：fullName、email；試堂對班請擇一或並用
 *     - classId：具體班別 id（例如 next_class_id）
 *     - programCode：與 classes.program_code 一致時，後端可解析「該系列最近一堂班」
 *   選填：contactNumber, countryCode, username（legacy key: nickName）, dateOfBirth, sex, parentsName,
 *         residentialDistrict, hasJoinedCourses, hasDanceExperience,
 *         howDidYouHear, promoCode
 *   確認信：前端可加 sendConfirmationEmail=true（可選）要求後端在成功後寄出
 *         「試堂申請已提交」確認信給提交的 email。
 *   臨時密碼信：前端可加 sendTemporaryPasswordEmail=true（可選）要求後端在「新建帳號」時
 *         以 email 寄出隨機臨時密碼（建議一次性／需首次登入即改密碼）。
 *   建議：`trialClassName` — 使用者所選試堂在畫面上顯示的名稱（與 programCode/classId 一併送），
 *         供後端寫入 trial_applications，避免僅依 classId 解析錯誤時 admin 列表全變成同一課名。
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

/**
 * 組出 POST trial-application 的 classId / programCode（camelCase）。
 * 優先 apiClassRowId（具體班）；否則純數字 id 視為班別 id；試堂預設選項用 programCode；
 * 有 program_code 時以 programCode 為主，避免把目錄 slug 誤當 classId。
 */
export function trialApplyClassIdentifiers(data: {
  id: string;
  program_code: string;
  apiClassRowId?: string;
}): { classId?: string; programCode?: string } {
  const pc = data.program_code?.trim();
  const row = data.apiClassRowId?.trim();
  if (row) {
    return { classId: row, ...(pc ? { programCode: pc } : {}) };
  }
  const id = data.id?.trim() ?? '';
  if (id && /^\d+$/.test(id)) {
    return { classId: id, ...(pc ? { programCode: pc } : {}) };
  }
  if (id.startsWith('trial-') && pc) {
    return { programCode: pc };
  }
  if (pc) {
    return { programCode: pc };
  }
  return {};
}

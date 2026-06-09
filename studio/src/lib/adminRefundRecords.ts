export interface RefundRecord {
  id: string;
  enrollment_id: string;
  user_id: string;
  user_name: string;
  class_id: string;
  class_name: string;
  class_code: string;
  tokens_refunded: number;
  remarks: string;
  refunded_by: string;
  refunded_at: string;
}

function pickStr(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/** Normalize GET /admin/refund-records response rows. */
export function normalizeRefundRecords(raw: unknown): RefundRecord[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
      ? ((raw as { data: unknown[] }).data)
      : raw && typeof raw === 'object' && Array.isArray((raw as { records?: unknown }).records)
        ? ((raw as { records: unknown[] }).records)
        : [];

  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;
      const id = pickStr(r, 'id');
      if (!id) return null;
      return {
        id,
        enrollment_id: pickStr(r, 'enrollment_id', 'enrollmentId'),
        user_id: pickStr(r, 'user_id', 'userId'),
        user_name: pickStr(r, 'user_name', 'userName', 'student_name'),
        class_id: pickStr(r, 'class_id', 'classId'),
        class_name: pickStr(r, 'class_name', 'className'),
        class_code: pickStr(r, 'class_code', 'classCode', 'program_code'),
        tokens_refunded: Number(r.tokens_refunded ?? r.tokensRefunded ?? 0) || 0,
        remarks: pickStr(r, 'remarks', 'remark'),
        refunded_by: pickStr(r, 'refunded_by', 'refundedBy'),
        refunded_at: pickStr(r, 'refunded_at', 'refundedAt', 'created_at', 'createdAt'),
      } satisfies RefundRecord;
    })
    .filter((x): x is RefundRecord => x != null);
}

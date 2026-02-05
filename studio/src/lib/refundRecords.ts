const STORAGE_KEY = 'studio_refund_records';

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

export function getRefundRecords(): RefundRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendRefundRecord(
  r: Omit<RefundRecord, 'id' | 'refunded_at'> & { refunded_at?: string }
): RefundRecord {
  const record: RefundRecord = {
    ...r,
    id: `refund-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    refunded_at: r.refunded_at ?? new Date().toISOString(),
  };
  const list = getRefundRecords();
  list.unshift(record);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to persist refund record:', e);
  }
  window.dispatchEvent(new CustomEvent('refund-record-added'));
  return record;
}

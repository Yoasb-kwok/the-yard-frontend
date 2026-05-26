/**
 * Admin: refund 1 token when approving sick leave / extension without make-up.
 */
import { api } from './api';

export interface AdminTokenRefundInput {
  enrollment_id: string;
  user_id: string;
  user_name: string;
  class_id?: string;
  class_name: string;
  class_code?: string;
  tokens_refunded?: number;
  remarks: string;
  refunded_by: string;
}

export async function postAdminTokenRefund(input: AdminTokenRefundInput): Promise<void> {
  await api.post('/admin/refund-records', {
    enrollment_id: input.enrollment_id,
    user_id: input.user_id,
    user_name: input.user_name,
    class_id: input.class_id ?? '',
    class_name: input.class_name,
    class_code: input.class_code ?? '',
    tokens_refunded: input.tokens_refunded ?? 1,
    remarks: input.remarks,
    refunded_by: input.refunded_by,
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refund-record-added'));
  }
}

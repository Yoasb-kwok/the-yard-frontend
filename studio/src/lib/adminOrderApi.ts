import { api, ApiError } from './api';

export type AdminOrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'not_required';

/**
 * Path for PATCH to update order payment_status.
 * Default matches API spec: PATCH /api/admin/orders/:id
 * Override if your backend uses a different route, e.g. VITE_ADMIN_ORDER_PATCH_URL_TEMPLATE=payment/admin/orders/{id}
 */
export function adminOrderPaymentStatusPatchPath(orderId: string): string {
  const template = (import.meta.env.VITE_ADMIN_ORDER_PATCH_URL_TEMPLATE as string | undefined)?.trim();
  if (template) {
    return template.replace(/\{id\}/g, encodeURIComponent(orderId));
  }
  return `admin/orders/${encodeURIComponent(orderId)}`;
}

export async function patchAdminOrderPaymentStatus(
  orderId: string,
  payment_status: AdminOrderPaymentStatus
): Promise<void> {
  const res = await api.patch(adminOrderPaymentStatusPatchPath(orderId), {
    payment_status,
  });
  if (res.success === false) {
    throw new ApiError(400, res.msg || 'Request failed');
  }
}

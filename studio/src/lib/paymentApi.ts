/**
 * Stripe Hosted Checkout — backend contract (no publishable key on frontend).
 */
import { api } from './api';

export interface PaymentOrderStatus {
  id: number;
  order_id: string;
  package_id: number;
  total: number;
  payment_status: string;
  payment_method: string | null;
  token_count: number;
  stripe_checkout_session_id?: string;
  created_at: string;
  stripe_checkout_payment_status?: string | null;
}

export async function createCheckoutSession(packageId: number): Promise<{ url: string; session_id: string }> {
  const res = (await api.post('/payment/checkout-session', { package_id: packageId })) as {
    success: boolean;
    msg?: string;
    url?: string;
    session_id?: string;
  };
  if (!res.success || !res.url) {
    throw new Error(res.msg || 'Failed to start checkout');
  }
  return { url: res.url, session_id: res.session_id ?? '' };
}

export async function getOrderStatus(params: {
  session_id?: string;
  internal_id?: string;
}): Promise<PaymentOrderStatus | null> {
  const q: Record<string, string> = {};
  if (params.session_id) q.session_id = params.session_id;
  if (params.internal_id) q.internal_id = String(params.internal_id);
  const res = (await api.get('/payment/order-status', q)) as {
    success: boolean;
    msg?: string;
    order?: PaymentOrderStatus;
  };
  if (!res.success) {
    throw new Error(res.msg || 'Failed to load order status');
  }
  return res.order ?? null;
}

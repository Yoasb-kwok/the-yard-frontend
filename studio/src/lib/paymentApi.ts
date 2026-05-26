/**
 * Stripe Hosted Checkout — backend contract (no publishable key on frontend).
 */
import { api } from './api';
import { buildStripeCheckoutReturnUrls } from './appOrigin';

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

type ApiEnvelope = {
  success: boolean;
  msg?: string;
  data?: unknown;
  url?: string;
  session_id?: string;
  order?: unknown;
};

function unwrapPayload(res: ApiEnvelope): Record<string, unknown> {
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
    return res.data as Record<string, unknown>;
  }
  return res as Record<string, unknown>;
}

/** Normalize backend / mock order rows into PaymentOrderStatus. */
export function parsePaymentOrder(raw: unknown): PaymentOrderStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const paymentStatus = String(o.payment_status ?? o.status ?? '').trim();
  const orderId = String(o.order_id ?? o.id ?? '').trim();
  if (!orderId && !paymentStatus) return null;

  const pkgId = o.package_id;
  const total = Number(o.total ?? 0);
  const tokenCount = Number(o.token_count ?? o.tokens ?? 0);
  const numericId =
    typeof o.id === 'number' && Number.isFinite(o.id)
      ? o.id
      : Number(String(o.id ?? '').replace(/\D/g, '')) || 0;

  return {
    id: numericId,
    order_id: orderId || String(numericId),
    package_id: typeof pkgId === 'number' ? pkgId : Number(pkgId) || 0,
    total,
    payment_status: paymentStatus || 'pending',
    payment_method: o.payment_method != null ? String(o.payment_method) : null,
    token_count: tokenCount,
    stripe_checkout_session_id:
      (o.stripe_checkout_session_id as string | undefined) ??
      (o.stripe_session_id as string | undefined),
    created_at: String(o.created_at ?? new Date().toISOString()),
    stripe_checkout_payment_status:
      o.stripe_checkout_payment_status != null
        ? String(o.stripe_checkout_payment_status)
        : paymentStatus === 'paid'
          ? 'paid'
          : null,
  };
}

export async function createCheckoutSession(packageId: number): Promise<{ url: string; session_id: string }> {
  const returnUrls = buildStripeCheckoutReturnUrls();
  const res = (await api.post('/payment/checkout-session', {
    package_id: packageId,
    ...returnUrls,
  })) as ApiEnvelope;
  const payload = unwrapPayload(res);
  const url = String(payload.url ?? res.url ?? '').trim();
  const sessionId = String(payload.session_id ?? res.session_id ?? '').trim();
  if (!res.success || !url) {
    throw new Error(res.msg || 'Failed to start checkout');
  }
  return { url, session_id: sessionId };
}

/**
 * After Stripe redirect, sync Checkout Session server-side (card = immediate paid + token credit).
 * Webhook remains the primary path; this is a fallback when webhook is delayed or missing.
 */
export async function confirmCheckoutSession(sessionId: string): Promise<PaymentOrderStatus | null> {
  const res = (await api.post('/payment/confirm-session', {
    session_id: sessionId,
  })) as ApiEnvelope;
  if (!res.success) {
    throw new Error(res.msg || 'Failed to confirm payment');
  }
  const payload = unwrapPayload(res);
  if (payload.order) return parsePaymentOrder(payload.order);
  return parsePaymentOrder(payload);
}

export async function getOrderStatus(params: {
  session_id?: string;
  internal_id?: string;
}): Promise<PaymentOrderStatus | null> {
  const q: Record<string, string> = {};
  if (params.session_id) q.session_id = params.session_id;
  if (params.internal_id) q.internal_id = String(params.internal_id);
  const res = (await api.get('/payment/order-status', q)) as ApiEnvelope;
  if (!res.success) {
    throw new Error(res.msg || 'Failed to load order status');
  }
  const payload = unwrapPayload(res);
  if (payload.order) return parsePaymentOrder(payload.order);
  if (payload.payment_status || payload.order_id || payload.id) {
    return parsePaymentOrder(payload);
  }
  if (res.order) return parsePaymentOrder(res.order);
  return null;
}

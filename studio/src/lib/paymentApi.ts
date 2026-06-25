/**
 * Stripe Hosted Checkout — backend contract (no publishable key on frontend).
 */
import { api, ApiError } from './api';
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

export const ORDER_REMARKS_MAX_LENGTH = 50;

const PAYMENT_UNAVAILABLE_CODES = new Set([
  'PAYMENT_UNAVAILABLE',
  'STRIPE_NOT_CONFIGURED',
  'STRIPE_CHECKOUT_FAILED',
]);

/** User-facing message when card checkout cannot start (never show Stripe/server config details). */
export function resolveCheckoutStartError(
  err: unknown,
  t: (key: string, fallback?: string) => string,
): string {
  if (err instanceof ApiError) {
    if (err.code && PAYMENT_UNAVAILABLE_CODES.has(err.code)) {
      return t('shop.paymentUnavailable');
    }
    if (err.status === 502 || err.status === 503) {
      return t('shop.paymentUnavailable');
    }
  }
  return t('shop.paymentUnavailable');
}

export interface CheckoutOrderExtras {
  startDate?: string | null;
  remarks?: string | null;
}

function appendOrderExtras(body: Record<string, unknown>, extras?: CheckoutOrderExtras): void {
  const startDate = extras?.startDate?.trim();
  if (startDate) body.start_date = startDate;
  const remarks = extras?.remarks?.trim();
  if (remarks) body.remarks = remarks.slice(0, ORDER_REMARKS_MAX_LENGTH);
}

export async function createCheckoutSession(
  packageId: number,
  options?: CheckoutOrderExtras & { studentProfileId?: string | null },
): Promise<{ url: string; session_id: string }> {
  const returnUrls = buildStripeCheckoutReturnUrls();
  const body: Record<string, unknown> = {
    package_id: packageId,
    ...returnUrls,
  };
  const profileId = options?.studentProfileId?.trim();
  if (profileId) {
    body.student_profile_id = profileId;
    body.studentProfileId = profileId;
    body.profile_id = profileId;
  }
  appendOrderExtras(body, options);
  const res = (await api.post('/payment/checkout-session', body)) as ApiEnvelope;
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

export interface CreateOfflineOrderParams extends CheckoutOrderExtras {
  packageId: number;
  quantity?: number;
  paymentMethod: 'cash' | 'fps';
  studentProfileId?: string | null;
  couponId?: string | null;
  discountAmount?: number;
}

/** Create a pending cash or FPS token package order (tokens credited when admin marks paid). */
export async function createOfflineOrder(params: CreateOfflineOrderParams): Promise<PaymentOrderStatus> {
  const body: Record<string, unknown> = {
    package_id: params.packageId,
    quantity: params.quantity ?? 1,
    payment_method: params.paymentMethod,
  };
  const profileId = params.studentProfileId?.trim();
  if (profileId) {
    body.student_profile_id = profileId;
    body.studentProfileId = profileId;
    body.profile_id = profileId;
  }
  if (params.couponId) {
    body.coupon_id = params.couponId;
  }
  if (params.discountAmount != null && Number.isFinite(params.discountAmount) && params.discountAmount > 0) {
    body.discount_amount = params.discountAmount;
  }
  appendOrderExtras(body, params);

  const res = (await api.post('/orders', body)) as ApiEnvelope;
  if (!res.success) {
    throw new Error(res.msg || 'Failed to create order');
  }
  const payload = unwrapPayload(res);
  const order = parsePaymentOrder(payload);
  if (!order) {
    throw new Error('Invalid order response');
  }
  return order;
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

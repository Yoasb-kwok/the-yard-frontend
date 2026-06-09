/** Stripe replaces this when creating a Checkout Session on the backend. */
export const STRIPE_CHECKOUT_SESSION_PLACEHOLDER = '{CHECKOUT_SESSION_ID}';

/**
 * Public site origin for payment redirects (success / cancel).
 * Uses the browser origin so localhost, Vercel preview, and custom domains each get the correct return URL.
 * Optional `VITE_APP_PUBLIC_URL` overrides when the app is served behind a proxy that hides the real host.
 */
export function getAppPublicOrigin(): string {
  const override = import.meta.env.VITE_APP_PUBLIC_URL?.trim();
  if (override) return override.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

export interface StripeCheckoutReturnUrls {
  return_origin: string;
  success_url: string;
  cancel_url: string;
}

export function buildStripeCheckoutReturnUrls(): StripeCheckoutReturnUrls {
  const origin = getAppPublicOrigin();
  if (!origin) {
    throw new Error('Cannot determine app URL for payment redirect');
  }
  return {
    return_origin: origin,
    success_url: `${origin}/payment/success?session_id=${STRIPE_CHECKOUT_SESSION_PLACEHOLDER}`,
    cancel_url: `${origin}/payment/cancel`,
  };
}

export function resolveCheckoutSuccessUrl(template: string, sessionId: string): string {
  return template.replace(/\{CHECKOUT_SESSION_ID\}/gi, encodeURIComponent(sessionId));
}

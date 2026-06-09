/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Optional override for Stripe success/cancel redirects when origin cannot be inferred. */
  readonly VITE_APP_PUBLIC_URL?: string;
  /** Optional. PATCH path template for admin order payment_status; use `{id}` placeholder. Example: `payment/admin/orders/{id}` */
  readonly VITE_ADMIN_ORDER_PATCH_URL_TEMPLATE?: string;
  /** When "true" or "1", the frontend runs entirely on in-memory mock data (no backend needed). */
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

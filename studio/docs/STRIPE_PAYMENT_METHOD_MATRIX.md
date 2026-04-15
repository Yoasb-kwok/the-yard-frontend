# Stripe Payment Method Matrix (Hosted Checkout)

This matrix is for the current frontend flow:

- Frontend calls `POST /api/payment/checkout-session`
- Browser redirects to Stripe hosted page (`url`)
- Frontend verifies with `GET /api/payment/order-status?session_id=...`

Use this to track which methods are visible, testable, and correctly settled into your order records.

## Preconditions

- Backend runs with Stripe test secret key (`sk_test_...`)
- Webhook forwarding is active in local/dev (for example `stripe listen --forward-to http://localhost:3002/api/payment/webhook`)
- Frontend points to correct backend (`VITE_API_URL`)
- Test user can log in and open token checkout page
- At least one token package exists and is purchasable

## Payment Method Matrix

Legend:

- `Enabled`: method is enabled in Stripe Dashboard
- `Shown`: method appears on Checkout page for your current currency/country/session
- `Sync`: order becomes `paid` quickly (card-like)
- `Async`: may stay `pending` before webhook finalizes

| Method | Enabled | Shown | Expected Flow | Test Data | Expected Result | Notes |
|---|---|---|---|---|---|---|
| Card (Visa test) | [ ] | [ ] | Sync | `4242 4242 4242 4242`, any future expiry, any CVC | Redirect success, order status `paid`, token credited | Baseline must pass first |
| Card (decline) | [ ] | [ ] | Sync failure | `4000 0000 0000 0002` | Checkout error or failed payment, no token credit | Verify failed path UX |
| Apple Pay | [ ] | [ ] | Sync | Stripe test wallet flow | Same as card success | Requires eligible browser/device |
| Google Pay | [ ] | [ ] | Sync | Stripe test wallet flow | Same as card success | Requires eligible browser/device |
| Alipay | [ ] | [ ] | Usually Async | Stripe test redirect flow | May return as `pending`, later `paid` after webhook | Region/currency dependent |
| WeChat Pay | [ ] | [ ] | Usually Async | Stripe test redirect flow | May return as `pending`, later `paid` | Region/currency dependent |
| FPX / iDEAL / Bancontact / EPS / P24 (local methods) | [ ] | [ ] | Usually Async | Stripe method-specific test flow | Redirect + webhook finalization | Availability depends on account + currency |
| Klarna / Afterpay / Affirm (BNPL) | [ ] | [ ] | Async | Stripe test flow | Authorization/settlement varies, confirm final status | Country and currency restricted |

## How to Test (Step-by-step)

1. Enable one target method in Stripe Dashboard (`Settings -> Payment methods`).
2. Keep all other variables stable (same package, same user, same environment).
3. Start webhook forwarding and keep terminal open.
4. Login as student and start checkout from token package page.
5. Confirm method visibility on Checkout page.
6. Complete payment with Stripe test data for that method.
7. After redirect back to `/payment/success`, verify:
   - page can read `session_id`
   - order status eventually becomes `paid`
   - dashboard token balance increases
   - payment history shows a new row
8. Mark matrix row:
   - `Enabled` and `Shown`
   - actual result (`paid` vs `pending then paid`)
   - any mismatch in Notes

## Pass Criteria

For each method you support publicly:

- User can see and choose method at Checkout
- Payment can complete using test scenario
- Backend order transitions correctly (`pending` -> `paid` when async)
- Frontend reflects final state (success page, token balance, payment history)

## Common Failure Patterns

- Method enabled but not shown: usually currency/country/account capability mismatch
- Paid on Stripe but still pending in app: webhook forwarding/config/signing secret issue
- Checkout creation fails: route/env mismatch (`/api/payment/checkout-session`)
- Success page loads but no order: missing/invalid `session_id` in redirect URL

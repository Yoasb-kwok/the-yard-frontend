# Stripe 信用卡：即時入帳（非管理員「待處理→已付款」）

## 產品規則

| 付款方式 | 訂單初始狀態 | 代幣入帳 |
|---------|-------------|---------|
| **Stripe 信用卡 / Apple Pay / Google Pay** | 建立訂單後，Stripe 付款成功即 **`paid`** | **立即** 寫入 `user_tokens` |
| FPS / 現金 / 上傳收據 | `pending` | 管理員在後台改為 `paid` 後才入帳 |

信用卡**不應**依賴管理員手動把「待處理」改為「已付款」。

## 付款完成後跳回正確網址

前端建立 Checkout 時會帶上**目前瀏覽器網域**（`window.location.origin`），例如：

- 本機：`http://localhost:5173`
- Vercel 預覽：`https://xxx.vercel.app`
- 正式網域：`https://theyard.01tech.work`

`POST /api/payment/checkout-session` body 範例：

```json
{
  "package_id": 1,
  "return_origin": "http://localhost:5173",
  "success_url": "http://localhost:5173/payment/success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "http://localhost:5173/payment/cancel"
}
```

**後端建立 Stripe Checkout Session 時必須使用請求中的 `success_url` / `cancel_url`**（將 `{CHECKOUT_SESSION_ID}` 留給 Stripe 替換），不要寫死單一 `APP_PUBLIC_URL`，否則本機付款會跳回正式站。

僅在無 body 時才 fallback：`APP_PUBLIC_URL` 或 `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` 環境變數。

## 後端必須實作（生產環境）

### 1. Webhook（主要路徑）

`POST /api/payment/webhook` — 監聽 `checkout.session.completed`：

1. 用 `metadata.order_id` 或 `client_reference_id` 找到訂單
2. 確認 Stripe Session `payment_status === 'paid'`
3. 更新訂單 `payment_status = 'paid'`
4. **冪等**建立 `user_tokens`（同一 `order_id` 勿重複加幣）

### 2. 成功頁同步（建議，webhook 延遲時的備援）

`POST /api/payment/confirm-session`  
Body: `{ "session_id": "<stripe_checkout_session_id>" }`  
Auth: Bearer（僅能確認自己的訂單）

邏輯：

1. `stripe.checkout.sessions.retrieve(session_id)`
2. 若 `payment_status === 'paid'` → 更新訂單為 `paid` + 入帳代幣（與 webhook 相同、冪等）
3. 回傳：

```json
{
  "success": true,
  "data": {
    "status": "paid",
    "order": {
      "id": 1,
      "order_id": "ORD-xxx",
      "package_id": 1,
      "total": 900,
      "payment_status": "paid",
      "payment_method": "card",
      "token_count": 10,
      "stripe_checkout_session_id": "cs_...",
      "stripe_checkout_payment_status": "paid",
      "created_at": "..."
    }
  }
}
```

### 3. 查詢狀態

`GET /api/payment/order-status?session_id=...`  
回傳格式同上（`data.order` 或 `data` 內含訂單欄位）。**勿**只回傳裸 `order` 在頂層而沒有 `data`（前端已兼容兩種形狀）。

## 前端（本 repo）

- `PaymentSuccessPage`：回到 `/payment/success?session_id=...` 後先呼叫 **`confirm-session`**，再輪詢 **`order-status`**
- `paymentApi.ts`：從 `res.data` 解析 `url` / `order`（修復先前只讀頂層導致永遠輪詢不到的問題）
- Demo mock：`checkout-session` 建立 `pending` 訂單；`confirm-session` 改 `paid` 並加代幣

## 常見故障

- Stripe 已扣款，App 仍 **待處理**、無代幣：webhook 未設定 / 簽名錯誤 / 未處理 `checkout.session.completed`，且未實作 `confirm-session`
- 成功頁一直轉圈：後端 `order-status` 未回 `payment_status: "paid"` 或欄位名不一致

## 檢查清單（後端同事）

- [ ] `checkout-session` 建立訂單時可為 `pending`，但**勿**在 webhook/confirm 前發放代幣
- [ ] Webhook 入帳冪等
- [ ] `confirm-session` 已部署（與 webhook 共用同一套「標記 paid + 加幣」函數）
- [ ] `order-status` 回傳 `token_count`、`order_id`、`payment_status`

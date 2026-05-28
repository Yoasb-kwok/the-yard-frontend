/**
 * Demo: 生成收據 HTML，可下載為 .html 並在瀏覽器開啟後列印成 PDF。
 */

export interface ReceiptData {
  orderId: string;
  date: string;
  description: string;
  paymentMethod: string;
  amount: string;
  status: string;
  billedTo?: string;
  quantity?: string;
  unitPrice?: string;
  discount?: string;
  notes?: string;
  /** 收據標題（e.g. 付款收據） */
  receiptTitle: string;
  /** 訂單號、日期、描述等欄位標籤 */
  labels: {
    orderId: string;
    date: string;
    description: string;
    paymentMethod: string;
    amount: string;
    status: string;
  };
  /** 頁尾提示（e.g. 可列印為 PDF） */
  printHint: string;
  /** 品牌名稱 */
  brandName: string;
  /** Logo image source */
  logoSrc?: string;
}

const defaultLabels = {
  orderId: 'Order ID',
  date: 'Date',
  description: 'Description',
  paymentMethod: 'Payment Method',
  amount: 'Amount',
  status: 'Status',
};

export function buildReceiptHtml(data: Partial<ReceiptData> & Pick<ReceiptData, 'orderId' | 'date' | 'description' | 'paymentMethod' | 'amount' | 'status'>): string {
  const { labels: dataLabels, ...rest } = data ?? {};
  const d: ReceiptData = {
    receiptTitle: 'Payment Receipt',
    printHint: 'You can print this page (Ctrl+P / Cmd+P) and choose "Save as PDF".',
    brandName: 'The Yard',
    logoSrc: '/images/(Final)Logo.png',
    ...rest,
    labels: { ...defaultLabels, ...dataLabels },
  };

  const subtotal = d.amount || '-';
  const discount = d.discount || '-';
  const total = d.amount || '-';

  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Official Receipt - ${escapeHtml(d.orderId)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Arial", "Helvetica Neue", sans-serif;
      margin: 0;
      padding: 24px 0;
      color: #111111;
      background: #f3f4f6;
      line-height: 1.25;
    }
    .receipt {
      width: 720px;
      margin: 0 auto;
      border: 2px solid #1f1f1f;
      overflow: hidden;
      background: #ffffff;
    }
    .header {
      display: grid;
      grid-template-columns: 128px 1fr;
      border-bottom: 2px solid #1f1f1f;
    }
    .logo-box {
      border-right: 2px solid #1f1f1f;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      overflow: hidden;
    }
    .logo-box img {
      max-width: 100%;
      max-height: 100%;
      width: 100%;
      height: auto;
      object-fit: contain;
    }
    .header-main {
      text-align: center;
      padding: 10px 14px 8px;
    }
    .school-name {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.6px;
    }
    .school-sub {
      margin: 2px 0 8px;
      font-size: 34px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .addr {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
    }
    .block {
      border-bottom: 2px solid #1f1f1f;
      padding: 16px 24px;
    }
    .row {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .row:last-child { margin-bottom: 0; }
    .table-wrap {
      padding: 40px 24px 28px;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    table.items th,
    table.items td {
      border: 1px solid #1f1f1f;
      padding: 10px 8px;
      font-size: 13px;
      vertical-align: middle;
      word-break: break-word;
    }
    table.items th {
      background: #0f0f0f;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-size: 12px;
      height: 44px;
    }
    table.items td {
      height: 44px;
    }
    .c-desc { width: 43%; }
    .c-qty { width: 14%; text-align: center; }
    .c-unit { width: 14%; text-align: center; }
    .c-discount { width: 14%; text-align: center; }
    .c-total { width: 15%; text-align: center; }
    .summary-grid {
      margin-top: 22px;
      display: grid;
      grid-template-columns: 1fr 230px;
      gap: 20px;
      align-items: start;
    }
    .meta-left .meta-row {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .summary-right .line {
      border-bottom: 1px solid #1f1f1f;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.35;
    }
    .summary-right .line span {
      float: right;
    }
    .summary-right .total {
      margin-top: 6px;
      font-size: 18px;
      font-weight: 700;
    }
    .notes {
      padding: 10px 24px 0;
      font-size: 14px;
      font-weight: 700;
    }
    .foot {
      padding: 18px 24px 24px;
      min-height: 250px;
    }
    .contact {
      font-size: 13px;
      margin-bottom: 22px;
      line-height: 1.35;
    }
    .sign {
      text-align: right;
      margin-bottom: 18px;
      font-size: 13px;
      font-weight: 700;
    }
    .director {
      text-align: right;
      font-size: 12px;
      line-height: 1.25;
      margin-bottom: 16px;
    }
    .director-name {
      font-weight: 700;
      font-size: 14px;
    }
    .director-title {
      font-weight: 400;
    }
    .terms {
      border-top: 1px solid #1f1f1f;
      margin-top: 10px;
      padding-top: 12px;
      font-size: 14px;
      line-height: 1.35;
    }
    .terms ul {
      margin: 4px 0 0;
      padding-left: 16px;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .receipt { width: 100%; border-width: 2px; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="logo-box">
        <img src="${escapeHtml(d.logoSrc || '')}" alt="${escapeHtml(d.brandName)} logo" />
      </div>
      <div class="header-main">
        <p class="school-name">YAYAKIDS 兒童舞蹈學校</p>
        <p class="school-sub">OFFICIAL RECEIPT</p>
        <p class="addr">總校：新蒲崗六合街21號ARTISAN LAB 7樓全層<br/>7/F, TRIUM LAB, 21 LUK HOP STREET, SAN PO KONG</p>
      </div>
    </div>
    <div class="block">
      <div class="row">RECEIPT NO.: ${escapeHtml(d.orderId)}</div>
      <div class="row">BILLED TO: ${escapeHtml(d.billedTo || '-')}</div>
      <div class="row">RECEIPT DATE: ${escapeHtml(d.date)}</div>
    </div>
    <div class="table-wrap">
      <table class="items">
        <thead>
          <tr>
            <th class="c-desc">DESCRIPTION</th>
            <th class="c-qty">QTY.</th>
            <th class="c-unit">UNIT PRICE</th>
            <th class="c-discount">ANY DISCOUNT</th>
            <th class="c-total">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="c-desc">${escapeHtml(d.description)}</td>
            <td class="c-qty">${escapeHtml(d.quantity || '1')}</td>
            <td class="c-unit">${escapeHtml(d.unitPrice || d.amount)}</td>
            <td class="c-discount">${escapeHtml(discount)}</td>
            <td class="c-total">${escapeHtml(d.amount)}</td>
          </tr>
          <tr><td></td><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td><td></td></tr>
        </tbody>
      </table>
      <div class="summary-grid">
        <div class="meta-left">
          <div class="meta-row">PAYMENT METHOD: ${escapeHtml(d.paymentMethod)}</div>
          <div class="meta-row">TRANSACTION ID: ${escapeHtml(d.orderId)}</div>
          <div class="meta-row">NOTES: ${escapeHtml(d.notes || '-')}</div>
        </div>
        <div class="summary-right">
          <div class="line">SUB-TOTAL: <span>${escapeHtml(subtotal)}</span></div>
          <div class="line">DISCOUNT: <span>${escapeHtml(discount)}</span></div>
          <div class="line total">TOTAL: <span>${escapeHtml(total)}</span></div>
        </div>
      </div>
    </div>
    <div class="foot">
      <div class="sign">(SIGNATURE / STAMP)</div>
      <div class="contact">
        Contact Information:<br/>
        Email: Yayakidshk@gmail.com<br/>
        Whatsapp: +85291833560
      </div>
      <div class="director">
        <div class="director-name">CHARLENE KWONG</div>
        <div class="director-title">PRINCIPAL & DIRECTOR</div>
        <div class="director-title">YAS CREATIVE DEVELOPMENT LIMITED</div>
      </div>
      <div class="terms">
        Terms & Conditions:
        <ul>
          <li>By enrolling in our courses, the applicant/parent/guardian acknowledges that they have read, understood, and agreed to abide by the school rules and regulations.</li>
          <li>All fees paid are non-refundable, non-transferable, and non-exchangeable under any circumstances, except in the case of course cancellation or full enrollment.</li>
          <li>YAYAKIDS DANCE reserves the right of final decision in case of any disputes.</li>
          <li>Parents must ensure that the student is in good health and fit for dance activities.</li>
          <li>The school reserves the right to take photographs and videos during classes/events for promotional and educational purposes.</li>
        </ul>
        <div style="text-align:right;">(VER 2026.05)</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(s).replace(/[&<>"']/g, (c) => map[c] ?? c);
}

/** 觸發下載 HTML 收據為 .html 檔案 */
export function downloadReceiptHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

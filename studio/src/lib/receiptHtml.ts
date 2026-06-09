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

function resolveDefaultLogoSrc(): string {
  const path = '/images/(Final)Logo.png';
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }
  return path;
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
    printHint: 'Press Ctrl+P (Mac: Cmd+P) to print or save as PDF. Disable "Headers and footers" to avoid extra text at the top.',
    brandName: 'The Yard',
    logoSrc: resolveDefaultLogoSrc(),
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
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      border-bottom: 1px solid #1f1f1f;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.35;
      padding: 2px 0;
    }
    .summary-right .line span {
      flex-shrink: 0;
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
    .addr-sub {
      font-weight: 700;
    }
    .print-shell {
      width: 100%;
    }
    .print-hint {
      max-width: 720px;
      margin: 16px auto 0;
      padding: 10px 14px;
      font-size: 13px;
      color: #4b5563;
      text-align: center;
      background: #e5e7eb;
      border-radius: 6px;
    }
    /* 螢幕與列印共用：強制輸出背景色與邊框色 */
    html {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    @media print {
      html, body {
        width: 210mm;
        height: 297mm;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        overflow: hidden;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print-hint {
        display: none !important;
      }
      .print-shell {
        width: 210mm;
        height: 297mm;
        padding: 5mm;
        margin: 0;
        overflow: hidden;
        display: block;
        box-sizing: border-box;
      }
      .receipt {
        width: 100% !important;
        max-width: none !important;
        height: 100% !important;
        min-height: 287mm !important;
        max-height: 287mm !important;
        margin: 0 !important;
        border: 2px solid #1f1f1f !important;
        background: #fff !important;
        box-shadow: none !important;
        transform: none !important;
        display: flex !important;
        flex-direction: column !important;
        page-break-inside: avoid;
        break-inside: avoid;
        overflow: hidden;
      }
      .header {
        flex: 0 0 auto;
        grid-template-columns: 32mm 1fr;
        border-bottom: 2px solid #1f1f1f !important;
      }
      .logo-box {
        border-right: 2px solid #1f1f1f !important;
        padding: 5mm 4mm;
      }
      .logo-box img {
        max-height: 28mm;
        width: auto;
      }
      .header-main {
        padding: 4mm 5mm 3mm;
      }
      .school-name {
        font-size: 18px;
      }
      .school-sub {
        font-size: 28px;
        margin: 2mm 0 3mm;
      }
      .addr-main,
      .addr-sub {
        font-size: 12px;
        line-height: 1.3;
      }
      .block {
        flex: 0 0 auto;
        padding: 5mm 6mm;
        border-bottom: 2px solid #1f1f1f !important;
      }
      .row {
        font-size: 14px;
        margin-bottom: 3mm;
      }
      .table-wrap {
        flex: 0 0 auto;
        padding: 6mm 6mm 5mm;
      }
      table.items th,
      table.items td {
        border: 1px solid #1f1f1f !important;
        padding: 3mm 2mm;
        font-size: 12px;
        height: auto;
        min-height: 10mm;
      }
      table.items th {
        background: #0f0f0f !important;
        color: #fff !important;
        font-size: 11px;
        min-height: 11mm;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      table.items tbody tr.empty-row {
        display: none !important;
      }
      .summary-grid {
        margin-top: 5mm;
        gap: 6mm;
        grid-template-columns: 1fr 52mm;
      }
      .meta-left .meta-row {
        font-size: 13px;
        margin-bottom: 3.5mm;
      }
      .summary-right .line {
        font-size: 13px;
        padding: 1.5mm 0;
      }
      .summary-right .total {
        font-size: 16px;
        margin-top: 2mm;
      }
      .foot {
        flex: 1 1 auto;
        display: flex !important;
        flex-direction: column !important;
        padding: 5mm 6mm 6mm !important;
        min-height: 0 !important;
      }
      .foot-extra {
        flex: 1;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        min-height: 100%;
      }
      .sign {
        font-size: 11px;
        margin-bottom: 0;
      }
      .contact {
        font-size: 11px;
        line-height: 1.35;
        margin-bottom: 0;
      }
      .director {
        font-size: 10.5px;
        line-height: 1.3;
        margin-bottom: 0;
      }
      .director-name {
        font-size: 12px;
      }
      .director-title {
        font-size: 10px;
      }
      .terms {
        flex: 1;
        display: flex;
        flex-direction: column;
        margin-top: 4mm;
        padding-top: 4mm;
        font-size: 9.5px;
        line-height: 1.28;
        border-top: 1px solid #1f1f1f !important;
      }
      .terms ul {
        flex: 1;
        margin: 2mm 0 0;
        padding-left: 4.5mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .terms li {
        margin-bottom: 0;
      }
      .terms-ver {
        font-size: 9px;
        margin-top: 3mm;
        flex-shrink: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-shell">
  <div class="receipt">
    <div class="header">
      <div class="logo-box">
        <img src="${escapeHtml(d.logoSrc || '')}" alt="${escapeHtml(d.brandName)} logo" width="112" height="96" decoding="sync" />
      </div>
      <div class="header-main">
        <p class="school-name">YAYAKIDS 兒童舞蹈學校</p>
        <p class="school-sub">OFFICIAL RECEIPT</p>
        <p class="addr"><span class="addr-main">總校：新蒲崗六合街21號ARTISAN LAB 7樓全層</span><br/><span class="addr-sub">7/F, TRIUM LAB, 21 LUK HOP STREET, SAN PO KONG</span></p>
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
          <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>
          <tr class="empty-row"><td></td><td></td><td></td><td></td><td></td></tr>
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
      <div class="foot-extra">
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
        <div class="terms-ver" style="text-align:right;">(VER 2026.05)</div>
      </div>
      </div>
    </div>
  </div>
  </div>
  <p class="print-hint">${escapeHtml(d.printHint)}</p>
  <script>
    (function () {
      function markReady() {
        document.documentElement.setAttribute('data-receipt-ready', 'true');
      }
      if (document.readyState === 'complete') {
        markReady();
      } else {
        window.addEventListener('load', markReady, { once: true });
      }
    })();
  </script>
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

export interface PurchaseReceiptOptions {
  orderId: string;
  date: string;
  description: string;
  paymentMethod: string;
  totalFormatted: string;
  status: string;
  billedTo: string;
  quantity: string;
  unitPrice?: string;
  discountFormatted?: string;
  notes?: string;
  receiptTitle: string;
  printHint: string;
  labels: ReceiptData['labels'];
  brandName?: string;
}

/** 與學生購買紀錄相同的收據 HTML（YAYAKIDS OFFICIAL RECEIPT 版型） */
export function buildPurchaseReceiptHtml(options: PurchaseReceiptOptions): string {
  return buildReceiptHtml({
    orderId: options.orderId,
    date: options.date,
    description: options.description,
    paymentMethod: options.paymentMethod,
    amount: options.totalFormatted,
    status: options.status,
    billedTo: options.billedTo,
    quantity: options.quantity,
    unitPrice: options.unitPrice ?? options.totalFormatted,
    discount: options.discountFormatted,
    notes: options.notes,
    receiptTitle: options.receiptTitle,
    labels: options.labels,
    printHint: options.printHint,
    brandName: options.brandName ?? 'The Yard',
  });
}

export function getPurchaseReceiptLine(params: {
  packageName: string;
  packageId?: string;
  tokenCount?: number;
  packageQuantity?: number;
  translate?: (key: string, opts?: { defaultValue?: string }) => string;
  tokensLabel?: string;
}): { description: string; quantity: string } {
  const packageQuantity = params.packageQuantity ?? 1;
  const tokensPerPackage = params.tokenCount ?? 0;
  const totalTokens = tokensPerPackage > 0 ? tokensPerPackage * packageQuantity : packageQuantity;
  const tokensLabel = params.tokensLabel ?? 'tokens';
  let packageName = params.packageName;
  if (params.packageId && params.translate) {
    packageName = params.translate(`tokenPackage.packages.${params.packageId}.name`, {
      defaultValue: params.packageName,
    });
  }
  const description =
    tokensPerPackage > 0 ? `${packageName} - ${totalTokens} ${tokensLabel}` : packageName;
  const quantity = tokensPerPackage > 0 ? String(totalTokens) : String(packageQuantity);
  return { description, quantity };
}

/** 在新分頁開啟收據 HTML（可列印 / 另存 PDF） */
export function openReceiptHtml(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

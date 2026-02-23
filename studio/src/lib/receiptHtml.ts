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
  const d: ReceiptData = {
    receiptTitle: 'Payment Receipt',
    labels: defaultLabels,
    printHint: 'You can print this page (Ctrl+P / Cmd+P) and choose "Save as PDF".',
    brandName: 'The Yard',
    ...data,
    labels: { ...defaultLabels, ...data.labels },
  };

  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(d.receiptTitle)} - ${escapeHtml(d.orderId)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #111;
      background: #fff;
      line-height: 1.5;
    }
    .receipt {
      max-width: 420px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .receipt-header {
      background: #1a365d;
      color: #fff;
      padding: 20px;
      text-align: center;
    }
    .receipt-header h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
    }
    .receipt-header .sub {
      margin-top: 4px;
      font-size: 0.75rem;
      opacity: 0.9;
    }
    .receipt-body {
      padding: 20px;
    }
    .receipt-body table {
      width: 100%;
      border-collapse: collapse;
    }
    .receipt-body tr {
      border-bottom: 1px solid #f3f4f6;
    }
    .receipt-body tr:last-child { border-bottom: none; }
    .receipt-body td {
      padding: 10px 0;
      vertical-align: top;
    }
    .receipt-body td:first-child {
      color: #6b7280;
      font-size: 0.875rem;
      width: 38%;
    }
    .receipt-body td:last-child {
      font-weight: 500;
      text-align: right;
    }
    .amount-row .receipt-amount {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1a365d;
    }
    .receipt-footer {
      padding: 16px 20px;
      background: #f9fafb;
      font-size: 0.75rem;
      color: #6b7280;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
      .receipt { box-shadow: none; border: 1px solid #e5e7eb; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <h1>${escapeHtml(d.brandName)}</h1>
      <div class="sub">${escapeHtml(d.receiptTitle)}</div>
    </div>
    <div class="receipt-body">
      <table>
        <tr>
          <td>${escapeHtml(d.labels.orderId)}</td>
          <td>${escapeHtml(d.orderId)}</td>
        </tr>
        <tr>
          <td>${escapeHtml(d.labels.date)}</td>
          <td>${escapeHtml(d.date)}</td>
        </tr>
        <tr>
          <td>${escapeHtml(d.labels.description)}</td>
          <td>${escapeHtml(d.description)}</td>
        </tr>
        <tr>
          <td>${escapeHtml(d.labels.paymentMethod)}</td>
          <td>${escapeHtml(d.paymentMethod)}</td>
        </tr>
        <tr class="amount-row">
          <td>${escapeHtml(d.labels.amount)}</td>
          <td class="receipt-amount">${escapeHtml(d.amount)}</td>
        </tr>
        <tr>
          <td>${escapeHtml(d.labels.status)}</td>
          <td>${escapeHtml(d.status)}</td>
        </tr>
      </table>
    </div>
    <div class="receipt-footer">
      ${escapeHtml(d.printHint)}
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

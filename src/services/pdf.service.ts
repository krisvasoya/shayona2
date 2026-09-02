import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { InvoiceDetail } from '@/src/types/invoice';
import { DbProfile } from '@/src/types/database';
import { SupportedLanguage } from '@/src/localization';
import { formatCurrency, paiseToRupees, amountInWords, formatPhoneDisplay } from '@/src/utils';

export interface InvoicePdfOptions {
  invoice: InvoiceDetail;
  profile: DbProfile;
  language?: SupportedLanguage;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatInvoiceDate(dateString: string): string {
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      const month = SHORT_MONTHS[monthIndex] || parts[1];
      return `${day} ${month} ${year}`;
    }
  } catch {
    // fallback
  }
  return dateString;
}

export const pdfService = {
  /**
   * Generates clean, professional, non-GST printable HTML for customer-facing invoice.
   * STRICT REQUIREMENT: Shows ONLY Subtotal & Grand Total (NO Jama, NO Paid Amount, NO Baki, NO Remaining Due).
   */
  generateInvoiceHtml(options: InvoicePdfOptions): string {
    const { invoice, profile, language = 'en' } = options;

    const isGu = language === 'gu';

    // Format Date: e.g. "02 Sep 2026"
    const formattedDate = formatInvoiceDate(invoice.invoice_date);

    const shopName = profile.shop_name || 'Shayona Enterprise';
    const shopPhone = profile.phone ? formatPhoneDisplay(profile.phone) : '';

    const grandTotalRupees = paiseToRupees(Number(invoice.total_amount || 0));
    const wordsText = amountInWords(grandTotalRupees, language);

    // UI Translations - NO JAMA, NO BAKI, NO GST
    const t = {
      title: isGu ? 'ઇનવોઇસ (INVOICE)' : 'INVOICE',
      invoiceNo: isGu ? 'ઇનવોઇસ નંબર' : 'INVOICE NO.',
      invoiceDate: isGu ? 'તારીખ' : 'INVOICE DATE',
      mobile: isGu ? 'મોબાઇલ' : 'Mobile',
      partyLabel:
        invoice.party_type === 'CUSTOMER'
          ? isGu
            ? 'ગ્રાહક (CUSTOMER)'
            : 'CUSTOMER'
          : isGu
            ? 'વેપારી (BUYER)'
            : 'BUYER',
      colNo: '#',
      colDesc: isGu ? 'વિગત (DESCRIPTION)' : 'DESCRIPTION',
      colQty: isGu ? 'જથ્થો (QTY)' : 'QTY',
      colRate: isGu ? 'ભાવ (RATE)' : 'RATE (₹)',
      colAmount: isGu ? 'રકમ (AMOUNT)' : 'AMOUNT (₹)',
      subtotal: isGu ? 'સબટોટલ (Subtotal)' : 'Subtotal',
      grandTotal: isGu ? 'કુલ રકમ (Grand Total)' : 'Grand Total',
      amountInWordsTitle: isGu
        ? 'અંકે રૂપિયા શબ્દોમાં (AMOUNT IN WORDS)'
        : 'AMOUNT CHARGEABLE (IN WORDS)',
      signatory: isGu ? 'સહી / સિક્કો' : 'Authorised Signatory',
      notes: isGu ? 'નોંધ (Terms & Notes)' : 'Terms & Notes',
    };

    // Render Table Rows
    const itemsRowsHtml = invoice.items
      .map((item, index) => {
        const itemQty = Number(item.quantity);

        return `
          <tr class="item-row">
            <td class="col-num">${index + 1}</td>
            <td class="col-desc">${item.item_name}</td>
            <td class="col-qty">${itemQty}</td>
            <td class="col-rate">${formatCurrency(Number(item.rate))}</td>
            <td class="col-amount">${formatCurrency(Number(item.amount))}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="${language}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice #${invoice.invoice_number}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            font-family: 'Inter', 'Noto Sans Gujarati', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #000000;
            background: #FFFFFF;
            padding: 16px;
            font-size: 13px;
            line-height: 1.4;
          }

          .invoice-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #000000;
            padding: 16px;
            background: #FFFFFF;
          }

          /* Header & Title */
          .invoice-title {
            text-align: center;
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            padding-bottom: 8px;
            border-bottom: 2px solid #000000;
            margin-bottom: 12px;
          }

          /* Top Info Table */
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }

          .header-table td {
            vertical-align: top;
          }

          .shop-col {
            width: 60%;
            padding-right: 12px;
          }

          .shop-name {
            font-size: 18px;
            font-weight: 800;
            color: #000000;
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .shop-phone {
            font-size: 13px;
            font-weight: 600;
            color: #333333;
          }

          .meta-col {
            width: 40%;
            text-align: right;
          }

          .meta-label {
            font-size: 11px;
            font-weight: 600;
            color: #555555;
            text-transform: uppercase;
          }

          .meta-value {
            font-size: 14px;
            font-weight: 700;
            color: #000000;
            margin-bottom: 6px;
          }

          /* Customer Section */
          .customer-box {
            border: 1.5px solid #000000;
            padding: 8px 12px;
            margin-bottom: 14px;
            background-color: #FAFAFA;
          }

          .customer-label {
            font-size: 11px;
            font-weight: 700;
            color: #555555;
            text-transform: uppercase;
            margin-bottom: 2px;
          }

          .customer-name {
            font-size: 15px;
            font-weight: 700;
            color: #000000;
          }

          /* Items Table */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }

          .items-table th {
            background-color: #F3F4F6;
            color: #000000;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            padding: 8px 6px;
            border: 1px solid #000000;
          }

          .items-table td {
            padding: 8px 6px;
            font-size: 13px;
            border: 1px solid #D1D5DB;
          }

          .col-num {
            width: 6%;
            text-align: center;
            font-weight: 600;
          }

          .col-desc {
            width: 50%;
            text-align: left;
            font-weight: 500;
          }

          .col-qty {
            width: 14%;
            text-align: center;
          }

          .col-rate {
            width: 15%;
            text-align: right;
          }

          .col-amount {
            width: 15%;
            text-align: right;
            font-weight: 600;
          }

          .item-row:nth-child(even) {
            background-color: #F9FAFB;
          }

          /* Bottom Layout: Amount in Words & Totals */
          .summary-section {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }

          .summary-section td {
            vertical-align: top;
          }

          .words-col {
            width: 55%;
            padding-right: 12px;
          }

          .totals-col {
            width: 45%;
          }

          .words-box {
            border: 1.5px solid #000000;
            padding: 10px 12px;
            min-height: 80px;
            background: #FAFAFA;
          }

          .words-title {
            font-size: 11px;
            font-weight: 700;
            color: #555555;
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .words-content {
            font-size: 13px;
            font-weight: 600;
            color: #000000;
          }

          /* Totals Table - ONLY Subtotal and Grand Total */
          .totals-table {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000000;
          }

          .totals-table td {
            padding: 8px 10px;
            font-size: 13px;
            border-bottom: 1px solid #E5E7EB;
          }

          .totals-label {
            font-weight: 600;
            color: #374151;
          }

          .totals-value {
            text-align: right;
            font-weight: 700;
            color: #000000;
          }

          .grand-total-row {
            background-color: #F3F4F6;
            border-top: 1.5px solid #000000;
          }

          .grand-total-row td {
            padding: 10px 10px;
            font-size: 15px;
            font-weight: 800;
            color: #000000;
          }

          /* Footer & Signatory */
          .footer-section {
            width: 100%;
            margin-top: 24px;
            border-collapse: collapse;
          }

          .footer-section td {
            vertical-align: bottom;
          }

          .signatory-box {
            text-align: right;
            padding-top: 24px;
          }

          .signatory-label {
            font-size: 12px;
            color: #4B5563;
            margin-bottom: 28px;
            font-weight: 500;
          }

          .signatory-name {
            font-size: 14px;
            font-weight: 700;
            color: #000000;
            text-transform: uppercase;
          }

          @media print {
            body {
              padding: 0;
            }
            .invoice-container {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- 1. Invoice Title -->
          <div class="invoice-title">${t.title}</div>

          <!-- 2. Header: Shop Info & Invoice Meta -->
          <table class="header-table">
            <tr>
              <td class="shop-col">
                <div class="shop-name">${shopName}</div>
                ${shopPhone ? `<div class="shop-phone">${t.mobile}: ${shopPhone}</div>` : ''}
              </td>
              <td class="meta-col">
                <div class="meta-label">${t.invoiceNo}</div>
                <div class="meta-value">${invoice.invoice_number}</div>
                <div class="meta-label">${t.invoiceDate}</div>
                <div class="meta-value">${formattedDate}</div>
              </td>
            </tr>
          </table>

          <!-- 3. Customer / Buyer Box -->
          <div class="customer-box">
            <div class="customer-label">${t.partyLabel}</div>
            <div class="customer-name">${invoice.party_name}</div>
          </div>

          <!-- 4. Item Table (Zero GST / Clean Retail) -->
          <table class="items-table">
            <thead>
              <tr>
                <th class="col-num">${t.colNo}</th>
                <th class="col-desc">${t.colDesc}</th>
                <th class="col-qty">${t.colQty}</th>
                <th class="col-rate">${t.colRate}</th>
                <th class="col-amount">${t.colAmount}</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>

          <!-- 5. Bottom Section: Amount in Words & Financial Breakdown (Subtotal & Grand Total ONLY) -->
          <table class="summary-section">
            <tr>
              <td class="words-col">
                <div class="words-box">
                  <div class="words-title">${t.amountInWordsTitle}</div>
                  <div class="words-content">₹ ${wordsText}</div>
                </div>
              </td>
              <td class="totals-col">
                <table class="totals-table">
                  <tr>
                    <td class="totals-label">${t.subtotal}</td>
                    <td class="totals-value">${formatCurrency(Number(invoice.total_amount))}</td>
                  </tr>
                  <tr class="grand-total-row">
                    <td class="totals-label">${t.grandTotal}</td>
                    <td class="totals-value">${formatCurrency(Number(invoice.total_amount))}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- 6. Authorized Signatory -->
          <table class="footer-section">
            <tr>
              <td style="width: 50%;">
                ${
                  invoice.notes
                    ? `<div style="font-size: 11px; color: #666666;"><strong>${t.notes}:</strong> ${invoice.notes}</div>`
                    : ''
                }
              </td>
              <td style="width: 50%;">
                <div class="signatory-box">
                  <div class="signatory-label">${t.signatory}</div>
                  <div class="signatory-name">${shopName}</div>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Print or create PDF file from Invoice with a clean, shareable local file path.
   * Directly writes Base64 or copies to cacheDirectory so Android FileProvider has valid permissions.
   */
  async createInvoicePdf(options: InvoicePdfOptions): Promise<{ uri: string }> {
    const html = this.generateInvoiceHtml(options);
    const { uri: tempUri, base64 } = await Print.printToFileAsync({
      html,
      base64: true,
    });

    try {
      // Clean and sanitize invoice number for filename
      const safeInvoiceNum = (options.invoice.invoice_number || 'INV').replace(
        /[^a-zA-Z0-9_-]/g,
        '_',
      );
      const targetFileName = `Invoice-${safeInvoiceNum}.pdf`;

      const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (targetDir) {
        const targetUri = `${targetDir}${targetFileName}`;

        // If file already exists from a previous run, delete it first to prevent copyAsync collisions
        const existingInfo = await FileSystem.getInfoAsync(targetUri);
        if (existingInfo.exists) {
          await FileSystem.deleteAsync(targetUri, { idempotent: true });
        }

        // Prefer writing direct base64 bytes for rock-solid Android FileProvider compatibility
        if (base64) {
          await FileSystem.writeAsStringAsync(targetUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } else {
          await FileSystem.copyAsync({
            from: tempUri,
            to: targetUri,
          });
        }

        const fileInfo = await FileSystem.getInfoAsync(targetUri);
        if (fileInfo.exists && fileInfo.size > 0) {
          return { uri: targetUri };
        }
      }
    } catch {
      // Fallback to tempUri if writing/copying fails
    }

    return { uri: tempUri };
  },

  /**
   * Share generated PDF file via system share sheet
   */
  async shareInvoicePdf(uri: string, invoiceNumber?: string): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device.');
    }

    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists || fileInfo.size === 0) {
      throw new Error('Generated invoice PDF file could not be found or is empty.');
    }

    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: invoiceNumber ? `Share Bill #${invoiceNumber}` : 'Share Invoice',
    });
  },

  /**
   * Checks if WhatsApp is installed on the device
   */
  async isWhatsAppInstalled(): Promise<boolean> {
    try {
      return await Linking.canOpenURL('whatsapp://send');
    } catch {
      return false;
    }
  },

  /**
   * Share invoice PDF via WhatsApp
   */
  async shareInvoiceViaWhatsApp(uri: string, invoiceNumber?: string): Promise<void> {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device.');
    }

    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists || fileInfo.size === 0) {
      throw new Error('Generated invoice PDF file could not be found or is empty.');
    }

    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: invoiceNumber ? `Send Bill #${invoiceNumber} via WhatsApp` : 'Send via WhatsApp',
    });
  },

  /**
   * Print invoice using native print service.
   * Uses customer-facing invoice HTML (Subtotal & Grand Total ONLY).
   */
  async printInvoice(options: InvoicePdfOptions): Promise<void> {
    const html = this.generateInvoiceHtml(options);
    await Print.printAsync({ html });
  },
};

import React, { useState } from 'react';
import { Invoice } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Printer, Share2, X, Globe, FileText, Image as ImageIcon, Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ReceiptModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ invoice, onClose }) => {
  const { language: currentAppLang, formatPKR } = useLanguage();
  const settings = storage.getSettings();
  
  // Format options: full, 80mm, 58mm, a5
  const [printFormat, setPrintFormat] = useState<'full' | '80mm' | '58mm' | 'a5'>('full');
  // Language for the receipt: can be English or Urdu regardless of app language
  const [receiptLang, setReceiptLang] = useState<'en' | 'ur'>(currentAppLang);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!invoice) return null;

  const isUrdu = receiptLang === 'ur';

  const handlePrint = () => {
    window.print();
  };

  const generateCanvas = async () => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.opacity = '0.01';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '999999';
    container.style.width = '640px';
    container.style.background = '#ffffff';
    container.style.color = '#0f172a';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '13px';
    container.style.lineHeight = '1.4';
    container.style.boxSizing = 'border-box';

    const shopName = isUrdu ? settings.shop_name_ur : settings.shop_name_en;
    const shopAddress = isUrdu ? settings.shop_address_ur : settings.shop_address_en;
    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; text-align: ${isUrdu ? 'right' : 'left'};">
          <div style="font-weight: bold; color: #0f172a;">${isUrdu ? (item.product_name_ur || item.product_name_en) : item.product_name_en}</div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">${item.variant_title}</div>
        </td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace; color: #334155;">${item.qty}</td>
        <td style="padding: 8px 6px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: bold; color: #0f172a;">${formatPKR(item.total)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div dir="${isUrdu ? 'rtl' : 'ltr'}" style="width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #cbd5e1; border-radius: 8px;">
        <div style="text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 14px; margin-bottom: 14px;">
          <h1 style="font-size: 22px; font-weight: bold; color: #0f172a; margin: 0 0 4px 0;">${shopName}</h1>
          <p style="font-size: 12px; color: #475569; margin: 0 0 4px 0;">${shopAddress}</p>
          <p style="font-size: 12px; color: #0f172a; font-family: monospace; font-weight: bold; margin: 0;">Phone: ${settings.shop_phone}</p>
          ${invoice.status === 'cancelled' ? '<div style="margin-top: 8px; padding: 4px; background: #fee2e2; color: #b91c1c; font-weight: bold; font-size: 11px;">*** CANCELLED INVOICE ***</div>' : ''}
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #334155; margin-bottom: 14px; background: #f8fafc; padding: 10px; border-radius: 6px;">
          <div>
            <div style="margin-bottom: 3px;"><strong>Invoice #:</strong> <span style="font-family: monospace; font-weight: bold;">${invoice.number}</span></div>
            <div><strong>Date:</strong> ${new Date(invoice.date).toLocaleString()}</div>
          </div>
          <div style="text-align: ${isUrdu ? 'left' : 'right'};">
            <div style="margin-bottom: 3px;"><strong>Customer:</strong> ${invoice.customer_name || 'Walk-in'}</div>
            <div><strong>Served By:</strong> ${invoice.user_name}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              <th style="padding: 6px; text-align: ${isUrdu ? 'right' : 'left'}; border-bottom: 2px solid #cbd5e1;">Item</th>
              <th style="padding: 6px; text-align: center; border-bottom: 2px solid #cbd5e1; width: 50px;">Qty</th>
              <th style="padding: 6px; text-align: right; border-bottom: 2px solid #cbd5e1; width: 90px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-left: auto; width: 240px; font-size: 12px; color: #334155; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; padding: 3px 0;">
            <span>Subtotal:</span>
            <span style="font-family: monospace; font-weight: 600;">${formatPKR(invoice.subtotal)}</span>
          </div>
          ${invoice.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #047857;">
            <span>Discount:</span>
            <span style="font-family: monospace; font-weight: 600;">- ${formatPKR(invoice.discount)}</span>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 2px solid #0f172a; font-weight: bold; font-size: 14px; color: #0f172a;">
            <span>Grand Total:</span>
            <span style="font-family: monospace;">${formatPKR(invoice.total)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0;">
            <span>Paid (${invoice.payment_method}):</span>
            <span style="font-family: monospace; font-weight: bold; color: #0f172a;">${formatPKR(invoice.paid)}</span>
          </div>
          ${invoice.balance > 0 ? `
          <div style="display: flex; justify-content: space-between; padding: 5px 6px; background: #fee2e2; color: #b91c1c; border-radius: 4px; font-weight: bold; margin-top: 4px;">
            <span>Balance Due:</span>
            <span style="font-family: monospace;">${formatPKR(invoice.balance)}</span>
          </div>` : `
          <div style="text-align: center; color: #047857; font-weight: bold; font-size: 11px; margin-top: 4px;">✓ FULLY PAID</div>
          `}
        </div>

        <div style="text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 10px; color: #64748b;">
          <p style="margin: 0 0 3px 0;">${isUrdu ? settings.receipt_footer_ur : settings.receipt_footer_en}</p>
          <p style="font-weight: bold; color: #0f172a; margin: 0;">*** THANK YOU FOR YOUR BUSINESS ***</p>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      return canvas;
    } catch (err: any) {
      console.error('Canvas generation error:', err);
      throw err;
    } finally {
      document.body.removeChild(container);
    }
  };

  // 1. Download Invoice as PNG Image
  const handleDownloadImage = async () => {
    try {
      setIsGenerating(true);
      const canvas = await generateCanvas();
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Invoice_${invoice.number}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Image generation failed', err);
      alert('Error: ' + (err?.message || err?.toString() || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Download Invoice as PDF Document
  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);
      const canvas = await generateCanvas();
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: printFormat === 'a5' ? 'a5' : printFormat === '58mm' ? [58, 100] : printFormat === '80mm' ? [80, 150] : [210, 297]
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoice.number}_Bani_Hashim_Traders.pdf`);
    } catch (err: any) {
      console.error('PDF generation failed', err);
      alert('Error: ' + (err?.message || err?.toString() || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Share Invoice Image / PDF on WhatsApp
  const handleWhatsAppShare = async () => {
    const phone = invoice.customer_phone?.replace(/[^0-9]/g, '') || '';
    let cleanPhone = phone;
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('3')) {
      cleanPhone = '92' + cleanPhone;
    }

    try {
      setIsGenerating(true);
      const canvas = await generateCanvas();
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob && navigator.share && window.File) {
        const file = new File([blob], `Invoice_${invoice.number}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Invoice ${invoice.number} - Bani Hashim Traders`,
            text: isUrdu 
              ? `بنی ہاشم ٹریڈرز - انوائس نمبر ${invoice.number}` 
              : `Bani Hashim Traders - Invoice #${invoice.number}`,
            files: [file]
          });
          setIsGenerating(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Native share note:', e);
    } finally {
      setIsGenerating(false);
    }

    // Fallback: Trigger image download and open WhatsApp Web with bill summary
    if (!navigator.share) {
        handleDownloadImage();
    }
    
    const shopName = isUrdu ? settings.shop_name_ur : settings.shop_name_en;
    const itemsList = invoice.items
      .map(it => `• ${isUrdu ? (it.product_name_ur || it.product_name_en) : it.product_name_en} (${it.variant_title || 'Item'}) x${it.qty} = ${formatPKR(it.total)}`)
      .join('\n');

    let text = '';
    if (isUrdu) {
      text = `*${shopName}*
*انوائس نمبر:* ${invoice.number}
*تاریخ:* ${new Date(invoice.date).toLocaleDateString('ur-PK')}
*گاہک:* ${invoice.customer_name || 'عام گاہک'}

*تفصیل سامان:*
${itemsList}

*سب ٹوٹل:* ${formatPKR(invoice.subtotal)}
*رعایت:* ${formatPKR(invoice.discount)}
*کل رقم:* ${formatPKR(invoice.total)}
*وصول شدہ:* ${formatPKR(invoice.paid)}
*بقایا ادھار:* ${formatPKR(invoice.balance)}

*(نوٹ: انوائس کی تصویری رسید ڈاؤنلوڈ ہو چکی ہے۔ آپ اسے ساتھ منسلک کر سکتے ہیں۔)*

${settings.receipt_footer_ur}
رابطہ: ${settings.shop_phone}`;
    } else {
      text = `*${shopName}*
*Invoice #:* ${invoice.number}
*Date:* ${new Date(invoice.date).toLocaleString()}
*Customer:* ${invoice.customer_name || 'Walk-in'}

*Items Purchased:*
${itemsList}

*Subtotal:* ${formatPKR(invoice.subtotal)}
*Discount:* ${formatPKR(invoice.discount)}
*Total Amount:* ${formatPKR(invoice.total)}
*Paid:* ${formatPKR(invoice.paid)}
*Udhaar Balance:* ${formatPKR(invoice.balance)}

*(Note: Invoice image downloaded automatically. You can attach it to this message.)*

${settings.receipt_footer_en}
Phone: ${settings.shop_phone}`;
    }

    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header Controls (Hidden during print) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">
              {isUrdu ? 'رسید / انوائس پرنٹ' : 'Receipt / Invoice Preview'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
              {invoice.number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle for receipt */}
            <button
              onClick={() => setReceiptLang(prev => prev === 'en' ? 'ur' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
              title="Toggle receipt language (English / اردو)"
            >
              <Globe className="w-3.5 h-3.5 text-slate-600" />
              <span>{receiptLang === 'en' ? 'اردو' : 'English'}</span>
            </button>

            {/* Print format tabs */}
            <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setPrintFormat('58mm')}
                className={`px-2 py-1 rounded-md transition-all ${printFormat === '58mm' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                58mm
              </button>
              <button
                onClick={() => setPrintFormat('80mm')}
                className={`px-2 py-1 rounded-md transition-all ${printFormat === '80mm' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                80mm
              </button>
              <button
                onClick={() => setPrintFormat('a5')}
                className={`px-2 py-1 rounded-md transition-all ${printFormat === 'a5' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                A5
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-100/70">
          <div 
            id="printable-receipt"
            dir={isUrdu ? 'rtl' : 'ltr'}
            className={`bg-white shadow-sm border border-slate-200 text-slate-900 font-sans transition-all ${
              printFormat === '58mm' ? 'receipt-58mm w-[58mm] p-3 text-[11px]' :
              printFormat === '80mm' ? 'receipt-80mm w-[80mm] p-4 text-[12px]' :
              'receipt-a5 w-[148mm] p-6 text-[13px]'
            }`}
          >
            {/* Shop Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <h2 className={`font-bold tracking-tight text-slate-900 ${isUrdu ? 'urdu-heading text-lg font-bold' : 'text-base font-extrabold uppercase'}`}>
                {isUrdu ? settings.shop_name_ur : settings.shop_name_en}
              </h2>
              <p className="text-slate-600 text-[11px] mt-0.5">
                {isUrdu ? settings.shop_address_ur : settings.shop_address_en}
              </p>
              <p className="text-slate-600 font-mono text-[11px] mt-0.5">
                {isUrdu ? 'فون / واٹس ایپ:' : 'Phone / WhatsApp:'} {settings.shop_phone}
              </p>
              
              {invoice.status === 'cancelled' && (
                <div className="mt-2 py-1 px-2 bg-red-100 border border-red-300 text-red-700 font-bold rounded text-center text-xs">
                  {isUrdu ? '*** منسوخ شدہ انوائس ***' : '*** CANCELLED INVOICE ***'}
                  {invoice.cancelled_reason && (
                    <div className="text-[10px] font-normal">{invoice.cancelled_reason}</div>
                  )}
                </div>
              )}
            </div>

            {/* Meta info */}
            <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>{isUrdu ? 'انوائس نمبر:' : 'Invoice No:'}</span>
                <span className="font-mono font-bold">{invoice.number}</span>
              </div>
              <div className="flex justify-between">
                <span>{isUrdu ? 'تاریخ:' : 'Date:'}</span>
                <span>{new Date(invoice.date).toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK')} {new Date(invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>{isUrdu ? 'گاہک:' : 'Customer:'}</span>
                <span className="font-medium">{invoice.customer_name || (isUrdu ? 'عام گاہک' : 'Walk-in')}</span>
              </div>
              {invoice.customer_phone && (
                <div className="flex justify-between">
                  <span>{isUrdu ? 'فون:' : 'Phone:'}</span>
                  <span className="font-mono">{invoice.customer_phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{isUrdu ? 'کاؤنٹر کیشیئر:' : 'Served By:'}</span>
                <span>{invoice.user_name}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-slate-800 pb-1 border-b border-slate-200 mb-1">
                <span className="flex-1">{isUrdu ? 'تفصیل و ماڈل' : 'Item & Model'}</span>
                <span className="w-10 text-center">{isUrdu ? 'تعداد' : 'Qty'}</span>
                <span className="w-16 text-end">{isUrdu ? 'کل' : 'Total'}</span>
              </div>

              <div className="space-y-1.5">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-800">
                    <div className="flex-1 pr-1">
                      <div className="font-medium leading-tight">
                        {isUrdu ? (item.product_name_ur || item.product_name_en) : item.product_name_en}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {item.variant_title}
                      </div>
                    </div>
                    <div className="w-10 text-center font-mono">
                      {item.qty}
                    </div>
                    <div className="w-16 text-end font-mono font-medium">
                      {formatPKR(item.total).replace(/^(Rs|روپے)\s*/, '')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Totals */}
            <div className="py-2 space-y-1 text-slate-800 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>{isUrdu ? 'سب ٹوٹل:' : 'Subtotal:'}</span>
                <span className="font-mono font-medium">{formatPKR(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>{isUrdu ? 'رعایت (ڈسکاؤنٹ):' : 'Discount:'}</span>
                  <span className="font-mono">- {formatPKR(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-200">
                <span>{isUrdu ? 'صافی رقم (ٹوٹل):' : 'Grand Total:'}</span>
                <span className="font-mono">{formatPKR(invoice.total)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>
                  {isUrdu ? 'وصول شدہ (' : 'Paid ('}
                  {invoice.payment_method === 'cash' ? (isUrdu ? 'نقد' : 'Cash') :
                   invoice.payment_method === 'easypaisa' ? 'Easypaisa' :
                   invoice.payment_method === 'jazzcash' ? 'JazzCash' : 'Bank'}
                  {')'}:
                </span>
                <span className="font-mono font-bold text-slate-900">{formatPKR(invoice.paid)}</span>
              </div>

              {invoice.balance > 0 ? (
                <div className="flex justify-between font-bold text-red-700 bg-red-50 p-1 rounded">
                  <span>{isUrdu ? 'ادھار بقایا (واجب الادا):' : 'Udhaar Balance Due:'}</span>
                  <span className="font-mono">{formatPKR(invoice.balance)}</span>
                </div>
              ) : (
                <div className="text-center text-[10px] font-bold text-emerald-700 py-0.5">
                  {isUrdu ? '✓ تمام رقم ادا ہو چکی ہے' : '✓ FULLY PAID'}
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="pt-3 text-center text-slate-500 text-[10px] space-y-1">
              <p>{isUrdu ? settings.receipt_footer_ur : settings.receipt_footer_en}</p>
              <p className="font-mono font-bold text-slate-800 tracking-wider">
                *** {isUrdu ? 'تشریف آوری کا شکریہ' : 'THANK YOU FOR YOUR BUSINESS'} ***
              </p>
              {(isUrdu ? settings.custom_terms_ur : settings.custom_terms_en) && (
                <p className="italic text-slate-600">
                  {isUrdu ? settings.custom_terms_ur : settings.custom_terms_en}
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Action Buttons (WhatsApp, Image export, PDF download & Thermal Print) */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={handleWhatsAppShare}
            disabled={isGenerating}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-2xs active:scale-98 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            <span>{isUrdu ? 'واٹس ایپ انوائس' : 'WhatsApp Share'}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-2xs active:scale-98 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>{isUrdu ? 'پی ڈی ایف (PDF)' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={isGenerating}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-2xs active:scale-98 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            <span>{isUrdu ? 'تصویر (Image)' : 'Save Image'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={isGenerating}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-2xs active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>{isUrdu ? 'پرنٹ رسید' : 'Print Receipt'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

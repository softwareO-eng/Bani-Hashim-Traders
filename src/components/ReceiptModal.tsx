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
  
  // Format options: 58mm, 80mm, A5
  const [printFormat, setPrintFormat] = useState<'58mm' | '80mm' | 'a5'>(settings.printer_type || '80mm');
  // Language for the receipt: can be English or Urdu regardless of app language
  const [receiptLang, setReceiptLang] = useState<'en' | 'ur'>(currentAppLang);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!invoice) return null;

  const isUrdu = receiptLang === 'ur';

  const handlePrint = () => {
    window.print();
  };

  // 1. Download Invoice as PNG Image
  const handleDownloadImage = async () => {
    const receiptEl = document.getElementById('printable-receipt');
    if (!receiptEl) return;

    try {
      setIsGenerating(true);
      const canvas = await html2canvas(receiptEl, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Invoice_${invoice.number}_Bani_Hashim_Traders.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Image generation failed', err);
      alert('Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Download Invoice as PDF Document
  const handleDownloadPDF = async () => {
    const receiptEl = document.getElementById('printable-receipt');
    if (!receiptEl) return;

    try {
      setIsGenerating(true);
      const canvas = await html2canvas(receiptEl, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: printFormat === 'a5' ? 'a5' : [canvas.width / 10, canvas.height / 10]
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${invoice.number}_Bani_Hashim_Traders.pdf`);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Failed to generate PDF document');
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

    const receiptEl = document.getElementById('printable-receipt');
    if (receiptEl && navigator.share && window.File) {
      try {
        setIsGenerating(true);
        const canvas = await html2canvas(receiptEl, { scale: 2.5, backgroundColor: '#ffffff' });
        
        // Convert canvas to blob file
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
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
        console.warn('Native web share fallback to WhatsApp Web text format:', e);
      } finally {
        setIsGenerating(false);
      }
    }

    // Fallback: Also auto-trigger image download and open WhatsApp with prefilled bill summary
    handleDownloadImage();

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
              <div className="text-[9px] text-slate-400">
                PakMobile POS v1.0 • Built for Pakistan
              </div>
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

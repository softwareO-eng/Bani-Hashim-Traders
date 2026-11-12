import React, { useState } from 'react';
import { Invoice } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Printer, Share2, X, Globe, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ReceiptModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ invoice, onClose }) => {
  const { language: currentAppLang, formatPKR } = useLanguage();
  const settings = storage.getSettings();

  // Format options: full (default full-size customer invoice), a5, 80mm, 58mm
  const [printFormat, setPrintFormat] = useState<'full' | '80mm' | '58mm' | 'a5'>('full');
  // Language for the receipt: can be English or Urdu regardless of app language
  const [receiptLang, setReceiptLang] = useState<'en' | 'ur'>(currentAppLang);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!invoice) return null;

  const isUrdu = receiptLang === 'ur';

  const handlePrint = () => {
    window.print();
  };

  /**
   * Pure HTML5 Canvas 2D Receipt/Invoice Renderer.
   * Zero html2canvas dependency, zero external CSS/oklch parsing, 100% crash-proof
   * across desktop browsers, Android Chrome, and GitHub Pages.
   */
  const generateCanvas = async (): Promise<HTMLCanvasElement> => {
    const scale = 2;
    const logicalWidth =
      printFormat === '58mm' ? 360 :
      printFormat === '80mm' ? 440 :
      printFormat === 'a5' ? 580 : 720;
    const pad = printFormat === '58mm' ? 18 : printFormat === '80mm' ? 22 : 32;
    const contentWidth = logicalWidth - pad * 2;
    const isNarrow = printFormat === '58mm' || printFormat === '80mm';

    const tempCanvas = document.createElement('canvas');
    const measureCtx = tempCanvas.getContext('2d');
    if (!measureCtx) {
      throw new Error('Canvas 2D context is not supported on this device');
    }

    const fontSans = isUrdu
      ? "'Noto Naskh Arabic', 'Noto Nastaliq Urdu', system-ui, -apple-system, Arial, sans-serif"
      : "Inter, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
    const fontMono = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

    const shopName = isUrdu ? settings.shop_name_ur : settings.shop_name_en;
    const shopAddress = isUrdu ? settings.shop_address_ur : settings.shop_address_en;
    const footerText = isUrdu ? settings.receipt_footer_ur : settings.receipt_footer_en;
    const customTerms = isUrdu ? settings.custom_terms_ur : settings.custom_terms_en;

    const paymentLabel =
      invoice.payment_method === 'cash' ? (isUrdu ? 'نقد' : 'Cash') :
      invoice.payment_method === 'easypaisa' ? 'Easypaisa' :
      invoice.payment_method === 'jazzcash' ? 'JazzCash' : 'Bank';

    const wrapLines = (ctx: CanvasRenderingContext2D, text: string, maxW: number, font: string): string[] => {
      if (!text) return [];
      ctx.font = font;
      const paragraphs = String(text).split('\n');
      const lines: string[] = [];
      for (const para of paragraphs) {
        const words = para.trim().split(/\s+/);
        if (words.length === 0 || (words.length === 1 && words[0] === '')) {
          continue;
        }
        let current = '';
        for (const word of words) {
          const test = current ? `${current} ${word}` : word;
          if (ctx.measureText(test).width <= maxW) {
            current = test;
          } else {
            if (current) lines.push(current);
            // If a single word is wider than maxW, split by characters
            if (ctx.measureText(word).width > maxW) {
              let chunk = '';
              for (const ch of word) {
                if (ctx.measureText(chunk + ch).width <= maxW) {
                  chunk += ch;
                } else {
                  if (chunk) lines.push(chunk);
                  chunk = ch;
                }
              }
              current = chunk;
            } else {
              current = word;
            }
          }
        }
        if (current) lines.push(current);
      }
      return lines;
    };

    // Pass 1: measure total required height, Pass 2: draw everything
    const renderPass = (ctx: CanvasRenderingContext2D, draw: boolean): number => {
      let y = pad;

      const drawRoundedRect = (x: number, ry: number, w: number, h: number, r: number, fill: string, stroke?: string) => {
        if (!draw) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + r, ry);
        ctx.arcTo(x + w, ry, x + w, ry + h, r);
        ctx.arcTo(x + w, ry + h, x, ry + h, r);
        ctx.arcTo(x, ry + h, x, ry, r);
        ctx.arcTo(x, ry, x + w, ry, r);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      };

      const drawDashedLine = (ly: number, color = '#cbd5e1') => {
        if (!draw) return;
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.moveTo(pad, ly);
        ctx.lineTo(logicalWidth - pad, ly);
        ctx.stroke();
        ctx.restore();
      };

      const drawSolidLine = (x1: number, x2: number, ly: number, color = '#e2e8f0', width = 1) => {
        if (!draw) return;
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.moveTo(x1, ly);
        ctx.lineTo(x2, ly);
        ctx.stroke();
        ctx.restore();
      };

      const drawCenteredWrapped = (
        text: string,
        font: string,
        color: string,
        lineH: number,
        rtlDir = isUrdu
      ) => {
        const lines = wrapLines(ctx, text, contentWidth - 8, font);
        for (const line of lines) {
          if (draw) {
            ctx.save();
            ctx.font = font;
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.direction = rtlDir ? 'rtl' : 'ltr';
            ctx.fillText(line, logicalWidth / 2, y);
            ctx.restore();
          }
          y += lineH;
        }
      };

      const drawKeyValueRow = (
        label: string,
        value: string,
        labelFont: string,
        valueFont: string,
        labelColor: string,
        valueColor: string,
        rowH: number,
        boxLeft = pad,
        boxRight = logicalWidth - pad
      ) => {
        if (draw) {
          ctx.save();
          ctx.textBaseline = 'top';

          ctx.font = labelFont;
          ctx.fillStyle = labelColor;
          ctx.textAlign = isUrdu ? 'right' : 'left';
          ctx.direction = isUrdu ? 'rtl' : 'ltr';
          ctx.fillText(label, isUrdu ? boxRight : boxLeft, y);

          ctx.font = valueFont;
          ctx.fillStyle = valueColor;
          ctx.textAlign = isUrdu ? 'left' : 'right';
          ctx.direction = 'ltr';
          ctx.fillText(value, isUrdu ? boxLeft : boxRight, y);

          ctx.restore();
        }
        y += rowH;
      };

      // Outer border card background
      if (draw) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, logicalWidth, canvasHeight);
      }

      // Top emerald accent bar
      if (draw) {
        ctx.fillStyle = '#059669';
        ctx.fillRect(0, 0, logicalWidth, 6);
      }
      y += 6;

      // Shop Header
      drawCenteredWrapped(
        shopName,
        `bold ${isNarrow ? 18 : 23}px ${fontSans}`,
        '#0f172a',
        isNarrow ? 24 : 30
      );
      y += 2;
      drawCenteredWrapped(
        shopAddress,
        `${isNarrow ? 11 : 12.5}px ${fontSans}`,
        '#475569',
        isNarrow ? 16 : 18
      );
      y += 2;
      drawCenteredWrapped(
        `${isUrdu ? 'فون / واٹس ایپ:' : 'Phone / WhatsApp:'} ${settings.shop_phone}`,
        `bold ${isNarrow ? 11 : 12.5}px ${fontMono}`,
        '#0f172a',
        isNarrow ? 16 : 18,
        false
      );

      if (invoice.status === 'cancelled') {
        y += 6;
        const cancelTitle = isUrdu ? '*** منسوخ شدہ انوائس ***' : '*** CANCELLED INVOICE ***';
        const reasonLines = invoice.cancelled_reason
          ? wrapLines(ctx, invoice.cancelled_reason, contentWidth - 20, `11px ${fontSans}`)
          : [];
        const boxH = 26 + reasonLines.length * 15;
        drawRoundedRect(pad, y, contentWidth, boxH, 6, '#fee2e2', '#fca5a5');
        y += 6;
        drawCenteredWrapped(cancelTitle, `bold 12px ${fontSans}`, '#b91c1c', 16);
        for (const rl of reasonLines) {
          drawCenteredWrapped(rl, `11px ${fontSans}`, '#b91c1c', 15);
        }
        y += 4;
      }

      y += 10;
      drawDashedLine(y);
      y += 12;

      // Meta Info Card
      const metaRows: Array<{ label: string; value: string; mono?: boolean }> = [
        {
          label: isUrdu ? 'انوائس نمبر:' : 'Invoice No:',
          value: invoice.number,
          mono: true
        },
        {
          label: isUrdu ? 'تاریخ:' : 'Date:',
          value: `${new Date(invoice.date).toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK')} ${new Date(invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        },
        {
          label: isUrdu ? 'گاہک:' : 'Customer:',
          value: invoice.customer_name || (isUrdu ? 'عام گاہک' : 'Walk-in')
        }
      ];
      if (invoice.customer_phone) {
        metaRows.push({
          label: isUrdu ? 'فون:' : 'Phone:',
          value: invoice.customer_phone,
          mono: true
        });
      }
      metaRows.push({
        label: isUrdu ? 'کاؤنٹر کیشیئر:' : 'Served By:',
        value: invoice.user_name
      });

      const metaRowH = isNarrow ? 18 : 21;
      const metaBoxH = metaRows.length * metaRowH + 16;
      drawRoundedRect(pad, y, contentWidth, metaBoxH, 8, '#f8fafc', '#e2e8f0');
      y += 10;
      for (const mr of metaRows) {
        drawKeyValueRow(
          mr.label,
          mr.value,
          `600 ${isNarrow ? 11 : 12.5}px ${fontSans}`,
          `${mr.mono ? 'bold' : '600'} ${isNarrow ? 11 : 12.5}px ${mr.mono ? fontMono : fontSans}`,
          '#475569',
          '#0f172a',
          metaRowH,
          pad + 12,
          logicalWidth - pad - 12
        );
      }
      y += 14;

      // Items Table Header
      const showRateCol = !isNarrow;
      const totalColW = isNarrow ? 76 : 96;
      const rateColW = showRateCol ? 84 : 0;
      const qtyColW = isNarrow ? 40 : 54;
      const itemColW = contentWidth - totalColW - rateColW - qtyColW - 16;

      drawRoundedRect(pad, y, contentWidth, 26, 4, '#f1f5f9');
      if (draw) {
        ctx.save();
        ctx.font = `bold ${isNarrow ? 10.5 : 11.5}px ${fontSans}`;
        ctx.fillStyle = '#334155';
        ctx.textBaseline = 'middle';

        const headerMidY = y + 13;
        if (!isUrdu) {
          ctx.textAlign = 'left';
          ctx.fillText('ITEM & MODEL', pad + 8, headerMidY);
          ctx.textAlign = 'center';
          ctx.fillText('QTY', pad + 8 + itemColW + qtyColW / 2, headerMidY);
          if (showRateCol) {
            ctx.textAlign = 'right';
            ctx.fillText('RATE', pad + 8 + itemColW + qtyColW + rateColW - 6, headerMidY);
          }
          ctx.textAlign = 'right';
          ctx.fillText('TOTAL', logicalWidth - pad - 8, headerMidY);
        } else {
          ctx.direction = 'rtl';
          ctx.textAlign = 'right';
          ctx.fillText('تفصیل و ماڈل', logicalWidth - pad - 8, headerMidY);
          ctx.textAlign = 'center';
          ctx.fillText('تعداد', logicalWidth - pad - 8 - itemColW - qtyColW / 2, headerMidY);
          if (showRateCol) {
            ctx.textAlign = 'left';
            ctx.fillText('قیمت', pad + 8 + totalColW + 6, headerMidY);
          }
          ctx.textAlign = 'left';
          ctx.fillText('کل', pad + 8, headerMidY);
        }
        ctx.restore();
      }
      y += 30;

      // Items Rows
      for (let i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        const title = isUrdu ? (item.product_name_ur || item.product_name_en) : item.product_name_en;
        const itemFont = `600 ${isNarrow ? 11.5 : 13}px ${fontSans}`;
        const subFont = `${isNarrow ? 9.5 : 11}px ${fontMono}`;
        const titleLines = wrapLines(ctx, title, itemColW - 4, itemFont);
        const subLines = item.variant_title ? wrapLines(ctx, item.variant_title, itemColW - 4, subFont) : [];

        const titleH = Math.max(1, titleLines.length) * (isNarrow ? 15 : 18);
        const subH = subLines.length * (isNarrow ? 13 : 15);
        const rowContentH = titleH + subH;

        if (draw) {
          ctx.save();
          ctx.textBaseline = 'top';
          let ty = y + 4;

          // Item Name
          ctx.font = itemFont;
          ctx.fillStyle = '#0f172a';
          ctx.direction = isUrdu ? 'rtl' : 'ltr';
          ctx.textAlign = isUrdu ? 'right' : 'left';
          for (const tl of titleLines) {
            ctx.fillText(tl, isUrdu ? logicalWidth - pad - 8 : pad + 8, ty);
            ty += isNarrow ? 15 : 18;
          }

          // Variant Title
          ctx.font = subFont;
          ctx.fillStyle = '#64748b';
          ctx.direction = 'ltr';
          for (const sl of subLines) {
            ctx.fillText(sl, isUrdu ? logicalWidth - pad - 8 : pad + 8, ty);
            ty += isNarrow ? 13 : 15;
          }

          // Qty, Rate, Total
          ctx.direction = 'ltr';
          const numY = y + 4;
          ctx.font = `600 ${isNarrow ? 11.5 : 12.5}px ${fontMono}`;
          ctx.fillStyle = '#334155';
          ctx.textAlign = 'center';
          const qtyX = isUrdu
            ? logicalWidth - pad - 8 - itemColW - qtyColW / 2
            : pad + 8 + itemColW + qtyColW / 2;
          ctx.fillText(String(item.qty), qtyX, numY);

          if (showRateCol) {
            ctx.textAlign = isUrdu ? 'left' : 'right';
            const rateX = isUrdu
              ? pad + 8 + totalColW + 6
              : pad + 8 + itemColW + qtyColW + rateColW - 6;
            ctx.fillText(formatPKR(item.unit_price).replace(/^(Rs|روپے)\s*/, ''), rateX, numY);
          }

          ctx.font = `bold ${isNarrow ? 11.5 : 13}px ${fontMono}`;
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = isUrdu ? 'left' : 'right';
          ctx.fillText(
            formatPKR(item.total),
            isUrdu ? pad + 8 : logicalWidth - pad - 8,
            numY
          );

          ctx.restore();
        }

        y += rowContentH + 10;
        drawSolidLine(pad, logicalWidth - pad, y, '#e2e8f0', 1);
        y += 6;
      }

      y += 8;

      // Financial Summary
      const summaryLeft = isNarrow ? pad : logicalWidth - pad - 280;
      const summaryRight = isNarrow ? logicalWidth - pad : logicalWidth - pad;
      const summaryRowH = isNarrow ? 20 : 22;

      drawKeyValueRow(
        isUrdu ? 'سب ٹوٹل:' : 'Subtotal:',
        formatPKR(invoice.subtotal),
        `500 ${isNarrow ? 12 : 13}px ${fontSans}`,
        `600 ${isNarrow ? 12 : 13}px ${fontMono}`,
        '#334155',
        '#0f172a',
        summaryRowH,
        summaryLeft,
        summaryRight
      );

      if (invoice.discount > 0) {
        drawKeyValueRow(
          isUrdu ? 'رعایت (ڈسکاؤنٹ):' : 'Discount:',
          `- ${formatPKR(invoice.discount)}`,
          `500 ${isNarrow ? 12 : 13}px ${fontSans}`,
          `600 ${isNarrow ? 12 : 13}px ${fontMono}`,
          '#047857',
          '#047857',
          summaryRowH,
          summaryLeft,
          summaryRight
        );
      }

      y += 4;
      drawSolidLine(summaryLeft, summaryRight, y, '#0f172a', 1.5);
      y += 8;

      drawKeyValueRow(
        isUrdu ? 'صافی رقم (ٹوٹل):' : 'Grand Total:',
        formatPKR(invoice.total),
        `bold ${isNarrow ? 14 : 16}px ${fontSans}`,
        `bold ${isNarrow ? 14 : 16}px ${fontMono}`,
        '#0f172a',
        '#0f172a',
        isNarrow ? 24 : 26,
        summaryLeft,
        summaryRight
      );

      drawKeyValueRow(
        isUrdu ? `وصول شدہ (${paymentLabel}):` : `Paid (${paymentLabel}):`,
        formatPKR(invoice.paid),
        `500 ${isNarrow ? 12 : 13}px ${fontSans}`,
        `bold ${isNarrow ? 12 : 13}px ${fontMono}`,
        '#334155',
        '#0f172a',
        summaryRowH,
        summaryLeft,
        summaryRight
      );

      y += 4;
      if (invoice.balance > 0) {
        drawRoundedRect(summaryLeft, y, summaryRight - summaryLeft, 28, 6, '#fee2e2', '#fca5a5');
        y += 6;
        drawKeyValueRow(
          isUrdu ? 'ادھار بقایا (واجب الادا):' : 'Udhaar Balance Due:',
          formatPKR(invoice.balance),
          `bold ${isNarrow ? 11.5 : 12.5}px ${fontSans}`,
          `bold ${isNarrow ? 12 : 13}px ${fontMono}`,
          '#b91c1c',
          '#b91c1c',
          22,
          summaryLeft + 8,
          summaryRight - 8
        );
        y += 4;
      } else {
        drawRoundedRect(summaryLeft, y, summaryRight - summaryLeft, 24, 6, '#ecfdf5', '#a7f3d0');
        if (draw) {
          ctx.save();
          ctx.font = `bold 11.5px ${fontSans}`;
          ctx.fillStyle = '#047857';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.direction = isUrdu ? 'rtl' : 'ltr';
          ctx.fillText(
            isUrdu ? '✓ تمام رقم ادا ہو چکی ہے' : '✓ FULLY PAID',
            (summaryLeft + summaryRight) / 2,
            y + 12
          );
          ctx.restore();
        }
        y += 28;
      }

      if (invoice.note) {
        y += 10;
        const noteLines = wrapLines(ctx, `${isUrdu ? 'نوٹ:' : 'Note:'} ${invoice.note}`, contentWidth - 16, `11.5px ${fontSans}`);
        const noteBoxH = noteLines.length * 16 + 14;
        drawRoundedRect(pad, y, contentWidth, noteBoxH, 6, '#fffbeb', '#fde68a');
        y += 7;
        for (const nl of noteLines) {
          if (draw) {
            ctx.save();
            ctx.font = `11.5px ${fontSans}`;
            ctx.fillStyle = '#92400e';
            ctx.textAlign = isUrdu ? 'right' : 'left';
            ctx.direction = isUrdu ? 'rtl' : 'ltr';
            ctx.textBaseline = 'top';
            ctx.fillText(nl, isUrdu ? logicalWidth - pad - 8 : pad + 8, y);
            ctx.restore();
          }
          y += 16;
        }
        y += 7;
      }

      y += 14;
      drawDashedLine(y);
      y += 14;

      // Footer & Custom Terms
      if (footerText) {
        drawCenteredWrapped(footerText, `11.5px ${fontSans}`, '#64748b', 16);
        y += 4;
      }
      drawCenteredWrapped(
        isUrdu ? '*** تشریف آوری کا شکریہ ***' : '*** THANK YOU FOR YOUR BUSINESS ***',
        `bold 11.5px ${fontMono}`,
        '#0f172a',
        18
      );
      if (customTerms) {
        y += 2;
        drawCenteredWrapped(customTerms, `italic 11px ${fontSans}`, '#475569', 16);
      }

      y += pad;
      return y;
    };

    let canvasHeight = 600;
    canvasHeight = renderPass(measureCtx, false);

    const canvas = document.createElement('canvas');
    canvas.width = logicalWidth * scale;
    canvas.height = canvasHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to initialize canvas drawing context');
    }
    ctx.scale(scale, scale);
    renderPass(ctx, true);

    return canvas;
  };

  // 1. Download Invoice as PNG Image
  const handleDownloadImage = async () => {
    try {
      setIsGenerating(true);
      const canvas = await generateCanvas();
      const filename = `Invoice_${invoice.number}.png`;

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      } else {
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      console.error('Image generation failed', err);
      alert('Failed to save invoice image: ' + (err?.message || String(err)));
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

      const pageWidthMm =
        printFormat === '58mm' ? 58 :
        printFormat === '80mm' ? 80 :
        printFormat === 'a5' ? 148 : 210;

      const marginMm = printFormat === '58mm' || printFormat === '80mm' ? 1 : 8;
      const initialUsableW = pageWidthMm - marginMm * 2;
      const estimatedImgH = (canvas.height * initialUsableW) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format:
          printFormat === '58mm' ? [58, Math.max(80, estimatedImgH + marginMm * 2)] :
          printFormat === '80mm' ? [80, Math.max(100, estimatedImgH + marginMm * 2)] :
          printFormat === 'a5' ? 'a5' : 'a4'
      });

      const pdfPageW = pdf.internal.pageSize.getWidth();
      const pdfPageH = pdf.internal.pageSize.getHeight();
      const maxW = pdfPageW - marginMm * 2;
      const maxH = pdfPageH - marginMm * 2;

      let drawW = maxW;
      let drawH = (canvas.height * drawW) / canvas.width;

      if (drawH > maxH) {
        drawH = maxH;
        drawW = (canvas.width * drawH) / canvas.height;
      }

      const offsetX = (pdfPageW - drawW) / 2;
      pdf.addImage(imgData, 'PNG', offsetX, marginMm, drawW, drawH);
      pdf.save(`Invoice_${invoice.number}_Bani_Hashim_Traders.pdf`);
    } catch (err: any) {
      console.error('PDF generation failed', err);
      alert('Failed to generate PDF document: ' + (err?.message || String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Share Invoice Image / Details on WhatsApp
  const handleWhatsAppShare = async () => {
    const phone = invoice.customer_phone?.replace(/[^0-9]/g, '') || '';
    let cleanPhone = phone;
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('3')) {
      cleanPhone = '92' + cleanPhone;
    }

    let sharedViaNative = false;
    try {
      setIsGenerating(true);
      const canvas = await generateCanvas();
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob && typeof navigator.share === 'function' && typeof File === 'function') {
        const file = new File([blob], `Invoice_${invoice.number}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Invoice ${invoice.number} - Bani Hashim Traders`,
            text: isUrdu
              ? `بنی ہاشم ٹریڈرز - انوائس نمبر ${invoice.number}`
              : `Bani Hashim Traders - Invoice #${invoice.number}`,
            files: [file]
          });
          sharedViaNative = true;
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setIsGenerating(false);
        return;
      }
      console.warn('Native share fallback:', e);
    } finally {
      setIsGenerating(false);
    }

    if (sharedViaNative) return;

    // Fallback: Download PNG image and open WhatsApp Web/App with bill summary
    await handleDownloadImage();

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

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">

        {/* Header Controls (Hidden during print) */}
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
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
              <button
                onClick={() => setPrintFormat('full')}
                className={`px-2 py-1 rounded-md transition-all ${printFormat === 'full' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Full
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex justify-center bg-slate-100/70">
          <div
            id="printable-receipt"
            dir={isUrdu ? 'rtl' : 'ltr'}
            className={`bg-white shadow-sm border border-slate-200 text-slate-900 font-sans transition-all h-fit ${
              printFormat === '58mm' ? 'receipt-58mm w-[58mm] p-3 text-[11px]' :
              printFormat === '80mm' ? 'receipt-80mm w-[80mm] p-4 text-[12px]' :
              printFormat === 'a5' ? 'receipt-a5 w-[148mm] p-6 text-[13px]' :
              'w-full max-w-xl p-5 sm:p-7 text-[13px] rounded-xl border-t-4 border-t-emerald-600'
            }`}
          >
            {/* Shop Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className={`font-bold tracking-tight text-slate-900 ${isUrdu ? 'urdu-heading text-lg sm:text-xl font-bold' : 'text-base sm:text-lg font-extrabold uppercase'}`}>
                {isUrdu ? settings.shop_name_ur : settings.shop_name_en}
              </h2>
              <p className="text-slate-600 text-[11px] sm:text-xs mt-0.5">
                {isUrdu ? settings.shop_address_ur : settings.shop_address_en}
              </p>
              <p className="text-slate-700 font-mono font-semibold text-[11px] sm:text-xs mt-0.5">
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
            <div className="py-2.5 my-2 bg-slate-50 px-3 rounded-lg border border-slate-200/80 space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>{isUrdu ? 'انوائس نمبر:' : 'Invoice No:'}</span>
                <span className="font-mono font-bold text-slate-900">{invoice.number}</span>
              </div>
              <div className="flex justify-between">
                <span>{isUrdu ? 'تاریخ:' : 'Date:'}</span>
                <span>{new Date(invoice.date).toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK')} {new Date(invoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>{isUrdu ? 'گاہک:' : 'Customer:'}</span>
                <span className="font-semibold text-slate-900">{invoice.customer_name || (isUrdu ? 'عام گاہک' : 'Walk-in')}</span>
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
              <div className="flex justify-between font-bold text-slate-800 pb-1.5 border-b border-slate-200 mb-1.5 bg-slate-100/80 px-1.5 py-1 rounded">
                <span className="flex-1">{isUrdu ? 'تفصیل و ماڈل' : 'Item & Model'}</span>
                <span className="w-10 text-center">{isUrdu ? 'تعداد' : 'Qty'}</span>
                {(printFormat === 'full' || printFormat === 'a5') && (
                  <span className="w-16 text-end">{isUrdu ? 'قیمت' : 'Rate'}</span>
                )}
                <span className="w-20 text-end">{isUrdu ? 'کل' : 'Total'}</span>
              </div>

              <div className="space-y-1.5 px-1">
                {invoice.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-slate-800 pb-1.5 border-b border-slate-100 last:border-b-0">
                    <div className="flex-1 pr-1">
                      <div className="font-semibold leading-tight text-slate-900">
                        {isUrdu ? (item.product_name_ur || item.product_name_en) : item.product_name_en}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {item.variant_title}
                      </div>
                    </div>
                    <div className="w-10 text-center font-mono">
                      {item.qty}
                    </div>
                    {(printFormat === 'full' || printFormat === 'a5') && (
                      <div className="w-16 text-end font-mono text-slate-600">
                        {formatPKR(item.unit_price).replace(/^(Rs|روپے)\s*/, '')}
                      </div>
                    )}
                    <div className="w-20 text-end font-mono font-semibold text-slate-900">
                      {formatPKR(item.total).replace(/^(Rs|روپے)\s*/, '')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Totals */}
            <div className="py-2.5 space-y-1 text-slate-800 border-b border-dashed border-slate-300">
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
              <div className="flex justify-between font-bold text-slate-900 text-sm sm:text-base pt-1.5 border-t border-slate-300">
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
                <div className="flex justify-between font-bold text-red-700 bg-red-50 border border-red-200 p-1.5 rounded-lg mt-1">
                  <span>{isUrdu ? 'ادھار بقایا (واجب الادا):' : 'Udhaar Balance Due:'}</span>
                  <span className="font-mono">{formatPKR(invoice.balance)}</span>
                </div>
              ) : (
                <div className="text-center text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 py-1 rounded-lg mt-1">
                  {isUrdu ? '✓ تمام رقم ادا ہو چکی ہے' : '✓ FULLY PAID'}
                </div>
              )}
            </div>

            {invoice.note && (
              <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                <strong>{isUrdu ? 'نوٹ:' : 'Note:'}</strong> {invoice.note}
              </div>
            )}

            {/* Footer Notice */}
            <div className="pt-3 text-center text-slate-500 text-[11px] space-y-1">
              <p>{isUrdu ? settings.receipt_footer_ur : settings.receipt_footer_en}</p>
              <p className="font-mono font-bold text-slate-800 tracking-wider">
                *** {isUrdu ? 'تشریف آوری کا شکریہ' : 'THANK YOU FOR YOUR BUSINESS'} ***
              </p>
              {(isUrdu ? settings.custom_terms_ur : settings.custom_terms_en) && (
                <p className="italic text-slate-600 pt-0.5">
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

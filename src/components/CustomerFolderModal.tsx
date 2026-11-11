import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Customer, Invoice, Payment, PaymentMethod } from '../types';
import { 
  FolderOpen, Phone, MapPin, Calendar, CreditCard, 
  Receipt, ArrowDownLeft, X, MessageCircle, Printer, 
  Trash2, Plus, Clock, FileText, CheckCircle2, AlertCircle, ShoppingBag
} from 'lucide-react';

interface CustomerFolderModalProps {
  customerId: string;
  onClose: () => void;
  onDataChanged: () => void;
}

export const CustomerFolderModal: React.FC<CustomerFolderModalProps> = ({
  customerId,
  onClose,
  onDataChanged
}) => {
  const { t, isRTL, formatPKR } = useLanguage();
  const [activeTab, setActiveTab] = useState<'ledger' | 'invoices' | 'payments' | 'items'>('ledger');

  // Quick Payment Modal inside folder
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNote, setPaymentNote] = useState('');

  const folderData = storage.getCustomerFolder(customerId);

  if (!folderData || !folderData.customer) {
    return null;
  }

  const { 
    customer, invoices, payments, ledger, 
    purchasedItems, totalPurchased, totalPaid, currentBalance 
  } = folderData;

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) return;

    try {
      storage.recordCustomerPayment(
        customer.id,
        paymentAmount,
        paymentMethod,
        paymentNote || (isRTL ? 'کسٹمر فولڈر سے وصولی' : 'Customer folder recovery')
      );
      onDataChanged();
      setIsRecordingPayment(false);
      setPaymentAmount(0);
      setPaymentNote('');
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    }
  };

  const handleSendWhatsAppStatement = () => {
    if (!customer.phone) {
      alert(isRTL ? 'اس گاہک کا فون نمبر درج نہیں ہے۔' : 'No phone number saved for this customer.');
      return;
    }

    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    let fullPhone = cleanPhone;
    if (fullPhone.startsWith('0')) fullPhone = '92' + fullPhone.substring(1);
    else if (fullPhone.startsWith('3')) fullPhone = '92' + fullPhone;

    const settings = storage.getSettings();
    const shopName = isRTL ? settings.shop_name_ur : settings.shop_name_en;

    const invoiceLines = invoices.slice(0, 5).map(inv => 
      `• ${inv.number} (${new Date(inv.date).toLocaleDateString()}): ${formatPKR(inv.total)} [${inv.balance > 0 ? (isRTL ? `بقایا: ${formatPKR(inv.balance)}` : `Bal: ${formatPKR(inv.balance)}`) : (isRTL ? 'بے باق' : 'Paid')}]`
    ).join('\n');

    const text = isRTL 
      ? `السلام علیکم جناب *${customer.name}* صاحب!
*${shopName}*
------------------------------
*کھاتہ تفصیل / کسٹمر ریکارڈ اسٹیٹمنٹ:*
کل خریداری: ${formatPKR(totalPurchased)}
کل ادا شدہ رقم: ${formatPKR(totalPaid)}
*موجودہ واجب الادا ادھار بقایا:* *${formatPKR(currentBalance)}*
------------------------------
*حالیہ بلز:*
${invoiceLines || 'کوئی حالیہ بل نہیں'}
------------------------------
برائے مہربانی اپنا ادھار بقایا جلد از جلد کلیئر فرمائیں۔ شکریہ!
رابطہ: ${settings.shop_phone}`
      : `Dear *${customer.name}*,
*${shopName}*
------------------------------
*CUSTOMER ACCOUNT STATEMENT:*
Total Purchases: ${formatPKR(totalPurchased)}
Total Paid: ${formatPKR(totalPaid)}
*CURRENT OUTSTANDING BALANCE:* *${formatPKR(currentBalance)}*
------------------------------
*Recent Invoices:*
${invoiceLines || 'No recent invoices'}
------------------------------
Please clear the outstanding balance at your earliest convenience.
Contact: ${settings.shop_phone}`;

    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 border border-slate-200">
        
        {/* FOLDER TOP HEADER / BANNER */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    {customer.name}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    customer.type === 'wholesale' 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {customer.type === 'wholesale' ? (isRTL ? 'ہول سیل گاہک' : 'Wholesale') : (isRTL ? 'پرچون گاہک' : 'Retail')}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300 flex-wrap">
                  {customer.phone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{customer.phone}</span>
                    </span>
                  )}
                  {customer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer.address}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(customer.created_at).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Balance & Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-slate-800 text-xs">
            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 block">{isRTL ? 'موجودہ ادھار بقایا' : 'Outstanding Udhaar'}</span>
              <span className={`text-base font-bold font-mono mt-0.5 block ${currentBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {formatPKR(currentBalance)}
              </span>
            </div>

            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 block">{isRTL ? 'کل خریداری' : 'Total Purchases'}</span>
              <span className="text-base font-bold font-mono text-white mt-0.5 block">
                {formatPKR(totalPurchased)}
              </span>
            </div>

            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 block">{isRTL ? 'کل وصول شدہ رقم' : 'Total Recovered'}</span>
              <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">
                {formatPKR(totalPaid)}
              </span>
            </div>

            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 block">{isRTL ? 'کل بلز اور انوائسز' : 'Total Invoices'}</span>
              <span className="text-base font-bold font-mono text-white mt-0.5 block">
                {invoices.length} {isRTL ? 'بل' : 'Bills'}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS TOOLBAR */}
          <div className="flex items-center gap-2 mt-4 pt-2 flex-wrap">
            <button
              onClick={() => {
                setPaymentAmount(currentBalance > 0 ? currentBalance : 0);
                setIsRecordingPayment(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isRTL ? 'ادھار وصولی درج کریں' : 'Record Payment'}</span>
            </button>

            {customer.phone && (
              <button
                onClick={handleSendWhatsAppStatement}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center gap-1.5 border border-emerald-500/30 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{isRTL ? 'واٹس ایپ کھاتہ' : 'WhatsApp Khata'}</span>
              </button>
            )}

            <button
              onClick={handlePrintStatement}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isRTL ? 'کھاتہ پرنٹ' : 'Print Statement'}</span>
            </button>
          </div>
        </div>

        {/* FOLDER TABS NAVIGATION */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{isRTL ? 'مکمل کھاتہ لیجر' : 'Khata Ledger'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
              {ledger.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>{isRTL ? 'انوائسز کی تاریخ' : 'Invoices History'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
              {invoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'payments'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isRTL ? 'وصولیاں اور ادائیگیاں' : 'Payment Receipts'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
              {payments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'items'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{isRTL ? 'خریدی گئی اسیسریز' : 'Purchased Items'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
              {purchasedItems.length}
            </span>
          </button>
        </div>

        {/* FOLDER BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          
          {/* TAB 1: KHATA LEDGER (Running Balance Stream) */}
          {activeTab === 'ledger' && (
            <div className="space-y-3">
              {ledger.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">{isRTL ? 'کوئی لین دین موجود نہیں ہے' : 'No transactions recorded yet.'}</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 text-start">{isRTL ? 'تاریخ' : 'Date'}</th>
                          <th className="py-2.5 px-3 text-start">{isRTL ? 'تفصیل' : 'Description'}</th>
                          <th className="py-2.5 px-3 text-start">{isRTL ? 'حوالہ #' : 'Ref #'}</th>
                          <th className="py-2.5 px-3 text-end text-red-600">{isRTL ? 'انوائس بل (+)' : 'Debit / Bill'}</th>
                          <th className="py-2.5 px-3 text-end text-emerald-600">{isRTL ? 'وصول رقم (-)' : 'Credit / Paid'}</th>
                          <th className="py-2.5 px-3 text-end">{isRTL ? 'بقایا ادھار' : 'Balance'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledger.map(row => (
                          <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                              {new Date(row.date).toLocaleDateString()}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-800">{row.title}</div>
                              {row.note && <div className="text-[10px] text-slate-400 mt-0.5">{row.note}</div>}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                              {row.ref}
                            </td>
                            <td className="py-2.5 px-3 text-end font-mono font-bold text-red-600">
                              {row.debit > 0 ? formatPKR(row.debit) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-600">
                              {row.credit > 0 ? formatPKR(row.credit) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-900">
                              {formatPKR(row.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INVOICES HISTORY */}
          {activeTab === 'invoices' && (
            <div className="space-y-3">
              {invoices.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">{isRTL ? 'کوئی انوائس موجود نہیں' : 'No invoices found.'}</p>
                </div>
              ) : (
                invoices.map(inv => (
                  <div key={inv.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">{inv.number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'cancelled' 
                            ? 'bg-red-100 text-red-700' 
                            : inv.balance > 0 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {inv.status === 'cancelled' ? (isRTL ? 'منسوخ' : 'Cancelled') :
                           inv.balance > 0 ? (isRTL ? `بقایا: ${formatPKR(inv.balance)}` : `Unpaid: ${formatPKR(inv.balance)}`) : 
                           (isRTL ? 'بے باق' : 'Paid in Full')}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(inv.date).toLocaleString()}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5 text-xs">
                      {inv.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-700">
                          <div>
                            <span className="font-semibold">{item.product_name_en}</span>
                            {item.variant_title && <span className="text-slate-400 text-[11px] ms-1">({item.variant_title})</span>}
                            <span className="text-slate-400 ms-2 font-mono text-[11px]">x{item.qty} @ {formatPKR(item.unit_price)}</span>
                          </div>
                          <span className="font-mono font-semibold text-slate-900">{formatPKR(item.total)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Financial summary */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-slate-500">
                        {isRTL ? 'کیشیئر:' : 'Staff:'} <strong className="text-slate-700">{inv.user_name}</strong>
                      </span>
                      <div className="flex items-center gap-3 font-mono">
                        <span>{isRTL ? 'کل بل:' : 'Total:'} <strong>{formatPKR(inv.total)}</strong></span>
                        <span className="text-emerald-600">{isRTL ? 'ادا شدہ:' : 'Paid:'} <strong>{formatPKR(inv.paid)}</strong></span>
                        {inv.balance > 0 && (
                          <span className="text-red-600 font-bold">{isRTL ? 'ادھار:' : 'Udhaar:'} {formatPKR(inv.balance)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PAYMENTS HISTORY */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              {payments.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">{isRTL ? 'کوئی ادائیگی ریکارڈ نہیں ہوئی' : 'No payment records found.'}</p>
                </div>
              ) : (
                payments.map(pay => (
                  <div key={pay.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm font-mono text-emerald-600">
                          +{formatPKR(pay.amount)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {pay.method}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        {pay.note || (isRTL ? 'ادھار وصولی' : 'Udhaar payment')}
                      </p>
                    </div>

                    <div className="text-end text-slate-400 font-mono text-[11px]">
                      <div>{new Date(pay.date).toLocaleDateString()}</div>
                      <div>{new Date(pay.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: ITEMS PURCHASED SUMMARY */}
          {activeTab === 'items' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              {purchasedItems.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">{isRTL ? 'کوئی سامان نہیں خریدا گیا' : 'No items purchased yet.'}</p>
                </div>
              ) : (
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-start">{isRTL ? 'اسیسری کا نام' : 'Accessory Name'}</th>
                      <th className="py-2.5 px-3 text-center">{isRTL ? 'کل تعداد' : 'Total Qty'}</th>
                      <th className="py-2.5 px-3 text-end">{isRTL ? 'کل خرچ' : 'Total Spent'}</th>
                      <th className="py-2.5 px-3 text-end">{isRTL ? 'آخری خریداری' : 'Last Bought'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchasedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                          {item.qty}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-600">
                          {formatPKR(item.spent)}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono text-slate-500 text-[11px]">
                          {new Date(item.lastDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

        </div>

        {/* BOTTOM FOOTER */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-mono text-[11px]">
            {isRTL ? 'گاہک آئی ڈی:' : 'Customer ID:'} {customer.id}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
          >
            {t('common.close')}
          </button>
        </div>

      </div>

      {/* QUICK PAYMENT RECORDING SUB-MODAL */}
      {isRecordingPayment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {isRTL ? 'ادھار وصولی درج کریں' : 'Record Udhaar Recovery'}
              </h3>
              <button onClick={() => setIsRecordingPayment(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'موجودہ ادھار بقایا' : 'Current Outstanding Balance'}
                </label>
                <div className="font-mono text-base font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100">
                  {formatPKR(currentBalance)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'وصول شدہ رقم (روپے) *' : 'Amount Received (PKR) *'}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentAmount || ''}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  placeholder="e.g. 1500"
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'طریقہ ادائیگی' : 'Payment Method'}
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                  {(['cash', 'easypaisa', 'jazzcash', 'bank'] as PaymentMethod[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-xl border transition-all text-center ${
                        paymentMethod === m
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m === 'cash' ? (isRTL ? 'نقد' : 'Cash') :
                       m === 'easypaisa' ? 'Easypaisa' :
                       m === 'jazzcash' ? 'JazzCash' : (isRTL ? 'بینک' : 'Bank')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'ریمارکس / تفصیل' : 'Remarks / Note'}
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  placeholder={isRTL ? 'وصولی نوٹ یا ٹرانزیکشن نمبر...' : 'Payment remarks or reference...'}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRecordingPayment(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={paymentAmount <= 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs"
                >
                  {isRTL ? 'وصولی تصدیق کریں' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

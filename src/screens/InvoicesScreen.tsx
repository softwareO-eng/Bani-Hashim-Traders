import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Invoice } from '../types';
import { 
  Receipt, Search, Printer, Trash2, Ban, AlertCircle, Edit
} from 'lucide-react';
import { ReceiptModal } from '../components/ReceiptModal';
import { EditInvoiceModal } from '../components/EditInvoiceModal';

export const InvoicesScreen: React.FC = () => {
  const { t, isRTL, formatPKR } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'udhaar' | 'today' | 'cancelled'>('all');
  
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadInvoices = () => {
    setInvoices(storage.getInvoices());
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const query = searchQuery.toLowerCase().trim();

    return invoices.filter(inv => {
      if (filterType === 'udhaar' && inv.balance <= 0) return false;
      if (filterType === 'cancelled' && inv.status !== 'cancelled') return false;
      if (filterType === 'today' && !inv.date.startsWith(todayStr)) return false;

      if (query) {
        const matchNumber = inv.number.toLowerCase().includes(query);
        const matchCustomer = (inv.customer_name || '').toLowerCase().includes(query);
        const matchPhone = (inv.customer_phone || '').includes(query);
        if (!matchNumber && !matchCustomer && !matchPhone) return false;
      }

      return true;
    });
  }, [invoices, searchQuery, filterType]);

  // DELETE EVERYWHERE: Delete Invoice permanently
  const handleDeleteInvoice = (invoiceId: string, number: string) => {
    if (confirm(isRTL ? `کیا آپ واقعی انوائس نمبر "${number}" کو مستقل طور پر حذف کرنا چاہتے ہیں؟` : `Are you sure you want to permanently delete invoice "${number}"?`)) {
      storage.deleteInvoice(invoiceId);
      loadInvoices();
    }
  };

  const handleConfirmCancel = () => {
    if (!cancellingInvoice || !cancelReason.trim()) return;

    try {
      storage.cancelInvoice(cancellingInvoice.id, cancelReason.trim());
      setCancellingInvoice(null);
      setCancelReason('');
      loadInvoices();
    } catch (err: any) {
      alert(err.message || 'Error cancelling invoice');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      
      {/* Top Title & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <span>{isRTL ? 'تمام فروخت شدہ انوائسز' : 'All Sales Invoices'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isRTL ? 'رسیدیں دیکھیں، پرنٹ کریں، منسوخ یا مستقل حذف کریں' : 'View, reprint, cancel or delete invoices'}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'}`}
          >
            {t('invoice.filter_all')}
          </button>
          <button
            onClick={() => setFilterType('today')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'today' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'}`}
          >
            {t('invoice.filter_today')}
          </button>
          <button
            onClick={() => setFilterType('udhaar')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'udhaar' ? 'bg-red-500 text-white shadow-xs font-bold' : 'text-slate-600'}`}
          >
            {t('invoice.filter_udhaar')}
          </button>
          <button
            onClick={() => setFilterType('cancelled')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'cancelled' ? 'bg-slate-800 text-white shadow-xs font-bold' : 'text-slate-600'}`}
          >
            {t('invoice.status_cancelled')}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className={`w-5 h-5 absolute top-3 text-slate-400 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('invoice.search_invoices')}
          className={`w-full py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
            isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'
          }`}
        />
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
            <p className="font-semibold text-slate-600 text-sm">
              {isRTL ? 'کوئی انوائس درج نہیں ہے۔' : 'No invoices recorded.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-start">{t('invoice.invoice_no')}</th>
                  <th className="py-3 px-4 text-start">{t('invoice.date')}</th>
                  <th className="py-3 px-4 text-start">{t('invoice.customer')}</th>
                  <th className="py-3 px-4 text-end">{t('invoice.total')}</th>
                  <th className="py-3 px-4 text-end">{t('invoice.paid')}</th>
                  <th className="py-3 px-4 text-end">{t('invoice.balance')}</th>
                  <th className="py-3 px-4 text-center">{t('invoice.status')}</th>
                  <th className="py-3 px-4 text-center">{t('products.col_actions')}</th>
                  <th className="py-3 px-4 text-center">{isRTL ? 'حذف (Delete)' : 'Delete'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredInvoices.map(inv => {
                  const isCancelled = inv.status === 'cancelled';
                  const hasUdhaar = inv.balance > 0;

                  return (
                    <tr key={inv.id} className={`hover:bg-slate-50/80 transition-colors ${isCancelled ? 'bg-red-50/30 text-slate-400' : ''}`}>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {inv.number}
                        </span>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          {inv.items?.length || 0} items
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div>{new Date(inv.date).toLocaleDateString(isRTL ? 'ur-PK' : 'en-PK')}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(inv.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{inv.customer_name || 'Walk-in'}</div>
                        {inv.customer_phone && (
                          <div className="text-[10px] text-slate-500 font-mono">{inv.customer_phone}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-end font-mono font-bold text-slate-900">
                        {formatPKR(inv.total)}
                      </td>

                      <td className="py-3 px-4 text-end font-mono text-emerald-700 font-semibold">
                        {formatPKR(inv.paid)}
                      </td>

                      <td className="py-3 px-4 text-end font-mono">
                        {hasUdhaar ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[11px]">
                            {formatPKR(inv.balance)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isCancelled ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                            {t('invoice.status_cancelled')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {t('invoice.status_completed')}
                          </span>
                        )}
                      </td>

                      {/* Print, Edit and Cancel actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="View & Print Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setEditingInvoice(inv)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="Edit Invoice Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setCancellingInvoice(inv);
                                setCancelReason('');
                              }}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors"
                              title="Cancel Invoice"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* DELETE EVERYWHERE: Delete Invoice permanently */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteInvoice(inv.id, inv.number)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Permanently Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print / Preview Modal */}
      {selectedInvoice && (
        <ReceiptModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onUpdated={loadInvoices}
        />
      )}

      {/* Invoice Cancellation Modal */}
      {cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-sm">
                {t('invoice.cancel_invoice')}: {cancellingInvoice.number}
              </h3>
            </div>

            <div className="my-3 text-xs text-slate-600 space-y-2">
              <p>
                {isRTL
                  ? 'منسوخ کرنے پر تمام آئٹمز کا اسٹاک واپس جمع کر دیا جائے گا اور بقایا ادھار منفی کر دیا جائے گا۔'
                  : 'Cancelling will return item quantities to stock and adjust customer Udhaar.'}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mt-3 mb-1">
                  {t('invoice.cancel_reason_prompt')}
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Returned / Wrong entry"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCancellingInvoice(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

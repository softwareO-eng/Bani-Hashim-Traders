import React, { useState } from 'react';
import { Invoice, PaymentMethod } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { X, Save, Trash2, Plus, AlertCircle } from 'lucide-react';

interface EditInvoiceModalProps {
  invoice: Invoice;
  onClose: () => void;
  onUpdated: () => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({ invoice, onClose, onUpdated }) => {
  const { isRTL, formatPKR } = useLanguage();
  const [number, setNumber] = useState(invoice.number);
  const [customerName, setCustomerName] = useState(invoice.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(invoice.customer_phone || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(invoice.payment_method);
  const [note, setNote] = useState(invoice.note || '');
  const [items, setItems] = useState([...invoice.items]);
  const [paid, setPaid] = useState(invoice.paid);
  const [discount, setDiscount] = useState(invoice.discount || 0);

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unit_price) - (item.discount || 0), 0);
  const total = Math.max(0, subtotal - discount);
  const balance = total - paid;

  const handleItemQtyChange = (index: number, qty: number) => {
    const updated = [...items];
    updated[index].qty = Math.max(1, qty);
    updated[index].total = (updated[index].qty * updated[index].unit_price) - (updated[index].discount || 0);
    setItems(updated);
  };

  const handleItemPriceChange = (index: number, price: number) => {
    const updated = [...items];
    updated[index].unit_price = Math.max(0, price);
    updated[index].total = (updated[index].qty * updated[index].unit_price) - (updated[index].discount || 0);
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert(isRTL ? 'انوائس میں کم از کم ایک آئٹم ہونا ضروری ہے۔' : 'Invoice must have at least one item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      storage.updateInvoice(invoice.id, {
        number: number.trim(),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        payment_method: paymentMethod,
        note: note.trim(),
        items,
        discount,
        paid: Math.min(total, paid),
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error updating invoice');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">
              {isRTL ? 'انوائس میں ترمیم کریں' : 'Edit Invoice Details'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800">
              {invoice.number}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isRTL ? 'انوائس نمبر' : 'Invoice Number'}
              </label>
              <input
                type="text"
                value={number}
                onChange={e => setNumber(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isRTL ? 'ادائیگی کا طریقہ' : 'Payment Method'}
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
              >
                <option value="cash">Cash (نقد)</option>
                <option value="easypaisa">Easypaisa</option>
                <option value="jazzcash">JazzCash</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isRTL ? 'گاہک کا نام' : 'Customer Name'}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {isRTL ? 'فون نمبر' : 'Customer Phone'}
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
              />
            </div>
          </div>

          {/* Items Edit Table */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              {isRTL ? 'آئٹمز کی تفصیل' : 'Invoice Items'}
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-start">Item</th>
                    <th className="py-2 px-3 text-center w-20">Qty</th>
                    <th className="py-2 px-3 text-end w-28">Unit Price</th>
                    <th className="py-2 px-3 text-end w-24">Total</th>
                    <th className="py-2 px-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium text-slate-900">
                        {item.product_name_en} {item.variant_title ? `(${item.variant_title})` : ''}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => handleItemQtyChange(idx, parseInt(e.target.value) || 1)}
                          className="w-16 py-1 px-2 border border-slate-300 rounded text-center font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-end">
                        <input
                          type="number"
                          min="0"
                          value={item.unit_price}
                          onChange={e => handleItemPriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-24 py-1 px-2 border border-slate-300 rounded text-end font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 text-end font-mono font-bold text-slate-900">
                        {formatPKR(item.total)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Discount (رعایت)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Paid Amount (وصول)</label>
              <input
                type="number"
                min="0"
                value={paid}
                onChange={e => setPaid(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Grand Total</label>
              <div className="py-1.5 px-3 font-mono font-bold text-slate-900 text-sm bg-white border border-slate-200 rounded-lg">
                {formatPKR(total)}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {isRTL ? 'انوائس کی تفصیل / پالیسی' : 'Invoice Description / Policy'}
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. 4 days return policy..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              {isRTL ? 'منسوخ' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isRTL ? 'تبدیلیاں محفوظ کریں' : 'Save Changes'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

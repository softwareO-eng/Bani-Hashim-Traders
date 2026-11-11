import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Customer, Invoice, Payment, PaymentMethod } from '../types';
import { 
  Users, Search, UserPlus, Phone, CreditCard, 
  MessageCircle, History, X, Check, ArrowDownLeft, Trash2, FolderOpen
} from 'lucide-react';
import { CustomerFolderModal } from '../components/CustomerFolderModal';

export const CustomersScreen: React.FC = () => {
  const { t, isRTL, formatPKR } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Recording Modal
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNote, setPaymentNote] = useState('');

  // Customer Folder / Dossier Modal
  const [folderCustomerId, setFolderCustomerId] = useState<string | null>(null);

  // Fast Add Customer Modal (ONLY NAME REQUIRED)
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const loadData = () => {
    setCustomers(storage.getCustomers());
    setInvoices(storage.getInvoices());
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalUdhaar = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.balance, 0);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;

    return customers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  // DELETE EVERYWHERE: Delete Customer
  const handleDeleteCustomer = (customerId: string, customerName: string) => {
    if (confirm(isRTL ? `کیا آپ واقعی گاہک "${customerName}" کو مستقل حذف کرنا چاہتے ہیں؟` : `Delete customer "${customerName}" permanently?`)) {
      storage.deleteCustomer(customerId);
      loadData();
    }
  };

  const sendWhatsAppReminder = (customer: Customer) => {
    if (!customer.phone) {
      alert(isRTL ? 'اس گاہک کا فون نمبر درج نہیں ہے۔' : 'No phone number for this customer.');
      return;
    }

    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    let fullPhone = cleanPhone;
    if (fullPhone.startsWith('0')) fullPhone = '92' + fullPhone.substring(1);
    else if (fullPhone.startsWith('3')) fullPhone = '92' + fullPhone;

    const settings = storage.getSettings();
    const shopName = isRTL ? settings.shop_name_ur : settings.shop_name_en;

    const text = isRTL 
      ? `السلام علیکم جناب ${customer.name} صاحب!
${shopName} کی طرف سے یاد دہانی: آپ کے ذمے بقایا ادھار کی رقم ${formatPKR(customer.balance)} واجب الادا ہے۔
شکریہ!
رابطہ: ${settings.shop_phone}`
      : `Dear ${customer.name},
Reminder from ${shopName}: Your outstanding balance is ${formatPKR(customer.balance)}.
Thank you!
Contact: ${settings.shop_phone}`;

    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCustomer || paymentAmount <= 0) return;

    try {
      storage.recordCustomerPayment(
        payingCustomer.id,
        paymentAmount,
        paymentMethod,
        paymentNote
      );
      loadData();
      setPayingCustomer(null);
      setPaymentAmount(0);
      setPaymentNote('');
    } catch (err: any) {
      alert(err.message || 'Payment recording error');
    }
  };

  // Add customer with NO FORCED FIELDS
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    storage.addCustomer({
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined
    });

    loadData();
    setIsAddCustomerOpen(false);
    setName('');
    setPhone('');
    setAddress('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      
      {/* Top Banner & Udhaar Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>{t('customers.title')}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRTL ? 'گاہکوں کا کھاتہ، ادھار بقایا اور وصولی' : 'Customer accounts, credit balances, and payments'}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">
              {customers.length} {isRTL ? 'گاہک درج ہیں' : 'Customers'}
            </span>
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('customers.add_customer')}</span>
            </button>
          </div>
        </div>

        {/* Total Outstanding Udhaar Stat Box */}
        <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-rose-100 flex items-center gap-1">
              <CreditCard className="w-4 h-4" />
              <span>{t('customers.total_udhaar')}</span>
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono mt-1">
              {formatPKR(totalUdhaar)}
            </div>
          </div>
          <p className="text-[11px] text-rose-100 mt-2">
            {isRTL ? 'مارکیٹ میں کل واجب الادا ادھار' : 'Total credit balance outstanding across all customers'}
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className={`w-4 h-4 absolute top-3 text-slate-400 ${isRTL ? 'right-3.5' : 'left-3.5'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('customers.search_placeholder')}
          className={`w-full py-2 bg-white border border-slate-200 rounded-xl text-xs shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
            isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
          }`}
        />
      </div>

      {/* Customers List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
            <p className="font-semibold text-slate-600 text-sm">
              {isRTL ? 'کوئی گاہک درج نہیں ملا۔ نیا گاہک شامل کرنے کے لیے اوپر بٹن دبائیں۔' : 'No customers recorded yet. Click "+ Add Customer" above.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-start">{t('customers.col_name')}</th>
                  <th className="py-3 px-4 text-start">{t('customers.col_phone')}</th>
                  <th className="py-3 px-4 text-end">{t('customers.col_balance')}</th>
                  <th className="py-3 px-4 text-center">{t('products.col_actions')}</th>
                  <th className="py-3 px-4 text-center">{isRTL ? 'حذف (Delete)' : 'Delete'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredCustomers.map(cust => {
                  const hasUdhaar = cust.balance > 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 leading-tight">{cust.name}</div>
                        {cust.address && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs">{cust.address}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        {cust.phone || '-'}
                      </td>

                      <td className="py-3 px-4 text-end font-mono">
                        {hasUdhaar ? (
                          <span className="font-extrabold text-red-600 text-sm">
                            {formatPKR(cust.balance)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold text-[11px]">
                            {isRTL ? 'صاف کھاتہ (Rs 0)' : 'Clear (Rs 0)'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setFolderCustomerId(cust.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                            title="Open Customer Folder & Dossier"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>{isRTL ? 'فولڈر کھاتہ' : 'Folder'}</span>
                          </button>

                          {hasUdhaar && (
                            <button
                              onClick={() => {
                                setPayingCustomer(cust);
                                setPaymentAmount(cust.balance);
                                setPaymentNote('');
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1"
                              title="Record Udhaar Recovery"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>{isRTL ? 'وصولی' : 'Receive'}</span>
                            </button>
                          )}

                          {hasUdhaar && cust.phone && (
                            <button
                              onClick={() => sendWhatsAppReminder(cust)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                              title="WhatsApp Reminder"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* DELETE EVERYWHERE: Delete Customer */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Customer"
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

      {/* Record Payment Modal */}
      {payingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {t('payment_modal.title')}
              </h3>
              <button onClick={() => setPayingCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('payment_modal.customer')}:</span>
                  <span className="font-bold text-slate-900">{payingCustomer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('payment_modal.current_balance')}:</span>
                  <span className="font-mono font-extrabold text-red-600">{formatPKR(payingCustomer.balance)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('payment_modal.amount_label')} *
                </label>
                <input
                  type="number"
                  min="1"
                  max={payingCustomer.balance}
                  required
                  value={paymentAmount || ''}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('payment_modal.method_label')}
                </label>
                <div className="grid grid-cols-4 gap-1 text-[11px] font-semibold">
                  {(['cash', 'easypaisa', 'jazzcash', 'bank'] as PaymentMethod[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 rounded-lg border transition-all ${
                        paymentMethod === m
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m === 'cash' ? t('pos.cash') :
                       m === 'easypaisa' ? 'Easypaisa' :
                       m === 'jazzcash' ? 'JazzCash' : 'Bank'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPayingCustomer(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={paymentAmount <= 0}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {t('payment_modal.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* FAST ADD CUSTOMER (NO FILL OUT FRICTION - ONLY NAME NEEDED) */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {t('customers.add_customer')}
              </h3>
              <button onClick={() => setIsAddCustomerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('customers.col_name')} *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Asad or Tariq Bhai"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('customers.col_phone')} ({isRTL ? 'اختیاری' : 'Optional'})
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'پتہ یا دکان (اختیاری)' : 'Address / Shop (Optional)'}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. Hall Road / Gulberg"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Customer Folder Dossier Modal */}
      {folderCustomerId && (
        <CustomerFolderModal
          customerId={folderCustomerId}
          onClose={() => setFolderCustomerId(null)}
          onDataChanged={() => {
            loadData();
          }}
        />
      )}

    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { User, PaymentMethod } from '../types';
import { 
  BarChart3, DollarSign, TrendingUp, ShoppingBag, 
  CreditCard, Calendar, Plus, Trash2, Lock, ArrowUpRight, 
  CheckCircle2, Download, AlertTriangle, Layers, Wallet, Receipt
} from 'lucide-react';

interface ReportsScreenProps {
  currentUser: User;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ currentUser }) => {
  const { t, isRTL, formatPKR } = useLanguage();
  const isOwner = currentUser.role === 'owner';

  // Selected Timeframe tab
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');

  // Add Expense Sub-modal
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<'rent' | 'electricity' | 'salaries' | 'transport' | 'tea_misc' | 'packaging' | 'marketing'>('tea_misc');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseMethod, setExpenseMethod] = useState<PaymentMethod>('cash');
  const [expenseNote, setExpenseNote] = useState('');

  // Refresh trigger state
  const [refreshKey, setRefreshKey] = useState(0);

  const reloadData = () => setRefreshKey(prev => prev + 1);

  // Compute full Profit & Loss metrics for chosen timeframe
  const plData = useMemo(() => {
    return storage.getProfitLoss(timeframe);
  }, [timeframe, refreshKey]);

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) return;

    storage.addExpense({
      category: expenseCategory,
      amount: expenseAmount,
      method: expenseMethod,
      note: expenseNote
    });

    setIsAddExpenseOpen(false);
    setExpenseAmount(0);
    setExpenseNote('');
    reloadData();
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm(isRTL ? 'کیا آپ واقعی یہ اخراجات حذف کرنا چاہتے ہیں؟' : 'Delete this expense record?')) {
      storage.deleteExpense(id);
      reloadData();
    }
  };

  const handleExportCSV = () => {
    const csvContent = storage.exportInvoicesCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bani_Hashim_Traders_PL_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categoryLabels = {
    rent: isRTL ? 'دکان کا کرایہ (Rent)' : 'Shop Rent',
    electricity: isRTL ? 'بجلی / یوٹیلیٹی (Electricity)' : 'Electricity & Bills',
    salaries: isRTL ? 'ملازمین کی تنخواہ (Salaries)' : 'Staff Salaries',
    transport: isRTL ? 'ٹرانسپورٹ / کرایہ (Transport)' : 'Transport & Freight',
    tea_misc: isRTL ? 'چائے اور دیگر اخراجات (Tea & Misc)' : 'Tea & Misc Expenses',
    packaging: isRTL ? 'پیکجنگ اور لفافے (Packaging)' : 'Shopping Bags & Packaging',
    marketing: isRTL ? 'اشتہارات اور فلیکس (Marketing)' : 'Advertising & Flex'
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      
      {/* HEADER BAR & TIMEFRAME SELECTOR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>{isRTL ? 'نفع و نقصان اور رپورٹ مینیجر' : 'Profit & Loss & Financial Reports'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRTL 
              ? 'ہر فروخت شدہ اسیسری پر منافع، کل فروخت، خریداری، اور خالص منافع کا حساب' 
              : 'Real-time calculation of gross profit on every sold item, sales, purchases & net profit'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* TIMEFRAME BUTTONS */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-xs font-semibold w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                timeframe === 'today' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRTL ? 'آج (Daily)' : 'Today'}
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                timeframe === 'week' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRTL ? 'ہفتہ وار (Weekly)' : 'Weekly'}
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                timeframe === 'month' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRTL ? 'ماہانہ (Monthly)' : 'Monthly'}
            </button>
            <button
              onClick={() => setTimeframe('year')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                timeframe === 'year' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRTL ? 'سالانہ (Yearly)' : 'Yearly'}
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors shrink-0"
            title="Export CSV Report"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CORE P&L FINANCIAL CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* CARD 1: TOTAL SALES (کل بکری) */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isRTL ? 'کل فروخت (Total Sales)' : 'Total Sales'}</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-2">
            {formatPKR(plData.totalSales)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{plData.invoiceCount} {isRTL ? 'انوائسز مکمل' : 'invoices'}</span>
            <span className="text-rose-600 font-bold">{isRTL ? 'ادھار:' : 'Udhaar:'} {formatPKR(plData.totalUdhaarGiven)}</span>
          </div>
        </div>

        {/* CARD 2: TOTAL PURCHASES (کل خریداری) */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isRTL ? 'کل خریداری (Purchases)' : 'Total Stock Purchases'}</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-purple-900 mt-2">
            {formatPKR(plData.totalPurchases)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isRTL ? 'سپلائرز سے موصول شدہ اسٹاک خرید' : 'Stock inventory received from suppliers'}
          </div>
        </div>

        {/* CARD 3: GROSS PROFIT (خام منافع) - Restricted to Owner */}
        <div className={`p-4 rounded-3xl border shadow-xs ${
          isOwner ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isOwner ? 'text-emerald-100' : 'text-slate-500'}`}>
              {isRTL ? 'خام منافع (Gross Profit)' : 'Gross Profit'}
            </span>
            <div className={`p-2 rounded-xl ${isOwner ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-400'}`}>
              {isOwner ? <TrendingUp className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
          </div>

          {isOwner ? (
            <>
              <div className="text-xl sm:text-2xl font-black font-mono text-white mt-2">
                {formatPKR(plData.grossProfit)}
              </div>
              <div className="text-[11px] text-emerald-200 mt-1">
                {plData.grossMargin.toFixed(1)}% {isRTL ? 'گراس مارجن (کل فروخت - لاگت)' : 'Gross Margin'}
              </div>
            </>
          ) : (
            <div className="text-xs font-bold text-slate-500 mt-3 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>{isRTL ? 'صرف دکان مالک کے لیے' : 'Owner Role Only'}</span>
            </div>
          )}
        </div>

        {/* CARD 4: NET PROFIT (خالص منافع - اخراجات نفی کے بعد) */}
        <div className={`p-4 rounded-3xl border shadow-xs ${
          isOwner 
            ? plData.netProfit >= 0 
              ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white' 
              : 'bg-gradient-to-br from-red-700 to-rose-900 text-white'
            : 'bg-slate-100 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isOwner ? 'text-slate-300' : 'text-slate-500'}`}>
              {isRTL ? 'خالص منافع (Net Profit)' : 'Net Profit'}
            </span>
            <div className={`p-2 rounded-xl ${isOwner ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-400'}`}>
              {isOwner ? <Wallet className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
          </div>

          {isOwner ? (
            <>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-2">
                {formatPKR(plData.netProfit)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {isRTL ? `اخراجات منہا: ${formatPKR(plData.totalExpenses)}` : `Deducted Expenses: ${formatPKR(plData.totalExpenses)}`}
              </div>
            </>
          ) : (
            <div className="text-xs font-bold text-slate-500 mt-3 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>{isRTL ? 'صرف دکان مالک کے لیے' : 'Owner Role Only'}</span>
            </div>
          )}
        </div>

      </div>

      {/* DETAILED P&L BREAKDOWN & OPERATING EXPENSES SECTION */}
      {isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* ITEM PROFITABILITY TABLE (Profit calculated on EVERY sold product) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>{isRTL ? 'ہر اسیسری پر انفرادی منافع (Profit Per Accessory)' : 'Profit Calculation On Every Sold Product'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isRTL ? 'فروخت کے وقت کی مقررہ خرید قیمت (Cost at sale) کے مطابق منافع کا فوری حساب' : 'Computed using cost_at_sale snapshot recorded on each invoice item'}
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100">
                {plData.productProfits.length} {isRTL ? 'آئٹمز' : 'items'}
              </span>
            </div>

            {plData.productProfits.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl text-xs">
                {isRTL ? 'اس وقت کے دوران کوئی فروخت نہیں ہوئی' : 'No products sold in this timeframe.'}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 text-start">{isRTL ? 'اسیسری کا نام' : 'Accessory / SKU'}</th>
                      <th className="py-2.5 px-3 text-center">{isRTL ? 'تعداد' : 'Qty'}</th>
                      <th className="py-2.5 px-3 text-end">{isRTL ? 'کل فروخت' : 'Revenue'}</th>
                      <th className="py-2.5 px-3 text-end">{isRTL ? 'خرید لاگت' : 'Cost'}</th>
                      <th className="py-2.5 px-3 text-end text-emerald-600">{isRTL ? 'منافع' : 'Profit'}</th>
                      <th className="py-2.5 px-3 text-end">{isRTL ? 'مارجن' : 'Margin'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {plData.productProfits.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{item.name_en}</div>
                          <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                          {item.qty}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-800">
                          {formatPKR(item.revenue)}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono text-slate-500">
                          {formatPKR(item.cost)}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-extrabold text-emerald-600">
                          +{formatPKR(item.profit)}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono text-slate-600 text-[11px]">
                          {item.margin.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* OPERATING EXPENSES MANAGER SIDEBAR */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-rose-600" />
                    <span>{isRTL ? 'دکان کے اخراجات (Expenses)' : 'Shop Operating Expenses'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isRTL ? 'کرایہ، بجلی، تنخواہیں و دیگر اخراجات' : 'Rent, bills, staff salaries, tea & transport'}
                  </p>
                </div>
                <button
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'خرچہ درج کریں' : 'Add Expense'}</span>
                </button>
              </div>

              {/* Expense List */}
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {plData.expensesList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">
                    {isRTL ? 'اس وقت کے دوران کوئی اخراجات درج نہیں' : 'No expenses logged for this period.'}
                  </p>
                ) : (
                  plData.expensesList.map(exp => (
                    <div key={exp.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{categoryLabels[exp.category] || exp.category}</div>
                        {exp.note && <div className="text-[10px] text-slate-500">{exp.note}</div>}
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(exp.date).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-600 text-sm">
                          -{formatPKR(exp.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between text-xs font-bold text-rose-900">
              <span>{isRTL ? 'کل اخراجات:' : 'Total Period Expenses:'}</span>
              <span className="font-mono text-sm text-rose-700">{formatPKR(plData.totalExpenses)}</span>
            </div>
          </div>

        </div>
      )}

      {/* DAILY / PERIOD BREAKDOWN TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>{isRTL ? 'روزانہ رپورٹ ہسٹری (Daily P&L History Breakdown)' : 'Daily Financial History Breakdown'}</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-start">{isRTL ? 'تاریخ' : 'Date'}</th>
                <th className="py-2.5 px-3 text-center">{isRTL ? 'انوائسز' : 'Bills'}</th>
                <th className="py-2.5 px-3 text-end">{isRTL ? 'کل فروخت' : 'Sales'}</th>
                <th className="py-2.5 px-3 text-end">{isRTL ? 'سامان لاگت' : 'COGS'}</th>
                <th className="py-2.5 px-3 text-end text-emerald-700">{isRTL ? 'خام منافع' : 'Gross Profit'}</th>
                <th className="py-2.5 px-3 text-end text-rose-600">{isRTL ? 'اخراجات' : 'Expenses'}</th>
                <th className="py-2.5 px-3 text-end text-emerald-600">{isRTL ? 'خالص منافع' : 'Net Profit'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plData.breakdownRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    {isRTL ? 'تاریخ کی کوئی تفصیلات موجود نہیں' : 'No records found.'}
                  </td>
                </tr>
              ) : (
                plData.breakdownRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {new Date(row.dateKey).toLocaleDateString(isRTL ? 'ur-PK' : 'en-PK', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                      {row.invoicesCount}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-900">
                      {formatPKR(row.sales)}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono text-slate-500">
                      {formatPKR(row.cogs)}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-700">
                      {isOwner ? formatPKR(row.grossProfit) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono text-rose-600 font-semibold">
                      {formatPKR(row.expenses)}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono font-extrabold text-emerald-600">
                      {isOwner ? formatPKR(row.netProfit) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXPENSE SUB-MODAL */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {isRTL ? 'دکان کے اخراجات درج کریں' : 'Log Shop Expense'}
              </h3>
              <button onClick={() => setIsAddExpenseOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'اخراجات کی قسم' : 'Expense Category'} *
                </label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value as any)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="tea_misc">{categoryLabels.tea_misc}</option>
                  <option value="rent">{categoryLabels.rent}</option>
                  <option value="electricity">{categoryLabels.electricity}</option>
                  <option value="salaries">{categoryLabels.salaries}</option>
                  <option value="transport">{categoryLabels.transport}</option>
                  <option value="packaging">{categoryLabels.packaging}</option>
                  <option value="marketing">{categoryLabels.marketing}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'رقم (روپے) *' : 'Amount Spent (PKR) *'}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={expenseAmount || ''}
                  onChange={e => setExpenseAmount(Number(e.target.value))}
                  placeholder="e.g. 500"
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
                      onClick={() => setExpenseMethod(m)}
                      className={`py-2 rounded-xl border transition-all text-center ${
                        expenseMethod === m
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
                  {isRTL ? 'تفصیل / نوٹ' : 'Note / Description'}
                </label>
                <input
                  type="text"
                  value={expenseNote}
                  onChange={e => setExpenseNote(e.target.value)}
                  placeholder={isRTL ? 'مثلاً چائے کا بل یا شاپر پیک خرید...' : 'e.g. Daily tea or shopping bags...'}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={expenseAmount <= 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs"
                >
                  {isRTL ? 'خرچہ درج کریں' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

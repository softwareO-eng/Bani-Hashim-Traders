import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Invoice, ProductVariant, Product, User } from '../types';
import { 
  TrendingUp, DollarSign, CreditCard, Lock, 
  BarChart3, AlertTriangle, Download, ArrowUpRight, CheckCircle2
} from 'lucide-react';

interface ReportsScreenProps {
  currentUser: User;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ currentUser }) => {
  const { t, isRTL, formatPKR } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const isOwner = currentUser.role === 'owner';

  useEffect(() => {
    setInvoices(storage.getInvoices());
    setVariants(storage.getVariants());
    setProducts(storage.getProducts());
  }, []);

  // Today's Date String in local ISO
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayInvoices = useMemo(() => {
    return invoices.filter(inv => inv.status === 'completed' && inv.date.startsWith(todayStr));
  }, [invoices, todayStr]);

  // Daily Totals
  const todaySales = useMemo(() => {
    return todayInvoices.reduce((sum, inv) => sum + inv.total, 0);
  }, [todayInvoices]);

  const todayCashCollected = useMemo(() => {
    return todayInvoices.reduce((sum, inv) => sum + inv.paid, 0);
  }, [todayInvoices]);

  const todayUdhaarGiven = useMemo(() => {
    return todayInvoices.reduce((sum, inv) => sum + inv.balance, 0);
  }, [todayInvoices]);

  // CRITICAL RULE 3: Profit computed strictly from cost_at_sale on invoice line items
  const todayGrossProfit = useMemo(() => {
    if (!isOwner) return 0;

    let totalProfit = 0;
    todayInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const itemRevenue = item.total;
        const itemCost = item.qty * item.cost_at_sale; // Uses frozen cost_at_sale
        totalProfit += (itemRevenue - itemCost);
      });
      // Deduct overall invoice discount if any
      totalProfit -= (inv.discount || 0);
    });

    return totalProfit;
  }, [todayInvoices, isOwner]);

  // Low stock list (< threshold)
  const lowStockVariants = useMemo(() => {
    return variants.filter(v => {
      const prod = products.find(p => p.id === v.product_id);
      return prod ? v.stock <= (prod.min_stock || 5) : false;
    });
  }, [variants, products]);

  // Download daily sales report
  const handleExportCSV = () => {
    const csvContent = storage.exportInvoicesCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pakmobile_sales_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      
      {/* Title & Date Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>{t('reports.title')}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {new Date().toLocaleDateString(isRTL ? 'ur-PK' : 'en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>{isRTL ? 'CSV رپورٹ ڈاؤنلوڈ کریں' : 'Download Sales CSV'}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Card 1: Today Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('reports.today_sales')}</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-2">
            {formatPKR(todaySales)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {todayInvoices.length} {isRTL ? 'انوائسز مکمل ہوئیں' : 'completed invoices today'}
          </div>
        </div>

        {/* Card 2: Cash & Digital Received */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('reports.cash_collected')}</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 mt-2">
            {formatPKR(todayCashCollected)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isRTL ? 'نقد، ایزی پیسہ، جاز کیش' : 'Cash, Easypaisa, JazzCash in counter'}
          </div>
        </div>

        {/* Card 3: Today's Udhaar Given */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('reports.udhaar_given')}</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 mt-2">
            {formatPKR(todayUdhaarGiven)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isRTL ? 'آج گاہکوں کے کھاتے میں درج ادھار' : 'Credit extended to customers today'}
          </div>
        </div>

        {/* Card 4: Gross Profit (RULE 4: Hidden from Cashier role) */}
        <div className={`p-4 rounded-2xl border shadow-xs ${
          isOwner ? 'bg-gradient-to-br from-emerald-700 to-teal-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${isOwner ? 'text-emerald-100' : 'text-slate-500'}`}>
              {t('reports.profit_today')}
            </span>
            <div className={`p-2 rounded-xl ${isOwner ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-400'}`}>
              {isOwner ? <TrendingUp className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
          </div>

          {isOwner ? (
            <>
              <div className="text-xl sm:text-2xl font-black font-mono text-white mt-2">
                {formatPKR(todayGrossProfit)}
              </div>
              <div className="text-[11px] text-emerald-200 mt-1">
                {todaySales > 0 ? `${((todayGrossProfit / todaySales) * 100).toFixed(1)}% gross margin` : 'No sales yet'}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-bold text-slate-600 mt-3 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>{t('reports.profit_hidden')}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {isRTL ? 'صرف دکان کے مالک کے پاس منافع دیکھنے کا اختیار ہے' : 'Restricted to Owner role via security rules'}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Critical Rule 3 Explanation Banner (For Owner) */}
      {isOwner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{isRTL ? 'قانون نمبر 3 کی تصدیق:' : 'Rule #3 Verified:'}</span>{' '}
            {t('reports.profit_explanation')}
          </div>
        </div>
      )}

      {/* Low Stock Reorder List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">
              {t('reports.low_stock_warnings')} ({lowStockVariants.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {isRTL ? 'یہ اشیاء فوری ہال روڈ / حفیظ سینٹر سے منگوانے کی ضرورت ہے' : 'Order soon from Hafeez Center or Hall Road'}
          </span>
        </div>

        {lowStockVariants.length === 0 ? (
          <p className="text-xs text-emerald-600 py-3 font-medium">✓ All variant inventory levels are healthy.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {lowStockVariants.map(v => {
              const p = products.find(prod => prod.id === v.product_id);

              return (
                <div key={v.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{isRTL ? (p?.name_ur || 'اسیسری') : (p?.name_en || 'Accessory')}</div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      {v.compatible_models?.[0] || 'Universal'} ({v.color || 'Standard'})
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold font-mono text-[11px]">
                      {v.stock} pcs left
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">Min: {p?.min_stock}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

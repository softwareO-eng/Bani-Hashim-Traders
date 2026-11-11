import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { ProductVariant, Product } from '../types';
import { ClipboardCheck, Search, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export const StockCountScreen: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [physicalCount, setPhysicalCount] = useState<number>(0);
  const [auditReason, setAuditReason] = useState<string>('Routine shelf physical audit');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = () => {
    setVariants(storage.getVariants());
    setProducts(storage.getProducts());
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedVariant = variants.find(v => v.id === selectedVariantId);
  const selectedProduct = selectedVariant ? products.find(p => p.id === selectedVariant.product_id) : null;

  const currentSystemStock = selectedVariant ? selectedVariant.stock : 0;
  const difference = selectedVariant ? physicalCount - currentSystemStock : 0;

  const handleSelect = (v: ProductVariant) => {
    setSelectedVariantId(v.id);
    setPhysicalCount(v.stock);
    setSuccessMessage(null);
  };

  const handleReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId) return;

    const move = storage.reconcileStockCount(
      selectedVariantId,
      physicalCount,
      auditReason.trim()
    );

    loadData();
    setSuccessMessage(
      isRTL 
        ? `اسٹاک کی تصدیق مکمل! موجودہ مقدار اب ${physicalCount} دانے ہے۔` 
        : `Reconciliation committed! New physical stock is ${physicalCount} pieces.`
    );
  };

  const filteredVariants = variants.filter(v => {
    if (!searchQuery.trim()) return true;
    const prod = products.find(p => p.id === v.product_id);
    const text = [
      prod?.name_en || '',
      prod?.name_ur || '',
      v.sku,
      v.color || '',
      ...(v.compatible_models || [])
    ].join(' ').toLowerCase();
    return text.includes(searchQuery.toLowerCase().trim());
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      
      {/* Title */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            <span>{t('nav.stock_count')}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isRTL ? 'دکان کی الماریوں پر موجود حقیقی سامان گن کر سسٹم کے ساتھ موازنہ اور درستگی' : 'Audit shelf physical inventory and reconcile discrepancies via stock_count movements'}
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Left: Variant picker */}
        <div className="md:col-span-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[520px]">
          <div className="relative mb-3">
            <Search className={`w-4 h-4 absolute top-2.5 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('products.search_placeholder')}
              className={`w-full py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden ${
                isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
              }`}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredVariants.map(v => {
              const p = products.find(prod => prod.id === v.product_id);
              const isSelected = v.id === selectedVariantId;

              return (
                <div
                  key={v.id}
                  onClick={() => handleSelect(v)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isSelected 
                      ? 'bg-emerald-50/80 border-emerald-500 shadow-xs' 
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900 leading-tight">
                      {isRTL ? p?.name_ur : p?.name_en}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {v.compatible_models?.[0] || 'Universal'} ({v.color || 'Standard'}) • {v.sku}
                    </div>
                  </div>

                  <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                    {v.stock} pcs
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Reconciliation Form */}
        <div className="md:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          {selectedVariant && selectedProduct ? (
            <form onSubmit={handleReconcile} className="space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {selectedVariant.sku}
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-1">
                  {isRTL ? selectedProduct.name_ur : selectedProduct.name_en}
                </h3>
                <div className="text-xs text-slate-600 mt-0.5">
                  {(selectedVariant.compatible_models || []).join(', ')} • {selectedVariant.color || 'Standard'}
                </div>
              </div>

              {/* Counts comparison box */}
              <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">System Stock</span>
                  <span className="font-mono font-bold text-sm text-slate-900">{currentSystemStock}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Physical Count</span>
                  <span className="font-mono font-bold text-sm text-emerald-700">{physicalCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Discrepancy</span>
                  <span className={`font-mono font-bold text-sm ${difference > 0 ? 'text-emerald-600' : difference < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {difference > 0 ? `+${difference}` : difference}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'الماری پر گنی گئی تعداد (دانے)' : 'Actual Physical Count on Shelf (Pieces)'} *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={physicalCount}
                  onChange={e => setPhysicalCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-base font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'آڈٹ نوٹ یا تصحیح کی وجہ' : 'Reconciliation Reason'}
                </label>
                <input
                  type="text"
                  value={auditReason}
                  onChange={e => setAuditReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={difference === 0}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-98"
              >
                {isRTL ? 'اسٹاک گنتی محفوظ کریں اور ریکارڈ اپ ڈیٹ کریں' : 'Commit Reconcile (Create stock_count move)'}
              </button>
            </form>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <ClipboardCheck className="w-12 h-12 mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-600">{isRTL ? 'پہلے بائیں طرف سے کوئی سامان منتخب کریں' : 'Select a variant from the list to audit'}</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

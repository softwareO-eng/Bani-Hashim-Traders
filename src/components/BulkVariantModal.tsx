import React, { useState } from 'react';
import { Product } from '../types';
import { storage } from '../services/storage';
import { useLanguage } from '../context/LanguageContext';
import { X, Layers, Plus, Trash2 } from 'lucide-react';

interface BulkVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
  preselectedProductId?: string;
}

export const BulkVariantModal: React.FC<BulkVariantModalProps> = ({
  isOpen,
  onClose,
  onGenerated,
  preselectedProductId
}) => {
  const { t, isRTL } = useLanguage();
  const products = storage.getProducts();

  const [productId, setProductId] = useState<string>(preselectedProductId || (products[0]?.id || ''));
  const [selectedModels, setSelectedModels] = useState<string[]>(['Universal']);
  const [selectedColors, setSelectedColors] = useState<string[]>(['Black', 'Clear']);
  const [customModelInput, setCustomModelInput] = useState('');
  const [customColorInput, setCustomColorInput] = useState('');
  
  const [baseCost, setBaseCost] = useState<number>(100);
  const [baseRetail, setBaseRetail] = useState<number>(350);
  const [baseWholesale, setBaseWholesale] = useState<number>(180);
  const [initialStock, setInitialStock] = useState<number>(10);

  if (!isOpen) return null;

  const handleAddModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (customModelInput.trim() && !selectedModels.includes(customModelInput.trim())) {
      setSelectedModels(prev => [...prev, customModelInput.trim()]);
      setCustomModelInput('');
    }
  };

  const handleAddColor = (e: React.FormEvent) => {
    e.preventDefault();
    if (customColorInput.trim() && !selectedColors.includes(customColorInput.trim())) {
      setSelectedColors(prev => [...prev, customColorInput.trim()]);
      setCustomColorInput('');
    }
  };

  const removeModel = (model: string) => {
    setSelectedModels(prev => prev.filter(m => m !== model));
  };

  const removeColor = (color: string) => {
    setSelectedColors(prev => prev.filter(c => c !== color));
  };

  const totalVariantsCount = selectedModels.length * selectedColors.length;

  const handleGenerate = () => {
    if (!productId || totalVariantsCount === 0) return;

    storage.bulkGenerateVariants(
      productId,
      selectedModels,
      selectedColors,
      baseCost,
      baseRetail,
      baseWholesale,
      initialStock
    );

    onGenerated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {isRTL ? 'بلک ورینٹ جنریٹر' : 'Bulk Variant Generator'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRTL ? 'فون ماڈلز اور رنگ لکھ کر فوری ورینٹس تیار کریں' : 'Enter models & colors to generate all variants at once'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Base Product */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('bulk_modal.select_product')}
            </label>
            {products.length === 0 ? (
              <p className="text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                {isRTL ? 'پہلے کوئی بنیادی پراڈکٹ شامل کریں' : 'Please add a base product first'}
              </p>
            ) : (
              <select
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {isRTL ? (p.name_ur || p.name_en) : p.name_en}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {isRTL ? 'قیمت فروخت (روپے)' : 'Retail Price (Rs)'}
              </label>
              <input
                type="number"
                min="0"
                value={baseRetail}
                onChange={e => setBaseRetail(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {isRTL ? 'لاگت خرید (اختیاری)' : 'Cost Price (Optional)'}
              </label>
              <input
                type="number"
                min="0"
                value={baseCost}
                onChange={e => setBaseCost(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {isRTL ? 'شروع کا اسٹاک' : 'Initial Stock'}
              </label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={e => setInitialStock(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Freeform Phone Models */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isRTL ? 'فون ماڈلز درج کریں' : 'Enter Phone Models'}
            </label>
            <form onSubmit={handleAddModel} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder={isRTL ? 'ماڈل کا نام لکھیں اور شامل کریں...' : 'Type phone model (e.g. A15, iPhone 15, Spark 20)...'}
                value={customModelInput}
                onChange={e => setCustomModelInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isRTL ? 'شامل کریں' : 'Add'}</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {selectedModels.map(model => (
                <span
                  key={model}
                  className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg flex items-center gap-1.5 border border-slate-200"
                >
                  <span>{model}</span>
                  <button
                    type="button"
                    onClick={() => removeModel(model)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Freeform Colors */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isRTL ? 'رنگ درج کریں' : 'Enter Colors'}
            </label>
            <form onSubmit={handleAddColor} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder={isRTL ? 'رنگ لکھیں...' : 'Type color (e.g. Black, Clear, Blue)...'}
                value={customColorInput}
                onChange={e => setCustomColorInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isRTL ? 'شامل کریں' : 'Add'}</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {selectedColors.map(color => (
                <span
                  key={color}
                  className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg flex items-center gap-1.5 border border-slate-200"
                >
                  <span>{color}</span>
                  <button
                    type="button"
                    onClick={() => removeColor(color)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-indigo-700 text-sm">{totalVariantsCount}</span>{' '}
            {isRTL ? 'ورینٹس تیار ہوں گے' : 'variants will be generated'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              disabled={totalVariantsCount === 0 || products.length === 0}
              onClick={handleGenerate}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all active:scale-98"
            >
              {t('bulk_modal.generate_btn')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

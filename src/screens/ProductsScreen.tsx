import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { Product, ProductVariant, Category, User } from '../types';
import { 
  Package, Search, Plus, Layers, AlertTriangle, 
  Trash2, X, Check, Edit
} from 'lucide-react';
import { BulkVariantModal } from '../components/BulkVariantModal';

interface ProductsScreenProps {
  currentUser: User;
}

export const ProductsScreen: React.FC<ProductsScreenProps> = ({ currentUser }) => {
  const { t, isRTL, formatPKR } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);

  // Simple Add Product Form (ONLY NAME & PRICE NEEDED)
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState<string>('');
  const [pStock, setPStock] = useState<string>('10');
  
  // Optional Extra Fields
  const [pNameUr, setPNameUr] = useState('');
  const [pCategory, setPCategory] = useState('cat-1');
  const [pBrand, setPBrand] = useState('');
  const [pCost, setPCost] = useState<string>('');
  const [pModel, setPModel] = useState('');
  const [pColor, setPColor] = useState('');

  // Stock Adjust Modal
  const [adjustingVariant, setAdjustingVariant] = useState<{ variant: ProductVariant; product: Product } | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<'purchase_received' | 'damage_loss' | 'manual_adjust'>('purchase_received');
  const [adjustNote, setAdjustNote] = useState('');

  const isOwnerOrStockKeeper = currentUser.role === 'owner' || currentUser.role === 'stock_keeper';

  const loadData = () => {
    setProducts(storage.getProducts());
    setVariants(storage.getVariants());
    setCategories(storage.getCategories());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVariants = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return variants.map(variant => {
      const product = products.find(p => p.id === variant.product_id);
      if (!product) return null;

      if (selectedCategoryId !== 'all' && product.category_id !== selectedCategoryId) {
        return null;
      }

      if (showLowStockOnly && variant.stock > (product.min_stock || 5)) {
        return null;
      }

      if (query) {
        const text = [
          product.name_en,
          product.name_ur || '',
          product.brand || '',
          variant.color || '',
          variant.sku,
          variant.barcode || '',
          ...(variant.compatible_models || [])
        ].join(' ').toLowerCase();

        if (!text.includes(query)) return null;
      }

      return { variant, product };
    }).filter(Boolean) as { variant: ProductVariant; product: Product }[];
  }, [variants, products, searchQuery, selectedCategoryId, showLowStockOnly]);

  // Fast Product Creation without friction
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pPrice) return;

    const retailPrice = Number(pPrice) || 0;
    const cost = Number(pCost) || 0;
    const initialStock = Number(pStock) || 0;

    storage.addProduct({
      name_en: pName.trim(),
      name_ur: pNameUr.trim() || undefined,
      category_id: pCategory,
      brand: pBrand.trim() || undefined,
      initial_retail_price: retailPrice,
      initial_cost: cost,
      initial_stock: initialStock,
      compatible_models: pModel.trim() ? [pModel.trim()] : ['Universal'],
      color: pColor.trim() || 'Standard'
    });

    loadData();
    setIsAddProductOpen(false);
    setPName('');
    setPPrice('');
    setPStock('10');
    setPNameUr('');
    setPBrand('');
    setPCost('');
    setPModel('');
    setPColor('');
    setShowMoreFields(false);
  };

  // DELETE Everywhere: Product & Variants
  const handleDeleteProduct = (productId: string, productName: string) => {
    if (confirm(isRTL ? `کیا آپ واقعی "${productName}" کو مستقل طور پر حذف کرنا چاہتے ہیں؟` : `Delete "${productName}" permanently?`)) {
      storage.deleteProduct(productId);
      loadData();
    }
  };

  const handleDeleteVariant = (variantId: string, sku: string) => {
    if (confirm(isRTL ? `کیا آپ واقعی اس ورینٹ (${sku}) کو حذف کرنا چاہتے ہیں؟` : `Delete variant (${sku})?`)) {
      storage.deleteVariant(variantId);
      loadData();
    }
  };

  // Adjust stock
  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingVariant || adjustQty === 0) return;

    const actualQty = adjustType === 'damage_loss' ? -Math.abs(adjustQty) : Math.abs(adjustQty);

    storage.createStockMove({
      variant_id: adjustingVariant.variant.id,
      qty: actualQty,
      type: adjustType,
      ref_type: 'manual',
      ref_id: `MANUAL-${Date.now().toString().slice(-4)}`,
      note: adjustNote.trim() || 'Manual stock adjustment'
    });

    loadData();
    setAdjustingVariant(null);
    setAdjustQty(0);
    setAdjustNote('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>{t('products.title')}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isRTL ? 'تمام سامان، قیمتیں، اسٹاک اور حذف کرنے کے اختیارات' : 'Manage accessories, prices, stock, and delete unwanted items'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Layers className="w-4 h-4" />
            <span>{t('products.bulk_generate')}</span>
          </button>

          <button
            onClick={() => setIsAddProductOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('products.add_product')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="md:col-span-5 relative">
          <Search className={`w-4 h-4 absolute top-3 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('products.search_placeholder')}
            className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
              isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
        </div>

        <div className="md:col-span-4">
          <select
            value={selectedCategoryId}
            onChange={e => setSelectedCategoryId(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            <option value="all">{t('products.all_categories')}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {isRTL ? c.name_ur : c.name_en}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
              showLowStockOnly
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t('products.low_stock_only', { threshold: 5 })}</span>
          </button>
        </div>
      </div>

      {/* Products & Variants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredVariants.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
            <p className="font-semibold text-slate-600 text-sm">
              {isRTL ? 'کوئی سامان موجود نہیں ہے۔ نیا سامان شامل کرنے کے لیے اوپر بٹن دبائیں۔' : 'No products found. Click "+ New Product" above to add accessories.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-start">{t('products.col_product')}</th>
                  <th className="py-3 px-4 text-start">{t('products.col_models')}</th>
                  <th className="py-3 px-4 text-start">{t('products.col_sku')}</th>
                  {isOwnerOrStockKeeper && (
                    <th className="py-3 px-4 text-end">{t('products.col_cost')}</th>
                  )}
                  <th className="py-3 px-4 text-end">{t('products.col_retail')}</th>
                  <th className="py-3 px-4 text-center">{t('products.col_stock')}</th>
                  <th className="py-3 px-4 text-center">{t('products.col_actions')}</th>
                  <th className="py-3 px-4 text-center">{isRTL ? 'حذف (Delete)' : 'Delete'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredVariants.map(({ variant, product }) => {
                  const isLow = variant.stock <= (product.min_stock || 5);

                  return (
                    <tr key={variant.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 leading-tight">
                          {isRTL ? (product.name_ur || product.name_en) : product.name_en}
                        </div>
                        {product.brand && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                            {product.brand}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[11px]">
                          {variant.compatible_models?.[0] || 'Universal'}
                        </span>
                        {variant.color && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            {variant.color}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        <span className="font-bold text-slate-800">{variant.sku}</span>
                      </td>

                      {isOwnerOrStockKeeper && (
                        <td className="py-3 px-4 text-end font-mono text-slate-600">
                          {formatPKR(variant.cost || 0)}
                        </td>
                      )}

                      <td className="py-3 px-4 text-end font-mono font-bold text-slate-900">
                        {formatPKR(variant.retail_price)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                          variant.stock <= 0 ? 'bg-red-100 text-red-800' :
                          isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {variant.stock} {t('common.pieces')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setAdjustingVariant({ variant, product });
                            setAdjustQty(0);
                            setAdjustNote('');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
                        >
                          {t('products.adjust_stock')}
                        </button>
                      </td>

                      {/* DELETE EVERYWHERE: Direct Delete Button */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name_en)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Product Everywhere"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Variant Modal */}
      <BulkVariantModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onGenerated={loadData}
      />

      {/* FAST ADD PRODUCT (NO FILL OUT FRICTION - ONLY NAME & PRICE REQUIRED) */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">
                {isRTL ? 'نیا سامان شامل کریں' : 'Add New Accessory'}
              </h3>
              <button onClick={() => setIsAddProductOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'سامان کا نام *' : 'Accessory Name *'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={pName}
                  onChange={e => setPName(e.target.value)}
                  placeholder="e.g. 9D Tempered Glass, Silicone Case, 20W Charger..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRTL ? 'قیمت فروخت (روپے) *' : 'Retail Price (Rs) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={pPrice}
                    onChange={e => setPPrice(e.target.value)}
                    placeholder="350"
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRTL ? 'شروع کا اسٹاک (دانے)' : 'Initial Stock (Pcs)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pStock}
                    onChange={e => setPStock(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Toggle Extra Optional Fields */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMoreFields(!showMoreFields)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <span>{showMoreFields ? (isRTL ? '- کم تفصیلات' : '- Less Details') : (isRTL ? '+ مزید تفصیلات (اختیاری)' : '+ More Details (Optional)')}</span>
                </button>
              </div>

              {showMoreFields && (
                <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {isRTL ? 'موبائل فون ماڈل (اختیاری)' : 'Phone Model (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={pModel}
                      onChange={e => setPModel(e.target.value)}
                      placeholder="e.g. Samsung A15, iPhone 15..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {isRTL ? 'خریداری لاگت (روپے)' : 'Cost Price (Rs)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={pCost}
                        onChange={e => setPCost(e.target.value)}
                        placeholder="120"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {isRTL ? 'رنگ (Color)' : 'Color'}
                      </label>
                      <input
                        type="text"
                        value={pColor}
                        onChange={e => setPColor(e.target.value)}
                        placeholder="Black / Clear"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!pName.trim() || !pPrice}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {isRTL ? 'سامان محفوظ کریں' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Movement Modal */}
      {adjustingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {t('products.adjust_stock')}
                </h3>
                <p className="text-xs text-slate-500">
                  {adjustingVariant.variant.sku}
                </p>
              </div>
              <button onClick={() => setAdjustingVariant(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjust} className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-600">{t('products.col_stock')}:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {adjustingVariant.variant.stock} {t('common.pieces')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'حرکت کی نوعیت' : 'Movement Type'}
                </label>
                <select
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="purchase_received">{t('stock_moves.type_purchase_received')}</option>
                  <option value="damage_loss">{t('stock_moves.type_damage_loss')}</option>
                  <option value="manual_adjust">{t('stock_moves.type_manual_adjust')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'تعداد (دانے)' : 'Quantity (Pieces)'} *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty || ''}
                  onChange={e => setAdjustQty(Number(e.target.value))}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdjustingVariant(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={adjustQty <= 0}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { StockMove, ProductVariant, Product, StockMoveType } from '../types';
import { 
  ArrowUpDown, Search, ArrowUpRight, ArrowDownRight, 
  RotateCcw, AlertTriangle, ShieldCheck, Trash2
} from 'lucide-react';

export const StockMovesScreen: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const [stockMoves, setStockMoves] = useState<StockMove[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const loadData = () => {
    setStockMoves(storage.getStockMoves());
    setVariants(storage.getVariants());
    setProducts(storage.getProducts());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredMoves = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return stockMoves.filter(move => {
      if (selectedType !== 'all' && move.type !== selectedType) return false;

      if (query) {
        const variant = variants.find(v => v.id === move.variant_id);
        const product = variant ? products.find(p => p.id === variant.product_id) : null;
        
        const text = [
          move.ref_id || '',
          move.user_name,
          move.note || '',
          variant?.sku || '',
          product?.name_en || '',
          product?.name_ur || ''
        ].join(' ').toLowerCase();

        if (!text.includes(query)) return false;
      }

      return true;
    });
  }, [stockMoves, variants, products, searchQuery, selectedType]);

  const handleDeleteMove = (moveId: string) => {
    if (confirm(isRTL ? 'کیا آپ اس اندراج کو ریکارڈ سے حذف کرنا چاہتے ہیں؟' : 'Delete this stock move entry?')) {
      storage.deleteStockMove(moveId);
      loadData();
    }
  };

  const getTypeBadge = (type: StockMoveType) => {
    switch (type) {
      case 'purchase_received':
        return {
          icon: <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />,
          label: t('stock_moves.type_purchase_received'),
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        };
      case 'sale':
        return {
          icon: <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />,
          label: t('stock_moves.type_sale'),
          color: 'bg-blue-50 text-blue-800 border-blue-200'
        };
      case 'customer_return':
        return {
          icon: <RotateCcw className="w-3.5 h-3.5 text-purple-600" />,
          label: t('stock_moves.type_customer_return'),
          color: 'bg-purple-50 text-purple-800 border-purple-200'
        };
      case 'supplier_return':
      case 'damage_loss':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-red-600" />,
          label: type === 'damage_loss' ? t('stock_moves.type_damage_loss') : t('stock_moves.type_supplier_return'),
          color: 'bg-red-50 text-red-800 border-red-200'
        };
      case 'stock_count':
      case 'manual_adjust':
      default:
        return {
          icon: <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />,
          label: type === 'stock_count' ? t('stock_moves.type_stock_count') : t('stock_moves.type_manual_adjust'),
          color: 'bg-amber-50 text-amber-800 border-amber-200'
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      
      {/* Title Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-emerald-600" />
            <span>{t('stock_moves.title')}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {t('stock_moves.subtitle')}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
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

        <div className="w-full sm:w-64">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            <option value="all">{isRTL ? 'تمام اقسام کی حرکات' : 'All Movement Types'}</option>
            <option value="sale">{t('stock_moves.type_sale')}</option>
            <option value="purchase_received">{t('stock_moves.type_purchase_received')}</option>
            <option value="customer_return">{t('stock_moves.type_customer_return')}</option>
            <option value="damage_loss">{t('stock_moves.type_damage_loss')}</option>
            <option value="manual_adjust">{t('stock_moves.type_manual_adjust')}</option>
            <option value="stock_count">{t('stock_moves.type_stock_count')}</option>
          </select>
        </div>
      </div>

      {/* Stock Moves Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredMoves.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ArrowUpDown className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-[1.5]" />
            <p className="font-semibold text-slate-600 text-sm">{isRTL ? 'کوئی اسٹاک ریکارڈ نہیں ملا' : 'No stock movements logged.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 text-start">{t('stock_moves.col_date')}</th>
                  <th className="py-3 px-4 text-start">{t('stock_moves.col_item')}</th>
                  <th className="py-3 px-4 text-start">{t('stock_moves.col_type')}</th>
                  <th className="py-3 px-4 text-center">{t('stock_moves.col_qty')}</th>
                  <th className="py-3 px-4 text-start">{t('stock_moves.col_ref')}</th>
                  <th className="py-3 px-4 text-start">{t('stock_moves.col_note')}</th>
                  <th className="py-3 px-4 text-center">{isRTL ? 'حذف' : 'Delete'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredMoves.map(move => {
                  const variant = variants.find(v => v.id === move.variant_id);
                  const product = variant ? products.find(p => p.id === variant.product_id) : null;
                  const badge = getTypeBadge(move.type);
                  const isPositive = move.qty > 0;

                  return (
                    <tr key={move.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        <div>{new Date(move.created_at).toLocaleDateString(isRTL ? 'ur-PK' : 'en-PK')}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(move.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 leading-tight">
                          {isRTL ? (product?.name_ur || 'سامان') : (product?.name_en || 'Accessory')}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {variant?.sku || 'Item'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${badge.color}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`font-mono font-bold text-xs ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                          {isPositive ? `+${move.qty}` : move.qty} {t('common.pieces')}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {move.ref_id || '-'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {move.note || '-'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteMove(move.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Move"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

    </div>
  );
};

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../services/storage';
import { ProductVariant, Product, Customer, Invoice, PaymentMethod } from '../types';
import { 
  Search, Barcode, ShoppingCart, Trash2, Plus, Minus, 
  CreditCard, UserPlus, CheckCircle, AlertTriangle, 
  Sparkles, X, Receipt, Tag
} from 'lucide-react';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { ReceiptModal } from '../components/ReceiptModal';
import confetti from 'canvas-confetti';

interface CartItem {
  variantId: string;
  name: string;
  subtitle?: string;
  qty: number;
  unitPrice: number;
  discount: number;
  isCustom?: boolean;
}

export const PosScreen: React.FC = () => {
  const { t, isRTL, formatPKR } = useLanguage();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Data from storage
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // POS State
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerType, setCustomerType] = useState<'retail' | 'wholesale'>('retail');
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isUdhaarSale, setIsUdhaarSale] = useState<boolean>(false);
  const [saleNote, setSaleNote] = useState<string>('');

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [recentCompletedInvoice, setRecentCompletedInvoice] = useState<Invoice | null>(null);

  // Custom Item Form State (Quick On-The-Fly Item)
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState<string>('');
  const [customItemQty, setCustomItemQty] = useState<number>(1);
  const [saveCustomToCatalog, setSaveCustomToCatalog] = useState(false);

  // Quick Customer Form State (ONLY NAME REQUIRED)
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  const refreshData = () => {
    setProducts(storage.getProducts());
    setVariants(storage.getVariants());
    setCustomers(storage.getCustomers());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerType(selectedCustomer.type);
    }
  }, [selectedCustomer]);

  // Search by accessory name, brand, or phone model
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const tokens = searchQuery.toLowerCase().trim().split(/\s+/);

    return variants.map(variant => {
      const product = products.find(p => p.id === variant.product_id);
      if (!product) return null;

      const searchableText = [
        product.name_en,
        product.name_ur || '',
        product.brand || '',
        variant.color || '',
        variant.sku,
        variant.barcode || '',
        ...(variant.compatible_models || [])
      ].join(' ').toLowerCase();

      const isMatch = tokens.every(token => searchableText.includes(token));
      if (isMatch) {
        return { variant, product };
      }
      return null;
    }).filter(Boolean) as { variant: ProductVariant; product: Product }[];
  }, [searchQuery, variants, products]);

  // Add standard catalog item to cart
  const addToCart = (variant: ProductVariant, product: Product) => {
    const price = customerType === 'wholesale' ? (variant.wholesale_price || variant.retail_price) : variant.retail_price;

    setCart(prev => {
      const existing = prev.find(item => item.variantId === variant.id && !item.isCustom);
      if (existing) {
        return prev.map(item => 
          item.variantId === variant.id && !item.isCustom
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      } else {
        return [...prev, {
          variantId: variant.id,
          name: isRTL ? (product.name_ur || product.name_en) : product.name_en,
          subtitle: `${variant.compatible_models?.[0] || ''} (${variant.color || 'Standard'})`,
          qty: 1,
          unitPrice: price,
          discount: 0,
          isCustom: false
        }];
      }
    });

    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  // Add CUSTOM on-the-fly Item to sale without friction
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) return;

    const price = Number(customItemPrice) || 0;
    const qty = Math.max(1, customItemQty || 1);
    const customId = `custom-${Date.now()}`;

    // Optionally save to catalog for future if user checks the box
    if (saveCustomToCatalog) {
      storage.addProduct({
        name_en: customItemName.trim(),
        initial_retail_price: price,
        initial_stock: 0
      });
      refreshData();
    }

    setCart(prev => [
      ...prev,
      {
        variantId: customId,
        name: customItemName.trim(),
        subtitle: isRTL ? 'دستی شامل کردہ سامان' : 'Custom Entry',
        qty,
        unitPrice: price,
        discount: 0,
        isCustom: true
      }
    ]);

    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty(1);
    setSaveCustomToCatalog(false);
    setIsCustomItemOpen(false);
  };

  const handleBarcodeScanned = (code: string) => {
    const foundVariant = variants.find(v => v.barcode === code || v.sku.toLowerCase() === code.toLowerCase());
    if (foundVariant) {
      const product = products.find(p => p.id === foundVariant.product_id);
      if (product) {
        addToCart(foundVariant, product);
        return;
      }
    }
    setSearchQuery(code);
  };

  const updateQty = (index: number, delta: number) => {
    setCart(prev => prev.map((item, idx) => {
      if (idx === index) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, idx) => idx !== index));
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.qty * item.unitPrice) - item.discount, 0);
  }, [cart]);

  const grandTotal = Math.max(0, subtotal - (overallDiscount || 0));

  useEffect(() => {
    if (!isUdhaarSale) {
      setAmountReceived(String(grandTotal));
    }
  }, [grandTotal, isUdhaarSale]);

  const numReceived = parseFloat(amountReceived) || 0;
  const changeReturn = Math.max(0, numReceived - grandTotal);
  const udhaarBalance = Math.max(0, grandTotal - numReceived);

  // Complete Sale
  const handleCompleteSale = () => {
    if (cart.length === 0) return;

    if (udhaarBalance > 0 && !selectedCustomerId) {
      alert(isRTL ? 'ادھار پر فروخت کے لیے گاہک منتخب کریں یا نام درج کریں۔' : 'Please select or add a Customer for Udhaar credit sale.');
      return;
    }

    const payload = {
      customer_id: selectedCustomerId || null,
      customer_name: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer (General)',
      customer_phone: selectedCustomer?.phone || '',
      type: customerType,
      items: cart.map(item => ({
        variant_id: item.variantId,
        qty: item.qty,
        unit_price: item.unitPrice,
        discount: item.discount,
        custom_name: item.name,
        is_custom: item.isCustom
      })),
      overall_discount: overallDiscount,
      tax: 0,
      paid: isUdhaarSale ? Math.min(grandTotal, numReceived) : grandTotal,
      payment_method: paymentMethod,
      note: saleNote
    };

    try {
      const invoice = storage.createInvoice(payload);
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.8 } });
      setRecentCompletedInvoice(invoice);

      setCart([]);
      setOverallDiscount(0);
      setAmountReceived('');
      setIsUdhaarSale(false);
      setSaleNote('');
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Error creating invoice');
    }
  };

  // Fast customer creation (ONLY NAME NEEDED)
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const created = storage.addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim() || undefined
    });

    refreshData();
    setSelectedCustomerId(created.id);
    setIsAddCustomerOpen(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      
      {/* LEFT: Search & Quick Accessories */}
      <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden border-b lg:border-b-0 lg:border-e border-slate-200">
        
        {/* Search & Custom Item Bar */}
        <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200 mb-3 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className={`w-5 h-5 absolute top-3 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'سامان یا ماڈل تلاش کریں...' : 'Search accessory or phone model...'}
                className={`w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
                  isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'
                }`}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute top-2.5 p-1 text-slate-400 hover:text-slate-600 ${isRTL ? 'left-2.5' : 'right-2.5'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Custom Entry Option Button */}
            <button
              onClick={() => setIsCustomItemOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 shrink-0"
              title="Add Custom Accessory to Sale"
            >
              <Plus className="w-4 h-4" />
              <span>{isRTL ? '+ دستی سامان' : '+ Custom Item'}</span>
            </button>

            {/* Camera Barcode Scanner */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 shrink-0"
              title="Scan Barcode"
            >
              <Barcode className="w-4 h-4" />
              <span className="hidden sm:inline">{t('pos.scan_camera')}</span>
            </button>
          </div>
        </div>

        {/* Search Results or Catalog List */}
        <div className="flex-1 overflow-y-auto pr-1">
          {searchQuery ? (
            searchResults.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center">
                <Search className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm font-medium">{t('products.no_products')}</p>
                <button
                  onClick={() => {
                    setCustomItemName(searchQuery);
                    setIsCustomItemOpen(true);
                  }}
                  className="mt-3 px-3.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors"
                >
                  {isRTL ? `"${searchQuery}" کو بطور دستی سامان شامل کریں` : `Add "${searchQuery}" as Custom Item`}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {searchResults.map(item => {
                  if (!item) return null;
                  const { variant, product } = item;
                  const price = customerType === 'wholesale' ? (variant.wholesale_price || variant.retail_price) : variant.retail_price;

                  return (
                    <div
                      key={variant.id}
                      onClick={() => addToCart(variant, product)}
                      className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group active:scale-98"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {variant.sku}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-800">
                            {variant.stock} {t('common.pieces')}
                          </span>
                        </div>

                        <h4 className="font-semibold text-slate-900 text-sm leading-tight group-hover:text-emerald-600 transition-colors">
                          {isRTL ? (product.name_ur || product.name_en) : product.name_en}
                        </h4>
                        
                        <div className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                          <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {variant.compatible_models?.[0] || 'Universal'}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span>{variant.color || 'Standard'}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-base font-bold text-slate-900 font-mono">
                          {formatPKR(price)}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-all">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : variants.length === 0 ? (
            /* Empty State when no items in catalog yet */
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 p-6 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <Tag className="w-12 h-12 mb-3 opacity-30 text-emerald-600" />
              <h4 className="text-base font-bold text-slate-800">
                {isRTL ? 'دکان میں ابھی کوئی سامان درج نہیں ہے' : 'No accessories in catalog yet'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {isRTL 
                  ? 'آپ اوپر "+ دستی سامان" پر کلک کر کے فوری طور پر کوئی بھی اسیسری فروخت کر سکتے ہیں، یا سامان کے مینو سے نئی پراڈکٹس شامل کر سکتے ہیں۔'
                  : 'Click "+ Custom Item" above to sell any accessory on-the-fly, or add products from the Products & Stock screen.'}
              </p>
              <button
                onClick={() => setIsCustomItemOpen(true)}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                {isRTL ? '+ فوری دستی سامان فروخت کریں' : '+ Add Custom Item to Sale'}
              </button>
            </div>
          ) : (
            /* Items in catalog */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {variants.map(variant => {
                const product = products.find(p => p.id === variant.product_id);
                if (!product) return null;
                const price = customerType === 'wholesale' ? (variant.wholesale_price || variant.retail_price) : variant.retail_price;

                return (
                  <div
                    key={variant.id}
                    onClick={() => addToCart(variant, product)}
                    className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group active:scale-98"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {variant.sku}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-800">
                          {variant.stock} {t('common.pieces')}
                        </span>
                      </div>

                      <h4 className="font-medium text-slate-900 text-xs sm:text-sm leading-tight group-hover:text-emerald-600 transition-colors line-clamp-1">
                        {isRTL ? (product.name_ur || product.name_en) : product.name_en}
                      </h4>

                      <div className="mt-1 text-[11px] text-slate-600 flex items-center gap-1">
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                          {variant.compatible_models?.[0] || 'Universal'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span>{variant.color || 'Standard'}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 font-mono">
                        {formatPKR(price)}
                      </span>
                      <div className="w-7 h-7 rounded-md bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-all text-slate-600">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT: Cart & Checkout Panel */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-white flex flex-col shadow-lg border-t lg:border-t-0 z-10">
        
        {/* Customer & Pricing Tier Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('pos.customer_label')}
              </label>
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">{t('pos.walk_in')}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} {c.balance > 0 ? `[ادھار: ${formatPKR(c.balance)}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="mt-4 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1 shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('pos.add_customer')}</span>
            </button>
          </div>

          {selectedCustomer && selectedCustomer.balance > 0 && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
              <span className="text-amber-800 font-medium">
                {isRTL ? 'پہلے سے واجب الادا ادھار:' : 'Previous Udhaar Balance:'}
              </span>
              <span className="font-mono font-bold text-red-600">
                {formatPKR(selectedCustomer.balance)}
              </span>
            </div>
          )}

          {/* Retail vs Wholesale Tier Switch */}
          <div className="grid grid-cols-2 gap-1 bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setCustomerType('retail')}
              className={`py-1 rounded-md transition-all ${customerType === 'retail' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              {t('pos.customer_type_retail')}
            </button>
            <button
              onClick={() => setCustomerType('wholesale')}
              className={`py-1 rounded-md transition-all ${customerType === 'wholesale' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-slate-600'}`}
            >
              {t('pos.customer_type_wholesale')}
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-30 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-600">{t('pos.cart_title')}</p>
              <p className="text-xs text-slate-400 mt-1">
                {isRTL ? 'کوئی سامان شامل کرنے کے لیے تلاش کریں یا "+ دستی سامان" پر کلک کریں' : 'Cart is empty. Click "+ Custom Item" or search accessories'}
              </p>
            </div>
          ) : (
            cart.map((item, index) => {
              const itemTotal = (item.qty * item.unitPrice) - item.discount;

              return (
                <div 
                  key={`${item.variantId}-${index}`}
                  className="p-2.5 rounded-xl border bg-slate-50 border-slate-200 transition-all"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <h5 className="font-semibold text-slate-900 text-xs leading-tight">
                          {item.name}
                        </h5>
                        {item.isCustom && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                            {isRTL ? 'دستی' : 'Custom'}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-slate-500 font-medium">
                          {item.subtitle}
                        </div>
                      )}
                    </div>

                    {/* DELETE Item from Cart */}
                    <button
                      onClick={() => removeFromCart(index)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete item from cart"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQty(index, -1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold font-mono text-xs text-slate-900">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(index, 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-end">
                      <div className="text-[10px] text-slate-400">
                        {item.qty} × {formatPKR(item.unitPrice).replace(/^(Rs|روپے)\s*/, '')}
                      </div>
                      <div className="font-bold font-mono text-sm text-slate-900">
                        {formatPKR(itemTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Checkout & Udhaar Controls */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5">
          <div className="space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span>{t('pos.subtotal')}:</span>
              <span className="font-mono font-semibold">{formatPKR(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span>{t('pos.discount')}:</span>
              <input
                type="number"
                min="0"
                value={overallDiscount || ''}
                onChange={e => setOverallDiscount(Number(e.target.value))}
                placeholder="0"
                className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-lg text-end font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>{t('pos.grand_total')}:</span>
              <span className="font-mono text-base text-emerald-700">{formatPKR(grandTotal)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              {t('pos.payment_method')}
            </label>
            <div className="grid grid-cols-4 gap-1 text-[11px] font-semibold">
              {(['cash', 'easypaisa', 'jazzcash', 'bank'] as PaymentMethod[]).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 rounded-lg border transition-all ${
                    paymentMethod === method
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {method === 'cash' ? t('pos.cash') :
                   method === 'easypaisa' ? 'Easypaisa' :
                   method === 'jazzcash' ? 'JazzCash' : 'Bank'}
                </button>
              ))}
            </div>
          </div>

          {/* Udhaar Sale Toggle */}
          <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50/70 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                <span>{t('pos.is_udhaar_sale')}</span>
              </span>
              <input
                type="checkbox"
                checked={isUdhaarSale}
                onChange={e => setIsUdhaarSale(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </label>

            {isUdhaarSale && (
              <div className="space-y-2 pt-1 border-t border-amber-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-700">{t('pos.amount_received')}:</span>
                  <input
                    type="number"
                    min="0"
                    value={amountReceived}
                    onChange={e => setAmountReceived(e.target.value)}
                    className="w-28 px-2 py-1 bg-white border border-amber-300 rounded-lg text-end font-mono text-xs font-bold"
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-red-700">
                  <span>{t('pos.udhaar_balance')}:</span>
                  <span className="font-mono">{formatPKR(udhaarBalance)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Complete Sale Button */}
          <button
            disabled={cart.length === 0}
            onClick={handleCompleteSale}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Receipt className="w-4 h-4" />
            <span>{t('pos.complete_sale')}</span>
          </button>
        </div>

      </div>

      {/* CUSTOM ITEM ENTRY MODAL (Prompt: "Add custom entrie option. Because sometimes we yahe to enter different name orr accessories") */}
      {isCustomItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {isRTL ? 'دستی سامان شامل کریں (Custom Entry)' : 'Add Custom Accessory to Sale'}
                </h3>
              </div>
              <button onClick={() => setIsCustomItemOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRTL ? 'سامان / اسیسری کا نام *' : 'Accessory / Item Name *'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={customItemName}
                  onChange={e => setCustomItemName(e.target.value)}
                  placeholder={isRTL ? 'مثلاً: ٹیکنو پوا گلاس، یا ہیڈ فون' : 'e.g. Tecno Pova Glass, Local Earbuds, OTG...'}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRTL ? 'قیمت فروخت (روپے) *' : 'Sale Price (PKR) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={customItemPrice}
                    onChange={e => setCustomItemPrice(e.target.value)}
                    placeholder="350"
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isRTL ? 'تعداد (دانے)' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customItemQty}
                    onChange={e => setCustomItemQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={saveCustomToCatalog}
                    onChange={e => setSaveCustomToCatalog(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{isRTL ? 'آئندہ کے لیے لسٹ میں بھی محفوظ رکھیں' : 'Save to product catalog for future sales'}</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCustomItemOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!customItemName.trim() || !customItemPrice}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  {isRTL ? 'فروخت میں شامل کریں' : 'Add to Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CUSTOMER (NO FORCED FIELDS - ONLY NAME REQUIRED) */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                {isRTL ? 'گاہک کا نام درج کریں' : 'Quick Add Customer'}
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
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="e.g. Asad or Walk-in Customer"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('customers.col_phone')} ({isRTL ? 'اختیاری' : 'Optional'})
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  placeholder="03XX-XXXXXXX"
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
                  disabled={!newCustName.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Completed Invoice Print Modal */}
      {recentCompletedInvoice && (
        <ReceiptModal
          invoice={recentCompletedInvoice}
          onClose={() => setRecentCompletedInvoice(null)}
        />
      )}

    </div>
  );
};

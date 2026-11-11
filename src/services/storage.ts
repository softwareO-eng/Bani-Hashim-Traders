import { 
  User, Category, Product, ProductVariant, StockMove, Customer, 
  Invoice, InvoiceItem, Payment, Supplier, Expense, ShopSettings 
} from '../types';
import { db } from './firebase';
import { 
  collection, doc, setDoc, deleteDoc, getDocs 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const STORAGE_KEY = 'pakmobile_pos_db_clean_v2';
const CURRENT_USER_KEY = 'pakmobile_active_user_v2';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Muhammad Usman (Owner)',
    phone: '03001234567',
    role: 'owner',
    pin_hash: '1234',
    language_pref: 'en'
  },
  {
    id: 'user-2',
    name: 'Ali Raza (Cashier)',
    phone: '03129876543',
    role: 'cashier',
    pin_hash: '2222',
    language_pref: 'ur'
  },
  {
    id: 'user-3',
    name: 'Tariq Mehmood (Stock Keeper)',
    phone: '03335554444',
    role: 'stock_keeper',
    pin_hash: '3333',
    language_pref: 'en'
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name_en: 'Tempered Glass & Protectors', name_ur: 'ٹیمپرڈ گلاس اور پروٹیکٹرز', icon: 'Shield' },
  { id: 'cat-2', name_en: 'Back Covers & Cases', name_ur: 'بیک کورز اور کیسز', icon: 'Smartphone' },
  { id: 'cat-3', name_en: 'Fast Chargers & Adapters', name_ur: 'فاسٹ چارجرز اور اڈاپٹرز', icon: 'Zap' },
  { id: 'cat-4', name_en: 'Cables & OTG Adapters', name_ur: 'کیبلز اور او ٹی جی', icon: 'Cable' },
  { id: 'cat-5', name_en: 'Earbuds, Neckbands & Audio', name_ur: 'ایئربڈز اور ہینڈز فری', icon: 'Headphones' },
  { id: 'cat-6', name_en: 'Other Mobile Accessories', name_ur: 'دیگر موبائل اسیسریز', icon: 'Package' }
];

export const INITIAL_SETTINGS: ShopSettings = {
  shop_name_en: 'Bani Hashim Traders',
  shop_name_ur: 'بنی ہاشم ٹریڈرز',
  shop_address_en: 'Shop # 18, Basement, Hafeez Center, Gulberg III, Lahore',
  shop_address_ur: 'دکان نمبر 18، بیسمنٹ، حفیظ سینٹر، مین بلیوارڈ گلبرگ، لاہور',
  shop_phone: '0300-4567890',
  shop_whatsapp: '0300-4567890',
  invoice_prefix: 'BHT-2026',
  tax_rate: 0,
  currency_symbol: 'Rs',
  receipt_footer_en: 'Accessories once sold can only be exchanged within 3 days. No cash refund.',
  receipt_footer_ur: 'فروخت شدہ سامان صرف 3 دن میں تبدیل ہو سکتا ہے۔ نقد واپسی نہیں ہوگی۔',
  printer_type: '80mm',
  firebase_project_id: firebaseConfig.projectId,
  firebase_database_id: firebaseConfig.firestoreDatabaseId,
  firebase_sync_enabled: true
};

export interface AppDatabase {
  users: User[];
  categories: Category[];
  products: Product[];
  variants: ProductVariant[];
  stockMoves: StockMove[];
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  suppliers: Supplier[];
  expenses: Expense[];
  settings: ShopSettings;
}

class StorageService {
  private db: AppDatabase;
  private currentUser: User;

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.db = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse storage, creating clean state', e);
        this.db = this.initFreshDatabase();
      }
    } else {
      this.db = this.initFreshDatabase();
      this.persist();
    }

    if (this.db.settings && this.db.settings.shop_name_en !== 'Bani Hashim Traders') {
      this.db.settings.shop_name_en = 'Bani Hashim Traders';
      this.db.settings.shop_name_ur = 'بنی ہاشم ٹریڈرز';
      this.db.settings.invoice_prefix = 'BHT-2026';
      this.persist();
    }

    const savedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch {
        this.currentUser = INITIAL_USERS[0];
      }
    } else {
      this.currentUser = INITIAL_USERS[0];
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.currentUser));
    }

    // Attempt initial sync with Firestore
    this.syncFromFirebase();
  }

  // Clean empty initial state (NO demo products, NO demo invoices, NO demo customers)
  private initFreshDatabase(): AppDatabase {
    return {
      users: INITIAL_USERS,
      categories: INITIAL_CATEGORIES,
      products: [],
      variants: [],
      stockMoves: [],
      customers: [],
      invoices: [],
      payments: [],
      suppliers: [],
      expenses: [],
      settings: INITIAL_SETTINGS
    };
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch (e) {
      console.error('Local storage write error', e);
    }
  }

  // --- Firebase Background Sync ---
  private async syncToFirestore(collectionName: string, id: string, data: any) {
    try {
      if (!db || !this.db.settings.firebase_sync_enabled) return;
      await setDoc(doc(db, collectionName, id), data, { merge: true });
    } catch (e) {
      console.warn(`Firestore sync note for ${collectionName}/${id}:`, e);
    }
  }

  private async deleteFromFirestore(collectionName: string, id: string) {
    try {
      if (!db || !this.db.settings.firebase_sync_enabled) return;
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.warn(`Firestore delete note for ${collectionName}/${id}:`, e);
    }
  }

  public async syncFromFirebase() {
    try {
      if (!db) return;
      // Sync products
      const pSnap = await getDocs(collection(db, 'products'));
      if (!pSnap.empty) {
        const firestoreProducts: Product[] = [];
        pSnap.forEach(d => firestoreProducts.push(d.data() as Product));
        if (firestoreProducts.length > 0) {
          this.db.products = firestoreProducts;
        }
      }

      // Sync variants
      const vSnap = await getDocs(collection(db, 'variants'));
      if (!vSnap.empty) {
        const firestoreVariants: ProductVariant[] = [];
        vSnap.forEach(d => firestoreVariants.push(d.data() as ProductVariant));
        if (firestoreVariants.length > 0) {
          this.db.variants = firestoreVariants;
        }
      }

      // Sync customers
      const cSnap = await getDocs(collection(db, 'customers'));
      if (!cSnap.empty) {
        const firestoreCustomers: Customer[] = [];
        cSnap.forEach(d => firestoreCustomers.push(d.data() as Customer));
        if (firestoreCustomers.length > 0) {
          this.db.customers = firestoreCustomers;
        }
      }

      // Sync invoices
      const iSnap = await getDocs(collection(db, 'invoices'));
      if (!iSnap.empty) {
        const firestoreInvoices: Invoice[] = [];
        iSnap.forEach(d => firestoreInvoices.push(d.data() as Invoice));
        if (firestoreInvoices.length > 0) {
          this.db.invoices = firestoreInvoices;
        }
      }

      this.persist();
    } catch (e) {
      console.warn('Firebase pull note (using offline local database):', e);
    }
  }

  // --- Auth & Users ---
  public getCurrentUser(): User {
    return this.currentUser;
  }

  public setCurrentUser(user: User) {
    this.currentUser = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }

  public loginWithPhonePin(phone: string, pin: string): User | null {
    const cleanPhone = phone.replace(/[\s-]/g, '');
    const user = this.db.users.find(u => {
      const uPhone = u.phone.replace(/[\s-]/g, '');
      return uPhone === cleanPhone && u.pin_hash === pin;
    });

    if (user) {
      this.setCurrentUser(user);
      return user;
    }
    return null;
  }

  // --- Products & Variants ---
  public getCategories(): Category[] {
    return this.db.categories;
  }

  public getProducts(): Product[] {
    return this.db.products.filter(p => p.is_active !== false);
  }

  public getVariants(): ProductVariant[] {
    return this.db.variants;
  }

  public getVariantById(id: string): ProductVariant | undefined {
    return this.db.variants.find(v => v.id === id);
  }

  public getProductById(id: string): Product | undefined {
    return this.db.products.find(p => p.id === id);
  }

  // Fast Product Creator with MINIMAL/NO FORCED FIELDS
  public addProduct(productData: {
    name_en: string;
    name_ur?: string;
    category_id?: string;
    brand?: string;
    purchase_unit?: string;
    units_per_purchase?: number;
    sell_unit?: string;
    min_stock?: number;
    initial_retail_price?: number;
    initial_cost?: number;
    initial_stock?: number;
    color?: string;
    compatible_models?: string[];
  }): { product: Product; variant?: ProductVariant } {
    const newProduct: Product = {
      id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name_en: productData.name_en.trim(),
      name_ur: productData.name_ur?.trim() || productData.name_en.trim(),
      category_id: productData.category_id || 'cat-6',
      brand: productData.brand?.trim() || 'General',
      purchase_unit: productData.purchase_unit || 'Box',
      units_per_purchase: productData.units_per_purchase || 1,
      sell_unit: productData.sell_unit || 'Piece',
      min_stock: productData.min_stock !== undefined ? productData.min_stock : 5,
      track_serial: false,
      is_active: true,
      created_at: new Date().toISOString()
    };

    this.db.products.unshift(newProduct);
    this.syncToFirestore('products', newProduct.id, newProduct);

    let createdVariant: ProductVariant | undefined;

    // Automatically create a default variant if price provided
    if (productData.initial_retail_price !== undefined) {
      const sku = `ACC-${Date.now().toString().slice(-4)}`;
      const barcode = `89${Date.now().toString().slice(-6)}`;
      
      createdVariant = {
        id: `var-${newProduct.id}-1`,
        product_id: newProduct.id,
        color: productData.color || 'Standard',
        compatible_models: productData.compatible_models || ['Universal'],
        sku,
        barcode,
        cost: productData.initial_cost || 0,
        retail_price: productData.initial_retail_price,
        wholesale_price: productData.initial_retail_price,
        stock: productData.initial_stock || 0
      };

      this.db.variants.unshift(createdVariant);
      this.syncToFirestore('variants', createdVariant.id, createdVariant);

      if ((productData.initial_stock || 0) > 0) {
        this.createStockMove({
          variant_id: createdVariant.id,
          qty: productData.initial_stock || 0,
          type: 'purchase_received',
          ref_type: 'manual',
          ref_id: 'INITIAL',
          note: 'Initial opening stock'
        });
      }
    }

    this.persist();
    return { product: newProduct, variant: createdVariant };
  }

  public addVariant(variantData: Omit<ProductVariant, 'id' | 'stock'>, initialStock: number = 0): ProductVariant {
    const newVariant: ProductVariant = {
      ...variantData,
      id: `var-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      stock: 0
    };
    this.db.variants.unshift(newVariant);

    if (initialStock > 0) {
      this.createStockMove({
        variant_id: newVariant.id,
        qty: initialStock,
        type: 'purchase_received',
        ref_type: 'manual',
        ref_id: 'INITIAL',
        note: 'Initial inventory stock'
      });
    }

    this.syncToFirestore('variants', newVariant.id, newVariant);
    this.persist();
    return newVariant;
  }

  // Bulk Variant Generator with custom models list
  public bulkGenerateVariants(
    productId: string,
    phoneModels: string[],
    colors: string[],
    baseCost: number,
    baseRetail: number,
    baseWholesale: number,
    initialStockPerVariant: number = 0
  ): number {
    let createdCount = 0;
    const product = this.getProductById(productId);
    const prefix = product?.name_en.substring(0, 3).toUpperCase() || 'ACC';

    for (const model of phoneModels) {
      for (const color of colors) {
        const cleanModel = model.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
        const cleanColor = color.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const sku = `${prefix}-${cleanModel}-${cleanColor}-${randomNum}`;
        const barcode = `89${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

        this.addVariant({
          product_id: productId,
          color,
          compatible_models: [model],
          sku,
          barcode,
          cost: baseCost,
          retail_price: baseRetail,
          wholesale_price: baseWholesale
        }, initialStockPerVariant);

        createdCount++;
      }
    }
    return createdCount;
  }

  // DELETE Everywhere: Product & Variants
  public deleteProduct(productId: string) {
    this.db.products = this.db.products.filter(p => p.id !== productId);
    const deletedVariants = this.db.variants.filter(v => v.product_id === productId);
    this.db.variants = this.db.variants.filter(v => v.product_id !== productId);

    this.deleteFromFirestore('products', productId);
    deletedVariants.forEach(v => this.deleteFromFirestore('variants', v.id));

    this.persist();
  }

  public deleteVariant(variantId: string) {
    this.db.variants = this.db.variants.filter(v => v.id !== variantId);
    this.deleteFromFirestore('variants', variantId);
    this.persist();
  }

  // --- Stock Movements ---
  public getStockMoves(): StockMove[] {
    return [...this.db.stockMoves].reverse();
  }

  public createStockMove(params: {
    variant_id: string;
    qty: number;
    type: StockMove['type'];
    ref_type?: StockMove['ref_type'];
    ref_id?: string;
    note?: string;
  }): StockMove {
    const variant = this.db.variants.find(v => v.id === params.variant_id);
    if (!variant) throw new Error('Variant not found');

    const move: StockMove = {
      id: `move-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      variant_id: params.variant_id,
      qty: params.qty,
      type: params.type,
      ref_type: params.ref_type || 'manual',
      ref_id: params.ref_id,
      user_id: this.currentUser.id,
      user_name: this.currentUser.name,
      note: params.note || '',
      created_at: new Date().toISOString()
    };

    variant.stock += params.qty;
    this.db.stockMoves.push(move);
    
    this.syncToFirestore('stockMoves', move.id, move);
    this.syncToFirestore('variants', variant.id, variant);
    this.persist();
    return move;
  }

  public deleteStockMove(moveId: string) {
    this.db.stockMoves = this.db.stockMoves.filter(m => m.id !== moveId);
    this.deleteFromFirestore('stockMoves', moveId);
    this.persist();
  }

  // Reconcile
  public reconcileStockCount(variantId: string, actualPhysicalCount: number, reason: string): StockMove | null {
    const variant = this.db.variants.find(v => v.id === variantId);
    if (!variant) return null;

    const difference = actualPhysicalCount - variant.stock;
    if (difference === 0) return null;

    return this.createStockMove({
      variant_id: variantId,
      qty: difference,
      type: 'stock_count',
      ref_type: 'audit',
      ref_id: `AUDIT-${new Date().toISOString().slice(0, 10)}`,
      note: `Stock count reconciliation (${variant.stock} -> ${actualPhysicalCount}): ${reason}`
    });
  }

  // --- Customers & Udhaar ---
  public getCustomers(): Customer[] {
    return this.db.customers;
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.db.customers.find(c => c.id === id);
  }

  // Add Customer with ONLY NAME REQUIRED
  public addCustomer(data: {
    name: string;
    phone?: string;
    cnic?: string;
    address?: string;
    type?: 'retail' | 'wholesale';
  }): Customer {
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: data.name.trim(),
      phone: data.phone?.trim() || '',
      cnic: data.cnic?.trim() || '',
      address: data.address?.trim() || '',
      type: data.type || 'retail',
      balance: 0,
      created_at: new Date().toISOString()
    };
    this.db.customers.unshift(newCust);
    this.syncToFirestore('customers', newCust.id, newCust);
    this.persist();
    return newCust;
  }

  // DELETE Everywhere: Customer
  public deleteCustomer(customerId: string) {
    this.db.customers = this.db.customers.filter(c => c.id !== customerId);
    this.deleteFromFirestore('customers', customerId);
    this.persist();
  }

  public recordCustomerPayment(customerId: string, amount: number, method: Payment['method'], note?: string): Payment {
    const customer = this.getCustomerById(customerId);
    if (!customer) throw new Error('Customer not found');

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      customer_id: customerId,
      amount,
      method,
      date: new Date().toISOString(),
      note: note || 'Udhaar recovery',
      user_id: this.currentUser.id
    };

    customer.balance = Math.max(0, customer.balance - amount);
    this.db.payments.push(payment);
    this.syncToFirestore('customers', customer.id, customer);
    this.persist();
    return payment;
  }

  // --- Invoices & POS Sales ---
  public getInvoices(): Invoice[] {
    return [...this.db.invoices].reverse();
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.db.invoices.find(i => i.id === id);
  }

  public createInvoice(payload: {
    customer_id?: string | null;
    customer_name?: string;
    customer_phone?: string;
    type: 'retail' | 'wholesale';
    items: Array<{
      variant_id: string;
      qty: number;
      unit_price: number;
      discount?: number;
      custom_name?: string;
      is_custom?: boolean;
    }>;
    overall_discount?: number;
    tax?: number;
    paid: number;
    payment_method: Invoice['payment_method'];
    note?: string;
  }): Invoice {
    const subtotal = payload.items.reduce((sum, item) => sum + (item.qty * item.unit_price) - (item.discount || 0), 0);
    const overallDiscount = payload.overall_discount || 0;
    const tax = payload.tax || 0;
    const total = Math.max(0, subtotal - overallDiscount + tax);
    const paid = Math.min(total, Math.max(0, payload.paid));
    const balance = total - paid;

    const nextInvoiceNum = `${this.db.settings.invoice_prefix}-${String(this.db.invoices.length + 1).padStart(4, '0')}`;
    const invoiceId = `inv-${Date.now()}`;

    const invoiceItems: InvoiceItem[] = payload.items.map((item, idx) => {
      const variant = this.getVariantById(item.variant_id);
      const product = variant ? this.getProductById(variant.product_id) : undefined;
      const itemDiscount = item.discount || 0;
      const itemTotal = (item.qty * item.unit_price) - itemDiscount;

      return {
        id: `item-${invoiceId}-${idx + 1}`,
        invoice_id: invoiceId,
        variant_id: item.variant_id,
        product_name_en: item.custom_name || product?.name_en || 'Accessory',
        product_name_ur: item.custom_name || product?.name_ur || 'سامان',
        variant_title: variant ? `${variant.compatible_models?.[0] || ''} (${variant.color || ''})` : 'Custom Item',
        sku: variant?.sku || 'CUSTOM',
        barcode: variant?.barcode,
        compatible_models: variant?.compatible_models || [],
        qty: item.qty,
        unit_price: item.unit_price,
        cost_at_sale: variant?.cost || 0,
        discount: itemDiscount,
        total: itemTotal,
        is_custom: item.is_custom || false
      };
    });

    const newInvoice: Invoice = {
      id: invoiceId,
      number: nextInvoiceNum,
      customer_id: payload.customer_id || null,
      customer_name: payload.customer_name || 'Walk-in Customer',
      customer_phone: payload.customer_phone || '',
      date: new Date().toISOString(),
      subtotal,
      discount: overallDiscount,
      tax,
      total,
      paid,
      balance,
      type: payload.type,
      status: 'completed',
      payment_method: payload.payment_method,
      user_id: this.currentUser.id,
      user_name: this.currentUser.name,
      note: payload.note || '',
      items: invoiceItems
    };

    this.db.invoices.unshift(newInvoice);

    // Apply stock movements for non-custom variants
    invoiceItems.forEach(item => {
      if (item.variant_id && !item.is_custom) {
        try {
          this.createStockMove({
            variant_id: item.variant_id,
            qty: -item.qty,
            type: 'sale',
            ref_type: 'invoice',
            ref_id: newInvoice.number,
            note: `POS sale to ${newInvoice.customer_name}`
          });
        } catch {
          // ignore if custom variant
        }
      }
    });

    // Update customer Udhaar balance if credit remaining
    if (balance > 0 && payload.customer_id) {
      const cust = this.getCustomerById(payload.customer_id);
      if (cust) {
        cust.balance += balance;
        this.syncToFirestore('customers', cust.id, cust);
      }
    }

    this.syncToFirestore('invoices', newInvoice.id, newInvoice);
    this.persist();
    return newInvoice;
  }

  // DELETE Everywhere: Delete Invoice completely
  public deleteInvoice(invoiceId: string) {
    this.db.invoices = this.db.invoices.filter(i => i.id !== invoiceId);
    this.deleteFromFirestore('invoices', invoiceId);
    this.persist();
  }

  public cancelInvoice(invoiceId: string, reason: string): Invoice {
    const inv = this.getInvoiceById(invoiceId);
    if (!inv) throw new Error('Invoice not found');
    if (inv.status === 'cancelled') throw new Error('Invoice is already cancelled');

    inv.status = 'cancelled';
    inv.cancelled_reason = reason;
    inv.cancelled_at = new Date().toISOString();

    // Revert stock
    inv.items.forEach(item => {
      if (item.variant_id && !item.is_custom) {
        try {
          this.createStockMove({
            variant_id: item.variant_id,
            qty: item.qty,
            type: 'customer_return',
            ref_type: 'invoice',
            ref_id: inv.number,
            note: `Cancelled invoice: ${reason}`
          });
        } catch {
          // skip
        }
      }
    });

    if (inv.balance > 0 && inv.customer_id) {
      const cust = this.getCustomerById(inv.customer_id);
      if (cust) {
        cust.balance = Math.max(0, cust.balance - inv.balance);
        this.syncToFirestore('customers', cust.id, cust);
      }
    }

    this.syncToFirestore('invoices', inv.id, inv);
    this.persist();
    return inv;
  }

  // --- Settings & Clear All ---
  public getSettings(): ShopSettings {
    return this.db.settings;
  }

  public updateSettings(updates: Partial<ShopSettings>) {
    this.db.settings = { ...this.db.settings, ...updates };
    this.syncToFirestore('settings', 'config', this.db.settings);
    this.persist();
  }

  // Clear ALL data completely
  public clearAllData() {
    this.db.products = [];
    this.db.variants = [];
    this.db.customers = [];
    this.db.invoices = [];
    this.db.stockMoves = [];
    this.db.payments = [];
    this.persist();
  }

  public exportDatabaseJSON(): string {
    return JSON.stringify(this.db, null, 2);
  }

  public exportInvoicesCSV(): string {
    const headers = ['Invoice Number', 'Date', 'Customer', 'Phone', 'Type', 'Total', 'Paid', 'Udhaar Balance', 'Payment Method', 'Status'];
    const rows = this.db.invoices.map(i => [
      i.number,
      new Date(i.date).toLocaleString(),
      `"${(i.customer_name || '').replace(/"/g, '""')}"`,
      i.customer_phone || '',
      i.type,
      i.total,
      i.paid,
      i.balance,
      i.payment_method,
      i.status
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const storage = new StorageService();

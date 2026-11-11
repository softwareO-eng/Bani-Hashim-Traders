import { 
  User, Category, Product, ProductVariant, StockMove, Customer, 
  Invoice, InvoiceItem, Payment, PaymentMethod, Supplier, Expense, ShopSettings 
} from '../types';
import { db } from './firebase';
import { 
  collection, doc, setDoc, deleteDoc, getDocs, onSnapshot 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const STORAGE_KEY = 'pakmobile_pos_db_clean_v2';
const CURRENT_USER_KEY = 'pakmobile_active_user_v2';

const memoryFallback: Record<string, string> = {};

export function safeStorageGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn('localStorage read notice (using safe memory store):', e);
  }
  return memoryFallback[key] ?? null;
}

export function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch (e) {
    console.warn('localStorage write notice (using safe memory store):', e);
  }
  memoryFallback[key] = value;
}

export function safeStorageRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch (e) {
    console.warn('localStorage remove notice:', e);
  }
  delete memoryFallback[key];
}

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
    const saved = safeStorageGet(STORAGE_KEY);
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

    const savedUser = safeStorageGet(CURRENT_USER_KEY);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch {
        this.currentUser = INITIAL_USERS[0];
      }
    } else {
      this.currentUser = INITIAL_USERS[0];
      safeStorageSet(CURRENT_USER_KEY, JSON.stringify(this.currentUser));
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
      safeStorageSet(STORAGE_KEY, JSON.stringify(this.db));
    } catch (e) {
      console.error('Storage persist note', e);
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
      
      // Sync products - replace local array with exact snapshot from Firestore
      const pSnap = await getDocs(collection(db, 'products'));
      const firestoreProducts: Product[] = [];
      pSnap.forEach(d => firestoreProducts.push(d.data() as Product));
      this.db.products = firestoreProducts;

      // Sync variants
      const vSnap = await getDocs(collection(db, 'variants'));
      const firestoreVariants: ProductVariant[] = [];
      vSnap.forEach(d => firestoreVariants.push(d.data() as ProductVariant));
      this.db.variants = firestoreVariants;

      // Sync customers
      const cSnap = await getDocs(collection(db, 'customers'));
      const firestoreCustomers: Customer[] = [];
      cSnap.forEach(d => firestoreCustomers.push(d.data() as Customer));
      this.db.customers = firestoreCustomers;

      // Sync invoices
      const iSnap = await getDocs(collection(db, 'invoices'));
      const firestoreInvoices: Invoice[] = [];
      iSnap.forEach(d => firestoreInvoices.push(d.data() as Invoice));
      this.db.invoices = firestoreInvoices;

      // Sync payments
      const paySnap = await getDocs(collection(db, 'payments'));
      const firestorePayments: Payment[] = [];
      paySnap.forEach(d => firestorePayments.push(d.data() as Payment));
      this.db.payments = firestorePayments;

      // Sync expenses
      const expSnap = await getDocs(collection(db, 'expenses'));
      const firestoreExpenses: Expense[] = [];
      expSnap.forEach(d => firestoreExpenses.push(d.data() as Expense));
      this.db.expenses = firestoreExpenses;

      this.persist();
    } catch (e) {
      console.warn('Firebase initial pull note (using offline local database):', e);
    }
  }

  // Real-time bidirectional listener setup for instantly syncing all connected devices
  public subscribeRealtime(onDataUpdate: () => void) {
    const activeDb = db;
    if (!activeDb) return () => {};

    const collectionsToListen = [
      { name: 'products', key: 'products' as const },
      { name: 'variants', key: 'variants' as const },
      { name: 'customers', key: 'customers' as const },
      { name: 'invoices', key: 'invoices' as const },
      { name: 'payments', key: 'payments' as const },
      { name: 'expenses', key: 'expenses' as const },
      { name: 'stockMoves', key: 'stockMoves' as const }
    ];

    const unsubscribes = collectionsToListen.map(({ name, key }) => {
      return onSnapshot(collection(activeDb, name), (snapshot) => {
        const items: any[] = [];
        snapshot.forEach(d => items.push(d.data()));
        (this.db as any)[key] = items;
        this.persist();
        onDataUpdate();
      }, (err) => {
        console.warn(`Realtime listener note for ${name}:`, err);
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }

  // --- Auth & Users ---
  public getCurrentUser(): User {
    return this.currentUser;
  }

  public setCurrentUser(user: User) {
    this.currentUser = user;
    safeStorageSet(CURRENT_USER_KEY, JSON.stringify(user));
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

  public updateInvoice(invoiceId: string, updates: Partial<Invoice>): Invoice {
    const inv = this.getInvoiceById(invoiceId);
    if (!inv) throw new Error('Invoice not found');

    Object.assign(inv, updates);
    
    if (updates.items || updates.discount !== undefined || updates.paid !== undefined) {
      inv.subtotal = inv.items.reduce((sum, item) => sum + (item.qty * item.unit_price) - (item.discount || 0), 0);
      inv.total = Math.max(0, inv.subtotal - (inv.discount || 0) + (inv.tax || 0));
      inv.paid = Math.min(inv.total, Math.max(0, inv.paid));
      inv.balance = inv.total - inv.paid;
    }

    this.syncToFirestore('invoices', inv.id, inv);
    this.persist();
    return inv;
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

  // --- Payments & Ledger History ---
  public getPayments(customerId?: string): Payment[] {
    const list = customerId 
      ? this.db.payments.filter(p => p.customer_id === customerId)
      : this.db.payments;
    return [...list].reverse();
  }

  public deletePayment(paymentId: string) {
    const payment = this.db.payments.find(p => p.id === paymentId);
    if (payment && payment.customer_id) {
      const cust = this.db.customers.find(c => c.id === payment.customer_id);
      if (cust) {
        cust.balance += payment.amount;
        this.syncToFirestore('customers', cust.id, cust);
      }
    }
    this.db.payments = this.db.payments.filter(p => p.id !== paymentId);
    this.deleteFromFirestore('payments', paymentId);
    this.persist();
  }

  // --- Expenses Management ---
  public getExpenses(): Expense[] {
    if (!this.db.expenses) this.db.expenses = [];
    return [...this.db.expenses].reverse();
  }

  public addExpense(params: {
    category: Expense['category'];
    amount: number;
    method: PaymentMethod;
    note?: string;
    date?: string;
  }): Expense {
    if (!this.db.expenses) this.db.expenses = [];
    const expense: Expense = {
      id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      category: params.category,
      amount: params.amount,
      method: params.method,
      note: params.note || '',
      date: params.date || new Date().toISOString(),
      user_id: this.currentUser.id
    };
    this.db.expenses.push(expense);
    this.syncToFirestore('expenses', expense.id, expense);
    this.persist();
    return expense;
  }

  public deleteExpense(expenseId: string) {
    if (!this.db.expenses) this.db.expenses = [];
    this.db.expenses = this.db.expenses.filter(e => e.id !== expenseId);
    this.deleteFromFirestore('expenses', expenseId);
    this.persist();
  }

  // --- Customer Folder & Complete Khata Dossier ---
  public getCustomerFolder(customerId: string) {
    const customer = this.db.customers.find(c => c.id === customerId);
    if (!customer) return null;

    const invoices = this.db.invoices.filter(i => i.customer_id === customerId);
    const payments = this.db.payments.filter(p => p.customer_id === customerId);

    // Build unified chronological ledger (running balance stream)
    type LedgerEntry = {
      id: string;
      date: string;
      type: 'invoice' | 'payment';
      ref: string;
      title: string;
      debit: number;   // New charge / Bill amount
      credit: number;  // Payment received
      balance: number; // Running balance after this transaction
      note?: string;
      method?: string;
      itemCount?: number;
    };

    const combined: Array<{ date: string; type: 'invoice' | 'payment'; data: Invoice | Payment }> = [
      ...invoices.map(i => ({ date: i.date, type: 'invoice' as const, data: i })),
      ...payments.map(p => ({ date: p.date, type: 'payment' as const, data: p }))
    ];

    // Sort ascending for chronological running balance calculation
    combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    const ledger: LedgerEntry[] = [];

    combined.forEach(entry => {
      if (entry.type === 'invoice') {
        const inv = entry.data as Invoice;
        if (inv.status !== 'cancelled') {
          // Debit is total bill, Credit is amount paid immediately
          running += inv.balance;
          ledger.push({
            id: inv.id,
            date: inv.date,
            type: 'invoice',
            ref: inv.number,
            title: `Sale Bill (${inv.items.length} items)`,
            debit: inv.total,
            credit: inv.paid,
            balance: running,
            note: inv.note,
            method: inv.payment_method,
            itemCount: inv.items.reduce((s, it) => s + it.qty, 0)
          });
        }
      } else {
        const pay = entry.data as Payment;
        running = Math.max(0, running - pay.amount);
        ledger.push({
          id: pay.id,
          date: pay.date,
          type: 'payment',
          ref: `REC-${pay.id.slice(-6)}`,
          title: `Udhaar Recovery (${pay.method.toUpperCase()})`,
          debit: 0,
          credit: pay.amount,
          balance: running,
          note: pay.note,
          method: pay.method
        });
      }
    });

    // Aggregated items bought by this customer
    const itemsMap = new Map<string, { name: string; qty: number; spent: number; lastDate: string }>();
    invoices.forEach(inv => {
      if (inv.status === 'cancelled') return;
      inv.items.forEach(it => {
        const key = it.variant_id || it.product_name_en;
        const existing = itemsMap.get(key) || { 
          name: it.product_name_en + (it.variant_title ? ` (${it.variant_title})` : ''), 
          qty: 0, 
          spent: 0, 
          lastDate: inv.date 
        };
        existing.qty += it.qty;
        existing.spent += it.total;
        if (new Date(inv.date) > new Date(existing.lastDate)) {
          existing.lastDate = inv.date;
        }
        itemsMap.set(key, existing);
      });
    });

    const totalPurchased = invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.total, 0);
    const totalPaid = invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.paid, 0) + 
                      payments.reduce((s, p) => s + p.amount, 0);

    return {
      customer,
      invoices: [...invoices].reverse(),
      payments: [...payments].reverse(),
      ledger: [...ledger].reverse(), // latest first for presentation
      purchasedItems: Array.from(itemsMap.values()).sort((a, b) => b.qty - a.qty),
      totalPurchased,
      totalPaid,
      currentBalance: customer.balance
    };
  }

  // --- Complete Profit & Loss Financial Engine ---
  public getProfitLoss(timeframe: 'today' | 'week' | 'month' | 'year' | 'all') {
    const now = new Date();
    let startDate: Date;

    if (timeframe === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeframe === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'month') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(2000, 0, 1);
    }

    // Filter completed invoices in timeframe
    const periodInvoices = this.db.invoices.filter(i => {
      if (i.status === 'cancelled') return false;
      const d = new Date(i.date);
      return d >= startDate;
    });

    // 1. Calculate Revenue, Cost of Goods Sold (COGS), and Gross Profit on EVERY sold item
    let totalSales = 0;
    let totalCogs = 0;
    let totalItemDiscounts = 0;
    let totalInvoiceDiscounts = 0;
    let totalCashCollected = 0;
    let totalUdhaarGiven = 0;

    const productProfitMap = new Map<string, {
      id: string;
      name_en: string;
      name_ur?: string;
      sku: string;
      qty: number;
      revenue: number;
      cost: number;
      profit: number;
      margin: number;
    }>();

    periodInvoices.forEach(inv => {
      totalSales += inv.total;
      totalInvoiceDiscounts += (inv.discount || 0);
      totalCashCollected += (inv.paid || 0);
      totalUdhaarGiven += (inv.balance || 0);

      inv.items.forEach(it => {
        const itemRevenue = it.total;
        const itemCost = it.qty * (it.cost_at_sale || 0);
        const itemProfit = itemRevenue - itemCost;
        
        totalCogs += itemCost;
        totalItemDiscounts += (it.discount || 0);

        const key = it.variant_id || it.sku || it.product_name_en;
        const existing = productProfitMap.get(key) || {
          id: key,
          name_en: it.product_name_en + (it.variant_title ? ` - ${it.variant_title}` : ''),
          name_ur: it.product_name_ur,
          sku: it.sku || 'N/A',
          qty: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0
        };

        existing.qty += it.qty;
        existing.revenue += itemRevenue;
        existing.cost += itemCost;
        existing.profit += itemProfit;
        existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
        productProfitMap.set(key, existing);
      });
    });

    // Gross profit is Sales minus direct cost of goods sold
    const grossProfit = totalSales - totalCogs;
    const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    // 2. Total Purchases (Stock inventory received from suppliers in period)
    const periodStockMoves = this.db.stockMoves.filter(m => {
      const d = new Date(m.created_at);
      return d >= startDate && m.type === 'purchase_received';
    });

    let totalPurchases = 0;
    periodStockMoves.forEach(m => {
      const variant = this.db.variants.find(v => v.id === m.variant_id);
      totalPurchases += m.qty * (variant?.cost || 0);
    });

    // 3. Operating Expenses in period
    if (!this.db.expenses) this.db.expenses = [];
    const periodExpenses = this.db.expenses.filter(e => {
      const d = new Date(e.date);
      return d >= startDate;
    });

    const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);

    // 4. Net Profit = Gross Profit - Operating Expenses
    const netProfit = grossProfit - totalExpenses;
    const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    // 5. Add Udhaar recoveries collected in this period
    const periodPayments = this.db.payments.filter(p => {
      const d = new Date(p.date);
      return d >= startDate;
    });
    const udhaarRecovered = periodPayments.reduce((s, p) => s + p.amount, 0);
    const totalCashFlow = totalCashCollected + udhaarRecovered;

    // 6. Time Breakdown
    // Build daily rows for week/month, or monthly rows for year
    const breakdownMap = new Map<string, {
      label: string;
      dateKey: string;
      invoicesCount: number;
      sales: number;
      cogs: number;
      grossProfit: number;
      expenses: number;
      netProfit: number;
      margin: number;
    }>();

    periodInvoices.forEach(inv => {
      const dateKey = inv.date.slice(0, 10);
      const cur = breakdownMap.get(dateKey) || {
        label: dateKey,
        dateKey,
        invoicesCount: 0,
        sales: 0,
        cogs: 0,
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
        margin: 0
      };

      cur.invoicesCount += 1;
      cur.sales += inv.total;
      const invCogs = inv.items.reduce((s, it) => s + (it.qty * (it.cost_at_sale || 0)), 0);
      cur.cogs += invCogs;
      cur.grossProfit = cur.sales - cur.cogs;
      breakdownMap.set(dateKey, cur);
    });

    periodExpenses.forEach(exp => {
      const dateKey = exp.date.slice(0, 10);
      const cur = breakdownMap.get(dateKey) || {
        label: dateKey,
        dateKey,
        invoicesCount: 0,
        sales: 0,
        cogs: 0,
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
        margin: 0
      };
      cur.expenses += exp.amount;
      breakdownMap.set(dateKey, cur);
    });

    const breakdownRows = Array.from(breakdownMap.values()).map(r => {
      r.netProfit = r.grossProfit - r.expenses;
      r.margin = r.sales > 0 ? (r.netProfit / r.sales) * 100 : 0;
      return r;
    }).sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    return {
      timeframe,
      invoiceCount: periodInvoices.length,
      totalSales,
      totalPurchases,
      totalCogs,
      grossProfit,
      grossMargin,
      totalExpenses,
      netProfit,
      netMargin,
      totalCashCollected,
      udhaarRecovered,
      totalCashFlow,
      totalUdhaarGiven,
      productProfits: Array.from(productProfitMap.values()).sort((a, b) => b.profit - a.profit),
      breakdownRows,
      expensesList: [...periodExpenses].reverse()
    };
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

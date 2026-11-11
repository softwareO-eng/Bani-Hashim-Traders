/**
 * PakMobile POS - Core Type Definitions
 * Enhanced with Custom Items, Optional Fields, Delete Everywhere, and Firebase
 */

export type UserRole = 'owner' | 'cashier' | 'stock_keeper';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  pin_hash: string;
  language_pref: 'en' | 'ur';
}

export interface Category {
  id: string;
  name_en: string;
  name_ur: string;
  icon?: string;
}

export interface Product {
  id: string;
  name_en: string;
  name_ur?: string;
  category_id?: string;
  brand?: string;
  purchase_unit?: string;
  units_per_purchase?: number;
  sell_unit?: string;
  min_stock?: number;
  track_serial?: boolean;
  is_active?: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  color?: string;
  compatible_models?: string[];
  sku: string;
  barcode?: string;
  cost?: number;
  retail_price: number;
  wholesale_price?: number;
  stock: number;
}

export type StockMoveType = 
  | 'purchase_received' 
  | 'sale' 
  | 'customer_return' 
  | 'supplier_return' 
  | 'damage_loss' 
  | 'manual_adjust' 
  | 'stock_count';

export interface StockMove {
  id: string;
  variant_id: string;
  qty: number;
  type: StockMoveType;
  ref_type?: 'invoice' | 'purchase' | 'manual' | 'audit' | 'custom';
  ref_id?: string;
  user_id: string;
  user_name: string;
  note?: string;
  created_at: string;
}

export type CustomerType = 'retail' | 'wholesale';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  cnic?: string;
  address?: string;
  type: CustomerType;
  balance: number;
  created_at: string;
}

export type PaymentMethod = 'cash' | 'easypaisa' | 'jazzcash' | 'bank';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  variant_id: string;
  product_name_en: string;
  product_name_ur?: string;
  variant_title?: string;
  sku: string;
  barcode?: string;
  compatible_models?: string[];
  qty: number;
  unit_price: number;
  cost_at_sale: number;
  discount: number;
  total: number;
  is_custom?: boolean;
}

export type InvoiceStatus = 'completed' | 'cancelled';

export interface Invoice {
  id: string;
  number: string;
  customer_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  type: CustomerType;
  status: InvoiceStatus;
  payment_method: PaymentMethod;
  user_id: string;
  user_name: string;
  note?: string;
  cancelled_reason?: string;
  cancelled_at?: string;
  items: InvoiceItem[];
}

export interface Payment {
  id: string;
  invoice_id?: string | null;
  customer_id?: string | null;
  supplier_id?: string | null;
  amount: number;
  method: PaymentMethod;
  date: string;
  note?: string;
  user_id: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  balance: number;
}

export interface Expense {
  id: string;
  category: 'rent' | 'electricity' | 'salaries' | 'transport' | 'tea_misc' | 'packaging' | 'marketing';
  amount: number;
  method: PaymentMethod;
  date: string;
  note?: string;
  user_id: string;
}

export interface ShopSettings {
  shop_name_en: string;
  shop_name_ur: string;
  shop_address_en: string;
  shop_address_ur: string;
  shop_phone: string;
  shop_whatsapp: string;
  invoice_prefix: string;
  tax_rate: number;
  currency_symbol: string;
  receipt_footer_en: string;
  receipt_footer_ur: string;
  printer_type: '58mm' | '80mm' | 'a5';
  firebase_project_id?: string;
  firebase_database_id?: string;
  firebase_sync_enabled?: boolean;
}

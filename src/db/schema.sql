-- ============================================================================
-- PakMobile POS - Supabase Free Tier Production Database Schema
-- Mobile Accessories Shop Management System (Pakistan)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & ROLES
CREATE TYPE user_role AS ENUM ('owner', 'cashier', 'stock_keeper');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'cashier',
    pin_hash TEXT NOT NULL,
    language_pref VARCHAR(5) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CATEGORIES
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en TEXT NOT NULL,
    name_ur TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en TEXT NOT NULL,
    name_ur TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand TEXT NOT NULL DEFAULT 'Generic',
    purchase_unit TEXT NOT NULL DEFAULT 'Box of 20',
    units_per_purchase INTEGER NOT NULL DEFAULT 20,
    sell_unit TEXT NOT NULL DEFAULT 'Piece',
    min_stock INTEGER NOT NULL DEFAULT 5,
    track_serial BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. VARIANTS (Color x Phone Compatibility x SKU)
CREATE TABLE variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color TEXT NOT NULL DEFAULT 'Clear',
    compatible_models TEXT[] NOT NULL DEFAULT '{}',
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT UNIQUE,
    cost NUMERIC(12, 0) NOT NULL DEFAULT 0, -- Stored as integer PKR
    retail_price NUMERIC(12, 0) NOT NULL DEFAULT 0,
    wholesale_price NUMERIC(12, 0) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STOCK MOVEMENTS (RULE 1: Stock quantity NEVER edited directly - only via movements)
CREATE TYPE stock_move_type AS ENUM (
    'purchase_received',
    'sale',
    'customer_return',
    'supplier_return',
    'damage_loss',
    'manual_adjust',
    'stock_count'
);

CREATE TABLE stock_moves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL, -- positive for in, negative for out
    type stock_move_type NOT NULL,
    ref_type VARCHAR(50),
    ref_id TEXT,
    user_id UUID REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGER: Auto-update variant stock from stock_moves
CREATE OR REPLACE FUNCTION apply_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE variants
    SET stock = stock + NEW.qty
    WHERE id = NEW.variant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_stock_movement
AFTER INSERT ON stock_moves
FOR EACH ROW
EXECUTE FUNCTION apply_stock_movement();

-- 6. CUSTOMERS (with Udhaar tracking)
CREATE TYPE customer_type AS ENUM ('retail', 'wholesale');

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    cnic VARCHAR(20),
    address TEXT,
    type customer_type DEFAULT 'retail',
    balance NUMERIC(12, 0) DEFAULT 0, -- Udhaar balance
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INVOICES (RULE 2: Invoices NEVER deleted - only cancelled with reason)
CREATE TYPE invoice_status AS ENUM ('completed', 'cancelled');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name TEXT,
    customer_phone TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    subtotal NUMERIC(12, 0) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    tax NUMERIC(12, 0) NOT NULL DEFAULT 0,
    total NUMERIC(12, 0) NOT NULL DEFAULT 0,
    paid NUMERIC(12, 0) NOT NULL DEFAULT 0,
    balance NUMERIC(12, 0) NOT NULL DEFAULT 0,
    type customer_type DEFAULT 'retail',
    status invoice_status DEFAULT 'completed',
    payment_method VARCHAR(30) DEFAULT 'cash',
    user_id UUID REFERENCES users(id),
    user_name TEXT,
    note TEXT,
    cancelled_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RULE 2 ENFORCEMENT: Prevent DELETE on invoices
CREATE OR REPLACE FUNCTION prevent_invoice_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Invoices cannot be deleted. You must cancel the invoice with a documented reason.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_invoice_delete
BEFORE DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION prevent_invoice_delete();

-- 8. INVOICE ITEMS (RULE 3: cost_at_sale stored forever at time of sale)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price NUMERIC(12, 0) NOT NULL,
    cost_at_sale NUMERIC(12, 0) NOT NULL, -- CRITICAL: Frozen forever
    discount NUMERIC(12, 0) NOT NULL DEFAULT 0,
    total NUMERIC(12, 0) NOT NULL
);

-- 9. PAYMENTS (Udhaar recoveries & Supplier payments)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id),
    customer_id UUID REFERENCES customers(id),
    supplier_id UUID,
    amount NUMERIC(12, 0) NOT NULL CHECK (amount > 0),
    method VARCHAR(30) NOT NULL DEFAULT 'cash',
    date TIMESTAMPTZ DEFAULT NOW(),
    note TEXT,
    user_id UUID REFERENCES users(id)
);

-- 10. SUPPLIERS
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    balance NUMERIC(12, 0) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. EXPENSES
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 0) NOT NULL,
    method VARCHAR(30) DEFAULT 'cash',
    date TIMESTAMPTZ DEFAULT NOW(),
    note TEXT,
    user_id UUID REFERENCES users(id)
);

-- 12. SHOP SETTINGS
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - RULE 4: Cashier cannot see cost_at_sale or profit
-- ============================================================================
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;

-- Owner has full access to all fields
-- Cashiers access a restricted view without cost columns
CREATE OR REPLACE VIEW cashier_variants AS
SELECT id, product_id, color, compatible_models, sku, barcode, retail_price, wholesale_price, stock
FROM variants;

CREATE OR REPLACE VIEW cashier_invoice_items AS
SELECT id, invoice_id, variant_id, qty, unit_price, discount, total
FROM invoice_items;

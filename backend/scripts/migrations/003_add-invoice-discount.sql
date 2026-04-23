-- Add discount percentage to invoices (applied before tax; total = (subtotal - discount) + tax)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0;

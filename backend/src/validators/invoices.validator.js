import { z } from 'zod';

const lineItemSchema = z.object({
  description: z.string().min(1),
  price: z.number({ coerce: true }).min(0),
  quantity: z.number({ coerce: true }).min(1).default(1),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().optional().nullable(),
  clientName: z.string().max(255).optional().default(''),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().max(50).optional().default(''),
  items: z.array(lineItemSchema).min(1, 'At least one item is required'),
  subtotal: z.number({ coerce: true }).min(0).optional(),
  discountPercentage: z.number({ coerce: true }).min(0).max(100).optional().default(0),
  taxRate: z.number({ coerce: true }).min(0).optional(),
  total: z.number({ coerce: true }).min(0).optional(),
  paymentMethod: z.enum(['cash', 'bank', 'card', 'online']).optional().default('bank'),
  dueDate: z.string().nullable().optional(),
  notes: z.string().optional().default(''),
  showSignatureArea: z.boolean({ coerce: true }).optional().default(false),
  bankDetails: z.record(z.string()).optional().nullable(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(['paid', 'unpaid', 'overdue']),
});

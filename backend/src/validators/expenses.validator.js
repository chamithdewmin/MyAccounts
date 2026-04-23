import { z } from 'zod';

export const createExpenseSchema = z.object({
  category: z.string().max(255).optional().default('Other'),
  amount: z.number({ coerce: true }).min(0),
  currency: z.string().max(10).optional().default('LKR'),
  date: z.string().optional(),
  notes: z.string().optional().default(''),
  paymentMethod: z.enum(['cash', 'bank', 'card', 'online']).optional().default('cash'),
  isRecurring: z.boolean({ coerce: true }).optional().default(false),
  recurringFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().default('monthly'),
  recurringEndDate: z.string().nullable().optional(),
  recurringNotes: z.string().optional().default(''),
  receipt: z.any().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

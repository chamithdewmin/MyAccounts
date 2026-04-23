import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().default(''),
  address: z.string().max(500).optional().default(''),
  projects: z.array(z.any()).optional().default([]),
});

export const updateClientSchema = createClientSchema.partial();

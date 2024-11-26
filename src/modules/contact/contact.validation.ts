import { ZodType, z } from 'zod';

export class ContactValidation {
  static readonly CREATE: ZodType = z.object({
    phone: z.string()
    .regex(/^\+?[0-9\s\-()]+$/, { message: 'Invalid phone number format' })
    .min(10, { message: 'Phone number must have at least 10 characters' })
    .max(20, { message: 'Phone number must not exceed 20 characters' }),
  })

  static readonly UPDATE: ZodType = z.object({
    id: z.number().positive(),
    phone: z.string()
    .regex(/^\+?[0-9\s\-()]+$/, { message: 'Invalid phone number format' })
    .min(10, { message: 'Phone number must have at least 10 characters' })
    .max(20, { message: 'Phone number must not exceed 20 characters' }),
  })
}
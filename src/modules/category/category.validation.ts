import { ZodType, z } from 'zod';

export class CategoryValidation {
  static readonly CREATE: ZodType = z.object({
    storeId: z.number().positive(),
    name: z.string().min(1, {
      message: 'Name cannot be empty.'
    }),
  })

  static readonly UPDATE: ZodType = z.object({
    storeId: z.number().positive(),
    id: z.number().positive(),
    name: z.string().min(1, {
      message: 'Name cannot be empty.'
    }),
  })
}
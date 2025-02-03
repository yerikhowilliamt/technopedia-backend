import { ZodType, z } from 'zod';

export class ImageValidation {
  static readonly CREATE: ZodType = z.object({
    productId: z.number().positive(),
  })

  static readonly UPDATE: ZodType = z.object({
    productId: z.number().positive(),
    id: z.number().positive(),
  })
}
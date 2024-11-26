import { ZodType, z } from 'zod';

export class StoreValidation {
  static readonly CREATE: ZodType = z.object({
    id: z.number().positive(),
    name: z.string().min(1, {
      message: 'Name cannot be empty.'
    })
  }) 

  static readonly UPDATE: ZodType = z.object({
    id: z.number().positive(),
    name: z.string().min(1, {
      message: 'Name cannot be empty.'
    }).optional()
  }) 
}
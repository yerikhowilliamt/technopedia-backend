import { ZodType, z } from 'zod';

export class ColorValidation {
  static readonly CREATE: ZodType = z.object({
    storeId: z.number().positive(),
    name: z.string().min(1, {
      message: 'Name cannot be empty.'
    }),
    value: z.string().min(3, {
      message: 'Value cannot be empty.'
    }).max(7, {
      message: 'Max 7 character.'
    })
  })

  static readonly UPDATE: ZodType = z.object({
    storeId: z.number().positive(),
    id: z.number().positive(),
    name: z.string().min(1, {
      message: 'Name cannot be empty.'
    }),
    value: z.string().min(3, {
      message: 'Value cannot be empty.'
    }).max(7, {
      message: 'Max 7 character.'
    })
  })
}
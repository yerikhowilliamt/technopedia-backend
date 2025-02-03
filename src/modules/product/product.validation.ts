import { ZodType, z } from 'zod';

export class ProductValidation {
  static readonly CREATE: ZodType = z.object({
    storeId: z.number().positive(),
    categoryId: z.number().positive(),
    colorId: z.number().positive(),
    name: z.string().min(1, {
      message: 'Name cannot be empty.'
    }),
    price: z.string().min(1, {
      message: 'Price cannot be empty.'
    }),
    isFeatured: z.boolean(),
    isArchived: z.boolean()
  })

  static readonly UPDATE: ZodType = z.object({
    storeId: z.number().positive(),
    categoryId: z.number().positive(),
    colorId: z.number().positive(),
    name: z.string().min(1, {
      message: 'Name cannot be empty.'
    }),
    price: z.string().min(1, {
      message: 'Price cannot be empty.'
    }),
    isFeatured: z.boolean(),
    isArchived: z.boolean()
  })
}
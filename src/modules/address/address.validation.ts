import { ZodType, z } from 'zod';

export class AddressValidation {
  static readonly CREATE: ZodType = z.object({
    userId: z.number().positive(),
    street: z.string().min(1, {
      message: 'Street must be provided'
    }).max(255),
    city: z.string().min(1, {
      message: 'City must be provided'
    }).max(100),
    province: z.string().min(1, {
      message: 'Province must be provided'
    }).max(100),
    country: z.string().min(1, {
      message: 'Country must be provided'
    }).max(100),
    postalCode: z.string().min(1, {
      message: 'Postal code must be provided'
    }).max(10),
  });

  static readonly UPDATE: ZodType = z.object({
    userId: z.number().positive(),
    id: z.number().positive(),
    street: z.string().min(1, {
      message: 'Street must be provided'
    }).max(255),
    city: z.string().min(1, {
      message: 'City must be provided'
    }).max(100),
    province: z.string().min(1, {
      message: 'Province must be provided'
    }).max(100),
    country: z.string().min(1, {
      message: 'Country must be provided'
    }).max(100),
    postalCode: z.string().min(1, {
      message: 'Postal code must be provided'
    }).max(10),
  });

  static readonly DELETE: ZodType = z.object({
    id: z.number().positive(),
    userId: z.number().positive(),
  });
}
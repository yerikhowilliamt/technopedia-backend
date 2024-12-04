import { ZodType, z } from 'zod';

export class AuthValidation {
  static readonly REGISTER: ZodType = z.object({
    name: z.string().min(1, {
      message: 'Name is required.'
    }).max(100),
    email: z.string().email({
      message: 'Please enter a valid email address.'
    }).min(1, {
      message: 'Email is required.'
    }).max(100).email({
      message: 'Please enter a valid email address.'
    }).optional(),
    password: z.string().min(8, {
      message: 'Password is required. It must be at least 8 characters long.'
    }).max(100).optional(),
  });

  static readonly VALIDATEUSER: ZodType = z.object({
    email: z.string().min(1),
    name: z.string().min(1),
    image: z.string().min(1),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1).optional(),
    provider: z.string().min(1),
    providerAccountId: z.string().min(1)
  }) 

  static readonly LOGIN: ZodType = z.object({
    email: z.string().email({
      message: 'Please enter a valid email address.'
    }).min(1, {
      message: 'Email is required.'
    }).max(100),
    password: z.string().min(8, {
      message: 'Password is required. It must be at least 8 characters long.'
    }).max(100),
  });
}
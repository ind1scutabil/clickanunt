/**
 * COMPREHENSIVE INPUT VALIDATION SCHEMAS
 * All request bodies/query params validated with Zod
 * 
 * Coverage: 45 API endpoints across auth, listings, admin, payments
 */

import { z } from 'zod';

/**
 * Shared/Common Schemas
 */
export const emailSchema = z
  .string()
  .email('Email invalid')
  .toLowerCase()
  .trim()
  .max(255, 'Email too long');

export const passwordSchema = z
  .string()
  .min(8, 'Parola minimum 8 caractere')
  .max(128, 'Parola prea lungă')
  .regex(/[A-Z]/, 'Parola trebuie să conțină o literă mare')
  .regex(/[a-z]/, 'Parola trebuie să conțină o literă mică')
  .regex(/\d/, 'Parola trebuie să conțină o cifră')
  .regex(/[!@#$%^&*]/, 'Parola trebuie să conțină un simbol special');

export const nameSchema = z
  .string()
  .min(2, 'Nume minimum 2 caractere')
  .max(100, 'Nume maxim 100 caractere')
  .trim();

export const phoneSchema = z
  .string()
  .regex(/^[0-9\-\+\s()]{7,20}$/, 'Număr telefon invalid')
  .optional()
  .or(z.literal(''));

export const uuidSchema = z.string().uuid('ID invalid');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  direction: z.enum(['next', 'prev']).default('next').optional(),
}).strict();

/**
 * === AUTH ENDPOINTS ===
 */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Parola necesară'),
  rememberMe: z.boolean().default(false).optional(),
}).strict();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: nameSchema,
  acceptTerms: z.boolean().refine(v => v === true, 'Must accept terms'),
  acceptPrivacy: z.boolean().refine(v => v === true, 'Must accept privacy'),
}).strict().refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const registerExtendedSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  accountType: z.enum(['personal', 'business']),
  name: nameSchema,
  businessName: z.string().max(200).optional(),
  businessCUI: z.string().regex(/^\d{10}$/, 'CUI format invalid').optional(),
  businessRegCom: z.string().max(100).optional(),
  businessPhone: phoneSchema.optional(),
  businessEmail: emailSchema.optional(),
  businessLocation: z.string().max(200).optional(),
  businessDescription: z.string().max(1000).optional(),
}).strict().refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().optional(),
}).strict().refine(d => !d.confirmPassword || d.newPassword === d.confirmPassword, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});

export const verify2FASchema = z.object({
  sessionToken: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits').optional(),
  backupCode: z.string().min(6).max(20).optional(),
  rememberDevice: z.boolean().default(false).optional(),
}).strict();

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
}).strict();

/**
 * === LISTINGS ENDPOINTS ===
 */

export const listingCreateSchema = z.object({
  ownerUserId: uuidSchema,
  title: z.string().min(5, 'Titlu minim 5 caractere').max(200, 'Titlu maxim 200 caractere'),
  description: z.string().min(10, 'Descriere minim 10 caractere').max(10000, 'Descriere maxim 10000 caractere').optional(),
  category: z.string().min(1, 'Categorie necesară'),
  subcategory: z.string().optional(),
  priceAmount: z.coerce.number().min(0, 'Preț minim 0').max(99999999, 'Preț prea mare'),
  priceCurrency: z.enum(['RON', 'EUR', 'USD']).default('RON'),
  condition: z.enum(['new', 'used', 'refurbished', 'for_parts']).optional(),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  mileage: z.coerce.number().int().min(0).max(9999999).optional(),
  city: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  photos: z.array(z.string().url()).min(1, 'Minim o imagine').max(20, 'Maxim 20 imagini'),
  video: z.string().url().optional().nullable(),
  contactPhone: phoneSchema.optional(),
  allowMessages: z.boolean().optional(),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  fuel: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'gas']).optional(),
  transmission: z.enum(['manual', 'automatic']).optional(),
  features: z.array(z.string()).default([]).optional(),
  tags: z.array(z.string().max(50)).max(10).default([]).optional(),
}).strict();

export const listingEditSchema = listingCreateSchema.partial().extend({
  id: uuidSchema.optional(),
}).strict();

export const listingDeleteSchema = z.object({
  id: uuidSchema,
  reason: z.string().max(500).optional(),
}).strict();

export const listingPromoteSchema = z.object({
  listingId: uuidSchema,
  duration: z.enum(['7days', '30days', '90days']),
  paymentMethod: z.enum(['card', 'transfer', 'subscription']),
}).strict();

/**
 * === MESSAGES ENDPOINTS ===
 */

export const messageSendSchema = z.object({
  content: z.string().min(1, 'Message content required').max(5000),
}).strict();

/**
 * === REPORTS ENDPOINTS ===
 */

export const reportCreateSchema = z.object({
  listingId: uuidSchema,
  reason: z.enum(['spam', 'fraud', 'illegal', 'copyright', 'inappropriate', 'other']),
  description: z.string().min(10).max(2000),
  evidence: z.array(z.string().url()).max(5).default([]).optional(),
}).strict();

export const reportResolveSchema = z.object({
  action: z.enum(['approve', 'dismiss']),
  resolution: z.string().max(1000).optional(),
}).strict();

/**
 * === PAYMENTS ENDPOINTS
 */

export const paymentCreateSchema = z.object({
  listingId: uuidSchema,
  amount: z.coerce.number().min(0.01),
  currency: z.enum(['RON', 'EUR', 'USD']),
  paymentMethod: z.enum(['card', 'transfer', 'wallet']),
  description: z.string().max(500),
}).strict();

export const subscriptionSchema = z.object({
  planId: z.string().min(1),
  duration: z.enum(['monthly', 'yearly']),
  paymentMethod: z.enum(['card', 'transfer']),
}).strict();

/**
 * === ADMIN ENDPOINTS ===
 */

export const adminBanUserSchema = z.object({
  userId: uuidSchema,
  reason: z.string().min(10).max(500),
  duration: z.enum(['permanent', '7days', '30days', '90days']).default('permanent'),
}).strict();

export const adminPromoteSchema = z.object({
  listingId: uuidSchema,
  duration: z.enum(['7days', '30days', '90days']),
}).strict();

export const adminBroadcastSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
  type: z.enum(['info', 'warning', 'urgent']).default('info'),
  targetUsers: z.enum(['all', 'sellers', 'buyers', 'admins']).default('all'),
  sendEmail: z.boolean().default(true).optional(),
}).strict();

export const adminBulkActionsSchema = z.object({
  action: z.enum(['ban', 'warn', 'approve', 'reject', 'delete']),
  userIds: z.array(uuidSchema).min(1).max(1000),
  reason: z.string().max(500).optional(),
}).strict();

export const adminInvoiceSubmitSchema = z.object({
  invoiceIds: z.array(uuidSchema).min(1).max(100),
}).strict();

/**
 * === USER ENDPOINTS ===
 */

export const userProfileSchema = z.object({
  name: nameSchema.optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  phone: phoneSchema.optional(),
  city: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  website: z.string().url().optional(),
  businessName: z.string().max(200).optional(),
  businessCUI: z.string().max(20).optional(),
}).strict();

export const userBillingDataSchema = z.object({
  fullName: z.string().min(2).max(200),
  email: emailSchema,
  phone: phoneSchema,
  company: z.string().max(200).optional(),
  cui: z.string().regex(/^\d{10}$/).optional(),
  vat: z.string().optional(),
  address: z.string().max(500),
  city: z.string().max(100),
  county: z.string().max(100),
  postalCode: z.string().regex(/^\d{6}$/),
  country: z.string().length(2),
}).strict();

export const userVerifyBusinessSchema = z.object({
  businessName: z.string().min(1).max(200),
  businessCUI: z.string().regex(/^\d{10}$/, 'CUI must be 10 digits'),
  registrationNumber: z.string().max(50).optional(),
}).strict();

/**
 * === IMAGE UPLOAD ENDPOINTS ===
 */

export const imageUploadSchema = z.object({
  files: z.array(z.instanceof(File))
    .min(1, 'At least 1 file required')
    .max(20, 'Maximum 20 files'),
  purpose: z.enum(['listing', 'avatar', 'document', 'evidence']),
  listingId: uuidSchema.optional(),
}).strict();

export const uploadBase64Schema = z.object({
  filename: z.string().optional(), // Optional - server generates safe filename anyway
  data: z.string().min(1, 'Base64 data required'),
  listingId: z.string().optional(), // Changed from .uuid() to accept any string for debugging
  type: z.enum(['image', 'video']).optional(),
}).strict();

export const imageDeleteSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(50),
}).strict();

/**
 * === SEARCH ENDPOINTS ===
 */

export const searchListingsSchema = z.object({
  userId: z.string().max(50).optional(),
  q: z.string().min(2).max(200).optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  county: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  condition: z.string().max(50).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  year: z.coerce.number().int().optional(),
  yearMin: z.coerce.number().int().optional(),
  yearMax: z.coerce.number().int().optional(),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  fuel: z.string().max(50).optional(),
  transmission: z.string().max(50).optional(),
  sort: z.enum(['newest', 'priceAsc', 'priceDesc', 'featured']).default('newest'),
  ...paginationSchema.shape,
}).strict();

/**
 * === MODERATION ENDPOINTS ===
 */

export const moderationActionSchema = z.object({
  listingId: uuidSchema,
  action: z.enum(['approve', 'reject', 'review']),
  notes: z.string().max(1000).optional(),
}).strict();

/**
 * === DRAFT ENDPOINTS ===
 */

export const draftCreateSchema = z.object({
  id: uuidSchema.optional(),
  userId: uuidSchema,
  title: z.string().min(1).max(200).optional(),
  category: z.string().max(100).optional(),
  description: z.string().max(10000).optional(),
  priceAmount: z.coerce.number().min(0).optional(),
  photos: z.array(z.string().url()).max(20).optional(),
  county: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.coerce.number().int().optional(),
  mileage: z.coerce.number().int().optional(),
  fuel: z.string().max(50).optional(),
  transmission: z.string().max(50).optional(),
  isDealer: z.boolean().optional(),
  dealerBrands: z.array(z.string()).optional(),
  dealerPriceMin: z.coerce.number().optional(),
  dealerPriceMax: z.coerce.number().optional(),
}).strict();

/**
 * Utility function: Safely parse and validate request body
 */
export async function parseAndValidate<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return { success: false, error: errors };
    }
    
    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      error: 'Invalid JSON in request body',
    };
  }
}

/**
 * Utility function: Safely parse query parameters
 */
export function parseAndValidateQuery<T>(
  params: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: boolean; data?: T; error?: string } {
  try {
    const obj = Object.fromEntries(params);
    const result = schema.safeParse(obj);
    
    if (!result.success) {
      const errors = result.error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return { success: false, error: errors };
    }
    
    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      error: 'Invalid query parameters',
    };
  }
}

/**
 * Input Validation & Sanitization - OWASP ASVS V5
 * 
 * Features:
 * - Zod schemas for type-safe validation
 * - XSS prevention via sanitization
 * - SQL injection prevention
 * - Path traversal prevention
 * - File upload validation
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize plain text input
 */
export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .slice(0, 10000); // Max length protection
}

/**
 * Validate and sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Only allow safe characters
    .replace(/\.{2,}/g, '.') // Prevent path traversal
    .slice(0, 255); // Max filename length
}

/**
 * Listing validation schema
 */
export const listingValidationSchema = z.object({
  title: z.string()
    .min(5, 'Titlul trebuie să aibă minim 5 caractere')
    .max(100, 'Titlul nu poate depăși 100 caractere')
    .refine((val) => !/<script|javascript:|onerror=/i.test(val), 'Titlu invalid'),
  
  description: z.string()
    .max(5000, 'Descrierea nu poate depăși 5000 caractere')
    .optional()
    .transform((val) => val ? sanitizeHTML(val) : val),
  
  priceAmount: z.number()
    .min(0, 'Prețul trebuie să fie pozitiv')
    .max(10000000, 'Preț prea mare')
    .finite(),
  
  priceCurrency: z.enum(['RON', 'EUR', 'USD']),
  
  category: z.string()
    .min(1, 'Categoria este obligatorie')
    .max(100),
  
  subcategory: z.string()
    .max(100)
    .optional(),
  
  make: z.string()
    .max(50)
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),
  
  model: z.string()
    .max(50)
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),
  
  year: z.number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 2)
    .optional(),
  
  mileage: z.number()
    .int()
    .min(0)
    .max(10000000)
    .optional(),
  
  fuel: z.enum(['Benzină', 'Motorină', 'Hibrid', 'Electric', 'GPL', 'Altele'])
    .optional(),
  
  transmission: z.enum(['Manuală', 'Automată', 'Semiautomată'])
    .optional(),
  
  county: z.string()
    .max(50)
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),
  
  city: z.string()
    .max(50)
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),
  
  phone: z.string()
    .regex(/^\+?[0-9]{10,15}$/, 'Număr de telefon invalid')
    .optional(),
});

/**
 * User registration validation
 */
export const userRegistrationSchema = z.object({
  email: z.string()
    .email('Email invalid')
    .min(5)
    .max(255)
    .toLowerCase()
    .transform((val) => val.trim()),
  
  password: z.string()
    .min(8, 'Parola trebuie să aibă minim 8 caractere')
    .max(128)
    .regex(/[A-Z]/, 'Parola trebuie să conțină o literă mare')
    .regex(/[a-z]/, 'Parola trebuie să conțină o literă mică')
    .regex(/[0-9]/, 'Parola trebuie să conțină o cifră')
    .regex(/[^A-Za-z0-9]/, 'Parola trebuie să conțină un caracter special'),
  
  name: z.string()
    .min(2, 'Numele trebuie să aibă minim 2 caractere')
    .max(100)
    .transform((val) => sanitizeText(val)),
  
  phone: z.string()
    .regex(/^\+?[0-9]{10,15}$/, 'Număr de telefon invalid')
    .optional(),
});

/**
 * Login validation
 */
export const loginSchema = z.object({
  email: z.string()
    .email('Email invalid')
    .toLowerCase()
    .transform((val) => val.trim()),
  
  password: z.string()
    .min(1, 'Parola este obligatorie')
    .max(128),
});

/**
 * Search query validation
 */
export const searchQuerySchema = z.object({
  query: z.string()
    .max(200, 'Interogarea este prea lungă')
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),
  
  category: z.string()
    .max(100)
    .optional(),
  
  priceMin: z.number()
    .min(0)
    .max(10000000)
    .optional(),
  
  priceMax: z.number()
    .min(0)
    .max(10000000)
    .optional(),
  
  page: z.number()
    .int()
    .min(1)
    .max(10000)
    .default(1),
  
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});

/**
 * Image upload validation
 */
export const imageUploadSchema = z.object({
  filename: z.string()
    .min(1)
    .max(255)
    .transform(sanitizeFilename),
  
  size: z.number()
    .min(1, 'Fișier gol')
    .max(10 * 1024 * 1024, 'Fișierul nu poate depăși 10MB'),
  
  mimetype: z.enum([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]).refine((val) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(val), {
    message: 'Format invalid. Acceptăm doar JPEG, PNG, WebP'
  }),
});

/**
 * Contact form validation
 */
export const contactFormSchema = z.object({
  name: z.string()
    .min(2, 'Numele trebuie să aibă minim 2 caractere')
    .max(100)
    .transform(sanitizeText),
  
  email: z.string()
    .email('Email invalid')
    .toLowerCase()
    .transform((val) => val.trim()),
  
  subject: z.string()
    .min(3, 'Subiectul trebuie să aibă minim 3 caractere')
    .max(200)
    .transform(sanitizeText),
  
  message: z.string()
    .min(10, 'Mesajul trebuie să aibă minim 10 caractere')
    .max(2000)
    .transform(sanitizeHTML),
});

/**
 * Generic ID validation
 */
export function validateId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  
  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(id)) {
    return id;
  }
  
  return null;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Rate limit key sanitization
 */
export function sanitizeRateLimitKey(key: string): string {
  return key
    .replace(/[^a-zA-Z0-9:_-]/g, '')
    .slice(0, 100);
}

/**
 * SQL injection prevention - parameterized query helper
 */
export function escapeSqlString(value: string): string {
  return value.replace(/['";\\]/g, '\\$&');
}

/**
 * NoSQL injection prevention
 */
export function sanitizeMongoQuery(query: unknown): unknown {
  if (typeof query !== 'object' || query === null) {
    return query;
  }
  
  const obj = query as Record<string, unknown>;
  const sanitized = (Array.isArray(query) ? [] : {}) as Record<string, unknown>;
  
  for (const key in obj) {
    // Remove MongoDB operators
    if (key.startsWith('$')) {
      continue;
    }
    
    sanitized[key] = typeof obj[key] === 'object' 
      ? sanitizeMongoQuery(obj[key])
      : obj[key];
  }
  
  return sanitized;
}

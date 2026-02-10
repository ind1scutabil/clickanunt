/**
 * Input Sanitization pentru protecție XSS
 */

import validator from 'validator';

/**
 * Sanitizează string-uri HTML pentru prevenirea XSS
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  // Escapează caractere HTML periculoase
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizează text simplu (permite doar caractere alfanumerice și spații)
 */
export function sanitizePlainText(input: string): string {
  if (!input) return '';
  return input.replace(/[^\w\s\-.,!?]/gi, '');
}

/**
 * Validează și sanitizează email
 */
export function sanitizeEmail(email: string): string | null {
  if (!email) return null;
  
  const normalized = validator.normalizeEmail(email);
  if (!normalized || !validator.isEmail(normalized)) {
    return null;
  }
  
  return normalized;
}

/**
 * Validează URL
 */
export function isValidUrl(url: string): boolean {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
  });
}

/**
 * Sanitizează URL (doar http/https)
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  
  if (!isValidUrl(url)) {
    return null;
  }
  
  return validator.trim(url);
}

/**
 * Validează string alfanumeric (username, slug, etc)
 */
export function isAlphanumeric(input: string): boolean {
  return validator.isAlphanumeric(input, 'en-US', { ignore: '-_' });
}

/**
 * Sanitizează titlu anunț
 */
export function sanitizeTitle(title: string): string {
  if (!title) return '';
  
  // Trim, escape HTML
  let sanitized = validator.trim(title);
  sanitized = sanitizeHtml(sanitized);
  
  // Limitează lungime
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }
  
  return sanitized;
}

/**
 * Sanitizează descriere anunț
 */
export function sanitizeDescription(description: string): string {
  if (!description) return '';
  
  // Trim, escape HTML
  let sanitized = validator.trim(description);
  sanitized = sanitizeHtml(sanitized);
  
  // Limitează lungime
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  return sanitized;
}

/**
 * Validează și sanitizează număr de telefon
 */
export function sanitizePhone(phone: string): string | null {
  if (!phone) return null;
  
  // Elimină caractere non-numerice
  const cleaned = phone.replace(/\D/g, '');
  
  // Verifică lungime (8-15 cifre)
  if (cleaned.length < 8 || cleaned.length > 15) {
    return null;
  }
  
  return cleaned;
}

/**
 * Validează parola (min 8 caractere, 1 literă, 1 cifră)
 */
export function isValidPassword(password: string): boolean {
  if (!password || password.length < 8) {
    return false;
  }
  
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return hasLetter && hasNumber;
}

/**
 * Sanitizează obiect JSON (recurent)
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeHtml(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Detectează SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(union.*select)/i,
    /(--)/,
    /(;)/,
    /('|")/,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Detectează XSS patterns
 */
export function containsXss(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validare generală input periculos
 */
export function isDangerousInput(input: string): boolean {
  return containsSqlInjection(input) || containsXss(input);
}

/**
 * Sanitizează complet input utilizator
 */
export function sanitizeUserInput(input: unknown): unknown {
  if (typeof input === 'string') {
    // Verifică pentru SQL injection și XSS
    if (isDangerousInput(input)) {
      throw new Error('Input periculos detectat');
    }
    
    return sanitizeHtml(input);
  }
  
  if (typeof input === 'object') {
    return sanitizeObject(input);
  }
  
  return input;
}

/**
 * Validează slug (URL-friendly)
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Generează slug din titlu
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Elimină caractere speciale
    .replace(/[\s_-]+/g, '-') // Înlocuiește spații cu -
    .replace(/^-+|-+$/g, ''); // Elimină - de la început/sfârșit
}

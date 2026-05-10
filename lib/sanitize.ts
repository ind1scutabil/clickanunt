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
 * Variante de email de încercat la login (register poate salva altă formă canonică decât tastarea userului).
 * Important: Gmail — normalizeEmail scoate punctele din local-part; în DB pot exista rânduri vechi cu puncte.
 */
export function loginEmailLookupCandidates(rawEmail: string): string[] {
  const trimmed = rawEmail.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const out = new Set<string>();
  out.add(trimmed);
  out.add(lower);

  if (validator.isEmail(lower)) {
    const fullNorm = validator.normalizeEmail(trimmed);
    if (fullNorm) out.add(fullNorm);

    const g = lower.match(/^([^@]+)@(gmail|googlemail)\.com$/);
    if (g) {
      const keepDots = validator.normalizeEmail(trimmed, { gmail_remove_dots: false });
      if (keepDots) out.add(keepDots);
    }
  }

  return [...out];
}

/**
 * Cheie stabilă pentru inbox Google: același utilizator poate tasta local-part cu sau fără puncte.
 * googlemail.com este tratat echivalent cu gmail.com (același inbox).
 */
export function gmailInboxCanonicalKey(email: string): string | null {
  const m = email.trim().toLowerCase().match(/^([^@]+)@(gmail|googlemail)\.com$/i);
  if (!m) return null;
  const localFolded = m[1].replace(/\./g, "");
  return `gmail:${localFolded}`;
}

/** Când există mai multe rânduri pentru același inbox Gmail (puncte), alege clar contul dorit. */
export function preferUserAmongDuplicateEmails<
  T extends { email: string; role: string; createdAt: Date },
>(rows: T[], rawLogin: string): T {
  if (rows.length === 0) {
    throw new Error('preferUserAmongDuplicateEmails: no rows');
  }
  if (rows.length === 1) return rows[0];

  const want = rawLogin.trim().toLowerCase();

  const sorted = [...rows].sort((a, b) => {
    const score = (u: T) => {
      let s = 0;
      if (u.email.toLowerCase() === want) s += 100;
      if (u.role === 'admin') s += 40;
      if (u.role === 'owner') s += 39;
      return s;
    };
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return sorted[0]!;
}

/** Potrivire login: insensibil la registru; Gmail/Googlemail ignoră punctele în local-part. */
export function emailsEquivalentForLogin(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (x === y) return true;

  const gx = /^([^@]+)@(gmail|googlemail)\.com$/i.exec(x);
  const gy = /^([^@]+)@(gmail|googlemail)\.com$/i.exec(y);
  if (gx && gy && gx[2] === gy[2]) {
    const lx = gx[1].replace(/\./g, '');
    const ly = gy[1].replace(/\./g, '');
    return lx === ly;
  }

  return false;
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

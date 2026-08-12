/**
 * OpenAI Content Moderation System
 * Securitate și moderare automată pentru text și imagini
 * Conformitate cu GDPR și Legea 365/2002
 */

import OpenAI from 'openai';

/**
 * Lazy OpenAI client — do not construct at module load (crashes when
 * OPENAI_API_KEY is unset). Call sites that need moderation already
 * no-op when the key is missing.
 */
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}
// Tipuri pentru rezultate moderare
export interface ModerationResult {
  flagged: boolean;
  categories: {
    sexual: boolean;
    hate: boolean;
    harassment: boolean;
    'self-harm': boolean;
    'sexual/minors': boolean;
    'hate/threatening': boolean;
    'violence/graphic': boolean;
    'self-harm/intent': boolean;
    'self-harm/instructions': boolean;
    'harassment/threatening': boolean;
    violence: boolean;
  };
  category_scores: {
    sexual: number;
    hate: number;
    harassment: number;
    'self-harm': number;
    'sexual/minors': number;
    'hate/threatening': number;
    'violence/graphic': number;
    'self-harm/intent': number;
    'self-harm/instructions': number;
    'harassment/threatening': number;
    violence: number;
  };
  reason?: string;
}

export interface ImageModerationResult {
  flagged: boolean;
  issues: string[];
  confidence: number;
  reason?: string;
}

/**
 * Moderare text folosind OpenAI Moderation API
 * Detectează: conținut sexual, violență, hate speech, harassment, self-harm
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not configured - skipping moderation');
      return createSafeResult();
    }

    // Verificare text gol
    if (!text || text.trim().length === 0) {
      return createSafeResult();
    }

    // Apel OpenAI Moderation API
    const openai = getOpenAI();
    if (!openai) {
      return createSafeResult();
    }
    const response = await openai.moderations.create({
      input: text,
    });

    const result = response.results[0];

    // Construire rezultat
    const moderationResult: ModerationResult = {
      flagged: result.flagged,
      categories: result.categories,
      category_scores: result.category_scores,
    };

    // Adaugă motiv dacă e flagged
    if (result.flagged) {
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, value]) => value)
        .map(([key, _]) => key);
      
      moderationResult.reason = `Conținut inadecvat detectat: ${flaggedCategories.join(', ')}`;
    }

    return moderationResult;
  } catch (error) {
    console.error('❌ Eroare moderare text:', error);
    // În caz de eroare, permitem conținutul (fail-open) dar logăm
    return createSafeResult();
  }
}

/**
 * Moderare imagini folosind GPT-4 Vision
 * Detectează: conținut sexual, violență, arme, droguri, produse contrafăcute
 */
export async function moderateImage(imageUrl: string): Promise<ImageModerationResult> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not configured - skipping image moderation');
      return {
        flagged: false,
        issues: [],
        confidence: 0,
      };
    }

    // Prompt pentru moderare imagini
    const openai = getOpenAI();
    if (!openai) {
      return {
        flagged: false,
        issues: [],
        confidence: 0,
      };
    }
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // gpt-4o suportă vision
      messages: [
        {
          role: 'system',
          content: `Ești un sistem de moderare pentru o platformă de anunțuri auto și generale (similar OLX).
Verifică imaginea pentru conținut inadecvat. Returnează răspuns în format JSON cu:
- flagged: boolean (true dacă există probleme)
- issues: array de string-uri cu problemele găsite
- confidence: număr între 0-100 (cât de sigur ești)

VERIFICĂ pentru:
1. Conținut sexual explicit sau nuditate
2. Violență grafică sau sânge
3. Arme de foc, cuțite, explozivi
4. Droguri ilegale sau parafernale
5. Simboluri hate/extremism
6. Produse contrafăcute (branduri false)
7. Informații personale vizibile (CNP, carduri bancare)
8. Copii în situații periculoase

Pentru anunțuri auto: permiteți mașini, motociclete, piese auto, interior/exterior vehicul.
Pentru alte categorii: permiteți produse legale, imobile, electronice, animale, etc.

ATENȚIE: Nu flagga imagini normale de produse, case, mașini, electronice, etc.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'low' // Folosim 'low' pentru cost mai mic
              }
            }
          ]
        }
      ],
      max_tokens: 300,
      temperature: 0.2, // Mai puțină creativitate, mai multă consistență
    });

    // Parse răspuns
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        flagged: false,
        issues: [],
        confidence: 0,
      };
    }

    // Extrage JSON din răspuns
    let result: ImageModerationResult;
    try {
      // Încearcă să găsească JSON în răspuns
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: parseză direct
        result = JSON.parse(content);
      }
    } catch (parseError) {
      // Dacă nu e JSON, analizează textul
      const flagged = content.toLowerCase().includes('flagged') || 
                     content.toLowerCase().includes('inadecvat') ||
                     content.toLowerCase().includes('probleme');
      
      result = {
        flagged,
        issues: flagged ? ['Conținut potențial inadecvat'] : [],
        confidence: 50,
      };
    }

    // Adaugă reason dacă e flagged
    if (result.flagged && result.issues.length > 0) {
      result.reason = `Imagine respinsă: ${result.issues.join(', ')}`;
    }

    return result;
  } catch (error) {
    console.error('❌ Eroare moderare imagine:', error);
    // În caz de eroare, permitem imaginea (fail-open)
    return {
      flagged: false,
      issues: [],
      confidence: 0,
    };
  }
}

/**
 * Moderare completă pentru anunț (titlu + descriere)
 */
export async function moderateListing(title: string, description: string): Promise<ModerationResult> {
  try {
    // Combină titlu și descriere pentru moderare
    const combinedText = `Titlu: ${title}\n\nDescriere: ${description}`;
    
    return await moderateText(combinedText);
  } catch (error) {
    console.error('❌ Eroare moderare anunț:', error);
    return createSafeResult();
  }
}

/**
 * Verificare cuvinte cheie spam/fraudă (layer suplimentar)
 */
export function detectSpamKeywords(text: string): { isSpam: boolean; keywords: string[] } {
  const spamKeywords = [
    // Scheme piramida/fraude
    'castig garantat',
    'bani rapidi',
    'fara efort',
    'devii bogat',
    'multi level marketing',
    'mlm',
    'recrutare urgenta',
    
    // Farmaceutice ilegale
    'viagra',
    'cialis',
    'tramadol',
    'steroizi',
    
    // Servicii ilegale
    'documente false',
    'permis fals',
    'diploma falsa',
    'buletin fals',
    'acte false',
    
    // Produse contrafăcute
    'replica',
    'aaa quality',
    '1:1 copy',
    
    // Spam financiar
    'credit urgent',
    'imprumut fara acte',
    'bani pe loc',
    
    // Escrocherii
    'trimite bani',
    'western union',
    'moneygram',
    'vanzare urgenta plecare strainatate',
  ];

  const textLower = text.toLowerCase();
  const foundKeywords = spamKeywords.filter(keyword => textLower.includes(keyword));

  return {
    isSpam: foundKeywords.length > 0,
    keywords: foundKeywords,
  };
}

/**
 * Verificare informații personale expuse (GDPR compliance)
 */
export function detectPersonalInfo(text: string): { hasPersonalInfo: boolean; types: string[] } {
  const patterns = {
    cnp: /\b[1-8]\d{12}\b/g, // CNP românesc
    iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g, // IBAN
    card: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Card bancar
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    phone: /\b0\d{9}\b/g, // Telefon românesc
  };

  const types: string[] = [];
  
  if (patterns.cnp.test(text)) types.push('CNP');
  if (patterns.iban.test(text)) types.push('IBAN');
  if (patterns.card.test(text)) types.push('Card bancar');
  if (patterns.email.test(text)) types.push('Email');
  if (patterns.phone.test(text)) types.push('Telefon');

  return {
    hasPersonalInfo: types.length > 0,
    types,
  };
}

/**
 * Moderare completă cu toate verificările
 */
export async function fullModeration(
  title: string,
  description: string,
  imageUrls?: string[]
): Promise<{
  approved: boolean;
  textModeration: ModerationResult;
  imageModeration?: ImageModerationResult[];
  spamCheck: { isSpam: boolean; keywords: string[] };
  personalInfoCheck: { hasPersonalInfo: boolean; types: string[] };
  reason?: string;
}> {
  // 1. Moderare text (OpenAI)
  const textModeration = await moderateListing(title, description);

  // 2. Verificare spam keywords
  const spamCheck = detectSpamKeywords(`${title} ${description}`);

  // 3. Verificare informații personale (GDPR)
  const personalInfoCheck = detectPersonalInfo(`${title} ${description}`);

  // 4. Moderare imagini (dacă există)
  let imageModeration: ImageModerationResult[] | undefined;
  if (imageUrls && imageUrls.length > 0) {
    imageModeration = await Promise.all(
      imageUrls.map(url => moderateImage(url))
    );
  }

  // Decizie finală
  let approved = true;
  let reason: string | undefined;

  // Verificări în ordine
  if (textModeration.flagged) {
    approved = false;
    reason = textModeration.reason;
  } else if (spamCheck.isSpam) {
    approved = false;
    reason = `Cuvinte spam detectate: ${spamCheck.keywords.join(', ')}`;
  } else if (personalInfoCheck.hasPersonalInfo) {
    approved = false;
    reason = `Informații personale expuse (GDPR): ${personalInfoCheck.types.join(', ')}. Te rugăm să nu incluzi CNP, IBAN, card bancar în anunț.`;
  } else if (imageModeration && imageModeration.some(im => im.flagged)) {
    approved = false;
    const flaggedImages = imageModeration.filter(im => im.flagged);
    reason = `Imagini respinse: ${flaggedImages.map(im => im.reason).join('; ')}`;
  }

  return {
    approved,
    textModeration,
    imageModeration,
    spamCheck,
    personalInfoCheck,
    reason,
  };
}

/**
 * Helper: rezultat sigur (fail-open)
 */
function createSafeResult(): ModerationResult {
  return {
    flagged: false,
    categories: {
      sexual: false,
      hate: false,
      harassment: false,
      'self-harm': false,
      'sexual/minors': false,
      'hate/threatening': false,
      'violence/graphic': false,
      'self-harm/intent': false,
      'self-harm/instructions': false,
      'harassment/threatening': false,
      violence: false,
    },
    category_scores: {
      sexual: 0,
      hate: 0,
      harassment: 0,
      'self-harm': 0,
      'sexual/minors': 0,
      'hate/threatening': 0,
      'violence/graphic': 0,
      'self-harm/intent': 0,
      'self-harm/instructions': 0,
      'harassment/threatening': 0,
      violence: 0,
    },
  };
}

/**
 * Log moderare pentru audit (GDPR Art. 30)
 */
export async function logModeration(
  userId: string,
  listingId: string | null,
  moderationResult: any,
  action: 'approved' | 'rejected'
) {
  // TODO: Salvează în baza de date pentru audit
  console.log('📋 Moderation Log:', {
    timestamp: new Date().toISOString(),
    userId,
    listingId,
    action,
    moderationResult,
  });
}

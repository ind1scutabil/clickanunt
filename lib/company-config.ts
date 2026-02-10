/**
 * Configurație Companie - Detalii legale și de identificare
 * Folosit în facturi, emailuri, și alte comunicări oficiale
 */

export const COMPANY_CONFIG = {
  // Detalii legale
  name: 'ENORE SALES TYPE S.R.L.',
  cui: 'RO46062613', // CUI (Cod Unic de Identificare)
  registrationNumber: 'J20220000480181', // Reg. Com.
  
  // Adresă
  address: 'Jud. Gorj, Municipiul Targu Jiu, Aleea Macului, Nr 4, Bl 4, Scara 2, Et 3, Ap 34',
  city: 'Targu Jiu',
  county: 'Gorj',
  country: 'România',
  
  // Informații bancară
  bank: 'ING',
  iban: 'RO50 INGB 0000 9999 1573 6030',
  currency: 'RON',
  
  // TVA
  vatNumber: 'RO46062613', // Numărul de TVA (pentru facturi cu TVA)
  vatRate: 19, // Procentaj TVA implicit (%)
  isTaxPayer: true, // Compania este platitoare de TVA
  
  // Contact
  emails: {
    admin: 'admin@clickanunt.ro',
    support: 'support@clickanunt.ro',
    billing: 'billing@clickanunt.ro',
    noreply: 'noreply@clickanunt.ro',
    contact: 'contact@clickanunt.ro',
    dpo: 'dpo@clickanunt.ro',
  },
  
  // Platform
  platformName: 'ClickAnunț',
  website: 'https://clickanunt.ro',
};

/**
 * Format informații TVA pentru facturi
 */
export function formatVatInfo(): string {
  return `TVA: ${COMPANY_CONFIG.vatNumber}`;
}

/**
 * Format informații companie pentru facturi
 */
export function formatCompanyInfo(): {
  name: string;
  cui: string;
  registrationNumber: string;
  address: string;
  vatNumber: string;
} {
  return {
    name: COMPANY_CONFIG.name,
    cui: COMPANY_CONFIG.cui,
    registrationNumber: COMPANY_CONFIG.registrationNumber,
    address: COMPANY_CONFIG.address,
    vatNumber: COMPANY_CONFIG.vatNumber,
  };
}

/**
 * Format informații bancară
 */
export function formatBankInfo(): string {
  return `${COMPANY_CONFIG.name} | IBAN: ${COMPANY_CONFIG.iban} | Banca: ${COMPANY_CONFIG.bank}`;
}

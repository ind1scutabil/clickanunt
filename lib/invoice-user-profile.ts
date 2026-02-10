/**
 * Invoice User Profile Integration
 * Extrage date legale din user profile pentru facturare automată
 */

import { prisma } from './prisma';

export interface UserBillingProfile {
  type: 'personal' | 'business';
  name?: string;
  email: string;
  // Business fields
  companyName?: string;
  cui?: string;
  registrationNumber?: string;
  phone?: string;
  location?: string;
  description?: string;
  contactPerson?: string;
}

/**
 * Extrage profil de facturare din user profile
 */
export async function getUserBillingProfile(userId: string): Promise<UserBillingProfile | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        accountType: true,
        businessName: true,
        businessCUI: true,
        businessRegCom: true,
        businessPhone: true,
        businessEmail: true,
        businessLocation: true,
        businessDescription: true,
      },
    });

    if (!user) {
      return null;
    }

    // Dacă user e de tip business
    if (user.accountType === 'business') {
      return {
        type: 'business',
        name: user.name || user.businessName || 'Director',
        email: user.businessEmail || user.email,
        companyName: user.businessName || undefined,
        cui: user.businessCUI || undefined,
        registrationNumber: user.businessRegCom || undefined,
        phone: user.businessPhone || undefined,
        location: user.businessLocation || undefined,
        description: user.businessDescription || undefined,
        contactPerson: user.name || 'Contact',
      };
    }

    // Personal type
    return {
      type: 'personal',
      name: user.name || 'Client',
      email: user.email,
    };
  } catch (error) {
    console.error('Error getting billing profile:', error);
    return null;
  }
}

/**
 * Validează dacă user are toate datele necesare pentru facturare
 */
export async function validateUserBillingData(userId: string): Promise<{
  valid: boolean;
  missingFields: string[];
  profile: UserBillingProfile | null;
}> {
  const profile = await getUserBillingProfile(userId);

  if (!profile) {
    return {
      valid: false,
      missingFields: ['User not found'],
      profile: null,
    };
  }

  const missingFields: string[] = [];

  if (profile.type === 'business') {
    if (!profile.companyName) missingFields.push('businessName');
    if (!profile.cui) missingFields.push('businessCUI');
    if (!profile.registrationNumber) missingFields.push('businessRegCom');
    if (!profile.phone) missingFields.push('businessPhone');
    if (!profile.location) missingFields.push('businessLocation');
  } else {
    if (!profile.name) missingFields.push('name');
  }

  if (!profile.email) missingFields.push('email');

  return {
    valid: missingFields.length === 0,
    missingFields,
    profile,
  };
}

/**
 * Formatează date legale pentru invoice metadata
 */
export async function formatUserInvoiceMetadata(userId: string): Promise<{
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  clientCui?: string;
}> {
  const profile = await getUserBillingProfile(userId);

  if (!profile) {
    throw new Error('User not found for invoice metadata');
  }

  return {
    clientName: profile.companyName || profile.name || 'Client',
    clientEmail: profile.email,
    clientAddress: profile.location,
    clientCui: profile.type === 'business' ? profile.cui : undefined,
  };
}

/**
 * Sincronizează date legale din formular signup în user profile
 * (Folosit la înregistrare pentru a actualiza extended fields)
 */
export async function syncUserBillingData(
  userId: string,
  billingProfile: Partial<UserBillingProfile>
): Promise<boolean> {
  try {
    if (billingProfile.type === 'business') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          businessName: billingProfile.companyName || undefined,
          businessCUI: billingProfile.cui || undefined,
          businessRegCom: billingProfile.registrationNumber || undefined,
          businessPhone: billingProfile.phone || undefined,
          businessEmail: billingProfile.email || undefined,
          businessLocation: billingProfile.location || undefined,
          businessDescription: billingProfile.description || undefined,
          // Update name if it's the contact person
          ...(billingProfile.contactPerson && { name: billingProfile.contactPerson }),
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Error syncing billing data:', error);
    return false;
  }
}

/**
 * Verifică dacă user și-a completat datele legale necesare
 */
export async function hasCompleteBillingData(userId: string): Promise<boolean> {
  const validation = await validateUserBillingData(userId);
  return validation.valid;
}

/**
 * Obține status de completare profil pentru billing
 */
export async function getBillingProfileStatus(userId: string): Promise<{
  complete: boolean;
  progress: number; // 0-100
  missingFields: string[];
  lastUpdated?: Date;
}> {
  const validation = await validateUserBillingData(userId);
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountType: true,
      updatedAt: true,
    },
  });

  let totalFields = 2; // email + type
  if (user?.accountType === 'business') {
    totalFields = 7; // email + name + businessName + CUI + RegCom + phone + location
  }

  const completedFields = totalFields - validation.missingFields.length;
  const progress = Math.round((completedFields / totalFields) * 100);

  return {
    complete: validation.valid,
    progress,
    missingFields: validation.missingFields,
    lastUpdated: user?.updatedAt,
  };
}

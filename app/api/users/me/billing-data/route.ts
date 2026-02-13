/**
 * API Route: Verify User Billing Data
 * GET /api/users/me/billing-status - Obține status de completare profil
 * PUT /api/users/me/billing-data - Actualizează date legale
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  getBillingProfileStatus, 
  validateUserBillingData
} from '@/lib/invoice-user-profile';
import type { AccountType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountType: true,
        name: true,
        email: true,
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get status
    const status = await getBillingProfileStatus(userId);
    const validation = await validateUserBillingData(userId);

    return NextResponse.json({
      status,
      profile: {
        type: user.accountType,
        ...validation.profile,
      },
      rawData: {
        name: user.name,
        email: user.email,
        ...(user.accountType === 'business' && {
          businessName: user.businessName,
          businessCUI: user.businessCUI,
          businessRegCom: user.businessRegCom,
          businessPhone: user.businessPhone,
          businessEmail: user.businessEmail,
          businessLocation: user.businessLocation,
          businessDescription: user.businessDescription,
        }),
      },
    });
  } catch (error: unknown) {
    console.error('Get billing status error:', error);
    return NextResponse.json(
      { error: 'Failed to get billing status' },
      { status: 500 }
    );
  }
}

interface UpdateBillingRequest {
  accountType?: string;
  name?: string;
  businessName?: string;
  businessCUI?: string;
  businessRegCom?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessLocation?: string;
  businessDescription?: string;
}

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body: UpdateBillingRequest = await req.json();

    // Validate business data if updating
    if (body.accountType === 'business') {
      if (!body.businessName?.trim() || !body.businessCUI?.trim() || !body.businessRegCom?.trim()) {
        return NextResponse.json(
          { 
            error: 'Business name, CUI, and registration number are required',
            fields: ['businessName', 'businessCUI', 'businessRegCom']
          },
          { status: 400 }
        );
      }

      // Validate CUI format
      const cuiRegex = /^(RO)?[0-9]{6,10}$|^[A-Z]{2}[0-9]{6,8}$/;
      if (!cuiRegex.test(body.businessCUI.replace(/[^A-Z0-9]/g, ''))) {
        return NextResponse.json(
          { error: 'Invalid CUI format (ex: RO12345678)' },
          { status: 400 }
        );
      }
    }
    const accountType: AccountType =
      body.accountType === 'business'
        ? 'business'
        : body.accountType === 'personal' || body.accountType === 'private'
        ? 'private'
        : user.accountType;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name || user.name,
        accountType,
        ...(body.accountType === 'business' && {
          businessName: body.businessName || user.businessName,
          businessCUI: body.businessCUI?.replace(/[^0-9]/g, '') || user.businessCUI,
          businessRegCom: body.businessRegCom || user.businessRegCom,
          businessPhone: body.businessPhone || user.businessPhone,
          businessEmail: body.businessEmail || user.businessEmail,
          businessLocation: body.businessLocation || user.businessLocation,
          businessDescription: body.businessDescription || user.businessDescription,
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
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

    // Get updated status
    const status = await getBillingProfileStatus(userId);

    return NextResponse.json({
      success: true,
      message: 'Billing data updated successfully',
      user: updatedUser,
      status,
    });
  } catch (error: unknown) {
    console.error('Update billing data error:', error);
    return NextResponse.json(
      { error: 'Failed to update billing data' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canRequestBusinessVerification } from '@/lib/verification';

/**
 * Request business verification
 */
export async function POST(req: NextRequest) {
  try {
    // TODO: Add authentication when NextAuth is configured
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = { user: { id: userId } };

    const body = await req.json();
    const {
      businessName,
      businessCUI,
      businessRegCom,
      businessDescription,
      businessPhone,
      businessEmail,
      businessWebsite,
      businessLocation,
    } = body;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if eligible for business verification
    const canRequest = canRequestBusinessVerification(
      user.accountType as any,
      user.verificationLevel as any,
      user.phoneVerified
    );
    if (!canRequest) {
      return NextResponse.json(
        { error: 'Not eligible for business verification' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!businessName || !businessCUI || !businessRegCom) {
      return NextResponse.json(
        { error: 'Missing required business information' },
        { status: 400 }
      );
    }

    // Update user with business information
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        accountType: 'business',
        businessName,
        businessCUI,
        businessRegCom,
        businessDescription: businessDescription || null,
        businessPhone: businessPhone || null,
        businessEmail: businessEmail || user.email,
        businessWebsite: businessWebsite || null,
        businessLocation: businessLocation || null,
        verificationLevel: 'phone', // Stays at phone until admin verifies
      },
    });

    // Create verification request
    await prisma.verificationRequest.create({
      data: {
        userId: user.id,
        type: 'business',
        status: 'pending',
        data: {
          businessName,
          businessCUI,
          businessRegCom,
          businessDescription,
          businessPhone,
          businessEmail,
          businessWebsite,
          businessLocation,
          requestedAt: new Date().toISOString(),
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'request_business_verification',
        resource: 'user',
        resourceId: user.id,
        details: {
          businessName,
          cui: businessCUI,
        },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
        userAgent: req.headers.get('user-agent') || '',
      },
    });

    return NextResponse.json({
      message: 'Business verification request submitted',
      user: {
        id: updatedUser.id,
        accountType: updatedUser.accountType,
        verificationLevel: updatedUser.verificationLevel,
        businessName: updatedUser.businessName,
      },
    });
  } catch (error: any) {
    console.error('Request business verification error:', error);
    return NextResponse.json(
      { error: 'Failed to submit verification request' },
      { status: 500 }
    );
  }
}

/**
 * Get verification request status
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = { user: { id: userId } };

    const request = await prisma.verificationRequest.findFirst({
      where: {
        userId: session.user.id,
        type: 'business',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!request) {
      return NextResponse.json({ error: 'No verification request found' }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error: any) {
    console.error('Get verification request error:', error);
    return NextResponse.json(
      { error: 'Failed to get verification request' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNetopiaClient, NETOPIA_STATUS } from '@/lib/netopia';

/**
 * Netopia IPN (Instant Payment Notification) handler
 * This receives encrypted payment status updates from Netopia
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const envKey = formData.get('env_key') as string;
    const data = formData.get('data') as string;

    if (!envKey || !data) {
      console.error('Netopia IPN: Missing env_key or data');
      return new NextResponse(
        '<?xml version="1.0" encoding="utf-8"?><crc error_code="1">Invalid request</crc>',
        { 
          status: 400,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    }

    // Decrypt notification
    const netopia = createNetopiaClient();
    const notification = netopia.decryptNotification(envKey, data);

    console.log('Netopia IPN received:', {
      orderId: notification.orderId,
      status: notification.status,
      amount: notification.amount,
    });

    // Verify payment exists
    const payment = await prisma.payment.findUnique({
      where: { id: notification.orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            subscriptionTier: true,
          },
        },
      },
    });

    if (!payment) {
      console.error('Netopia IPN: Payment not found:', notification.orderId);
      return new NextResponse(
        '<?xml version="1.0" encoding="utf-8"?><crc error_code="2">Payment not found</crc>',
        { 
          status: 404,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    }

    // Verify amount matches
    const expectedAmount = payment.amount * 100; // Convert to bani
    if (Math.abs(notification.amount - expectedAmount) > 1) {
      console.error('Netopia IPN: Amount mismatch', {
        expected: expectedAmount,
        received: notification.amount,
      });
      return new NextResponse(
        '<?xml version="1.0" encoding="utf-8"?><crc error_code="3">Amount mismatch</crc>',
        { 
          status: 400,
          headers: { 'Content-Type': 'application/xml' }
        }
      );
    }

    // Process based on status
    let updatedStatus: string = payment.status;
    let shouldActivate = false;

    switch (notification.status) {
      case NETOPIA_STATUS.PAID:
      case NETOPIA_STATUS.CONFIRMED:
        updatedStatus = 'succeeded';
        shouldActivate = true;
        break;
        
      case NETOPIA_STATUS.PAID_PENDING:
      case NETOPIA_STATUS.CONFIRMED_PENDING:
        updatedStatus = 'processing';
        break;
        
      case NETOPIA_STATUS.CANCELED:
        updatedStatus = 'cancelled';
        break;
        
      case NETOPIA_STATUS.CREDIT:
        updatedStatus = 'refunded';
        break;
        
      default:
        updatedStatus = 'failed';
    }

    // Update payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: updatedStatus as any,
        paidAt: shouldActivate ? new Date() : payment.paidAt,
        metadata: {
          ...payment.metadata as any,
          netopiaStatus: notification.status,
          netopiaErrorCode: notification.errorCode,
          netopiaErrorMessage: notification.errorMessage,
          ipnReceivedAt: new Date().toISOString(),
        },
      },
    });

    // Activate promotion or subscription if payment succeeded
    if (shouldActivate) {
      const metadata = payment.metadata as any;
      
      if (metadata.promotionId) {
        // Activate promotion
        const listing = await prisma.listing.findUnique({
          where: { id: metadata.promotionId },
        });

        if (listing) {
          const promotionDuration = metadata.promotionType === 'boost_24h' ? 24
            : metadata.promotionType === 'boost_72h' ? 72
            : metadata.promotionType === 'boost_7days' ? 168
            : 24;

          await prisma.listing.update({
            where: { id: listing.id },
            data: {
              isPromoted: true,
              promotionType: metadata.promotionType,
              promotionStartedAt: new Date(),
              promotionExpiresAt: new Date(Date.now() + promotionDuration * 60 * 60 * 1000),
            },
          });

          console.log('Netopia: Promotion activated:', listing.id);
        }
      } else if (metadata.subscriptionTier) {
        // Activate subscription
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await prisma.user.update({
          where: { id: payment.userId },
          data: {
            subscriptionTier: metadata.subscriptionTier,
            subscriptionExpiresAt: expiresAt,
            subscriptionRenewsAt: expiresAt,
            freeBoostsRemaining: metadata.subscriptionTier === 'business' ? 3 : 5,
          },
        });

        console.log('Netopia: Subscription activated:', payment.userId);
      }

      // Create invoice
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      await prisma.invoice.create({
        data: {
          userId: payment.userId,
          paymentId: payment.id,
          invoiceNumber,
          amount: payment.amount,
          currency: payment.currency,
          status: 'paid',
          issuedAt: new Date(),
          paidAt: new Date(),
          items: {
            description: payment.description || 'Payment',
            amount: payment.amount,
            quantity: 1,
          },
        },
      });

      console.log('Netopia: Invoice created:', invoiceNumber);
    }

    // Return success response (XML format required by Netopia)
    return new NextResponse(
      `<?xml version="1.0" encoding="utf-8"?><crc error_code="0">${notification.orderId}</crc>`,
      {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  } catch (error: any) {
    console.error('Netopia IPN error:', error);
    
    return new NextResponse(
      '<?xml version="1.0" encoding="utf-8"?><crc error_code="99">Internal error</crc>',
      { 
        status: 500,
        headers: { 'Content-Type': 'application/xml' }
      }
    );
  }
}

// GET handler for testing (Netopia might call with GET for verification)
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Netopia IPN endpoint',
    status: 'ok' 
  });
}

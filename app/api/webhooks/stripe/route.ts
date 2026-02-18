import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { createInvoice } from '@/lib/invoice';
import { sendInvoiceEmail } from '@/lib/invoice-mailer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('✅ PaymentIntent succeeded:', paymentIntent.id);

        // Extract metadata
        const { listingId, packageType, userId } = paymentIntent.metadata;

        if (listingId && packageType) {
          try {
            // Calculate expiration date based on package
            const daysMap: Record<string, number> = {
              'featured_7_days': 7,
              'featured_30_days': 30,
              'top_position_1_day': 1,
              'refresh_listing': 0, // Instant refresh
            };

            const days = daysMap[packageType] || 7;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + days);

            // Update listing with promotion
            await prisma.listing.update({
              where: { id: listingId },
              data: {
                isPromoted: true,
                promotionExpiresAt: expiresAt,
                updatedAt: new Date(),
              },
            });

            console.log(`✅ Listing ${listingId} promoted until ${expiresAt}`);

            // Generate and send invoice
            try {
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { 
                  email: true, 
                  name: true,
                  businessName: true,
                  businessCUI: true,
                  businessLocation: true,
                },
              });

              if (user) {
                const invoice = await createInvoice({
                  userId,
                  paymentId: paymentIntent.id,
                  items: [{
                    description: `Promovare anunț - ${packageType}`,
                    quantity: 1,
                    unitPrice: paymentIntent.amount,
                    vatRate: 19,
                  }],
                  clientName: user.businessName || user.name || 'Client',
                  clientEmail: user.email,
                  clientAddress: user.businessLocation || undefined,
                  clientCui: user.businessCUI || undefined,
                });

                console.log(`✅ Invoice ${invoice.invoiceNumber} created`);

                // Fetch full invoice for email
                const fullInvoice = await prisma.invoice.findUnique({
                  where: { id: invoice.id },
                });

                if (fullInvoice) {
                  // Send invoice email
                  const invoiceMeta = fullInvoice.metadata as any;
                  await sendInvoiceEmail({
                    to: user.email,
                    invoiceNumber: fullInvoice.invoiceNumber,
                    clientName: user.businessName || user.name || 'Client',
                    amount: fullInvoice.amount,
                    currency: fullInvoice.currency,
                    issuedAt: fullInvoice.issuedAt || new Date(),
                    dueAt: fullInvoice.dueAt || new Date(),
                    items: invoiceMeta?.items || [{
                      description: `Promovare anunț - ${packageType}`,
                      quantity: 1,
                      unitPrice: paymentIntent.amount,
                      vatRate: 19,
                    }],
                    subtotal: invoiceMeta?.subtotal || paymentIntent.amount,
                    vatAmount: invoiceMeta?.vatAmount || Math.round(paymentIntent.amount * 0.19),
                    metadata: invoiceMeta,
                  });
                  console.log(`✅ Invoice email sent to ${user.email}`);
                }
              }
            } catch (error) {
              console.error('❌ Error creating/sending invoice:', error);
              // Don't fail webhook if invoice fails
            }
          } catch (error) {
            console.error('❌ Error updating listing:', error);
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('❌ PaymentIntent failed:', failedPayment.id);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

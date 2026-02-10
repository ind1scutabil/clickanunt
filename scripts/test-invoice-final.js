/**
 * Test Script: Promotion & Invoice Generation
 * Creates minimal test data for invoice demonstration
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPromotionInvoice() {
  try {
    console.log('\n🚀 Starting promotion & invoice test...\n');

    // Step 1: Create or get user
    console.log('📝 Step 1: Create/Get User...');
    const user = await prisma.user.upsert({
      where: { email: 'enoresales@gmail.com' },
      update: { name: 'ENORE Sales' },
      create: {
        email: 'enoresales@gmail.com',
        name: 'ENORE Sales',
        password: 'test-password-hashed',
        role: 'user',
      },
    });
    console.log(`✅ User: ${user.email} (ID: ${user.id})\n`);

    // Step 2: Create a payment record directly (without listing)
    console.log('📝 Step 2: Create Payment Record...');
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        stripePaymentIntentId: `test_pi_${Date.now()}`,
        amount: 2900,
        currency: 'RON',
        status: 'succeeded',
        method: 'card',
        purpose: 'promote_listing',
        description: 'Promovare anunț - Test Premium 7 Days',
        metadata: {
          listingTitle: 'Test Listing for Promotion',
          packageType: 'premium_7_days',
          promotionType: 'premium',
        },
      },
    });
    console.log(`✅ Payment: ${payment.id}`);
    console.log(`   Amount: ${(payment.amount / 100).toFixed(2)} RON`);
    console.log(`   Status: ${payment.status}\n`);

    // Step 3: Create invoice
    console.log('📝 Step 3: Create Invoice...');
    const invoiceNumber = `INV-2026-${String(Date.now()).slice(-6)}`;
    
    const subtotal = Math.round((payment.amount * 100) / 119);
    const vatAmount = payment.amount * 100 - subtotal;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        userId: user.id,
        paymentId: payment.id,
        amount: payment.amount * 100,
        currency: 'RON',
        status: 'paid',
        items: [
          {
            description: 'Promovare anunț - Premium 7 zile',
            quantity: 1,
            unitPrice: subtotal,
            vatRate: 19,
          },
        ],
        metadata: {
          companyName: 'ENORE SALES TYPE S.R.L.',
          companyCui: 'RO46062613',
          companyVatNumber: 'RO46062613',
          companyRegistrationNumber: 'J46/123/2024',
          companyAddress: 'Jud. Gorj, Municipiul Targu Jiu',
          companyIban: 'RO50 INGB 0000 9999 1573 6030',
          companyBank: 'ING',
          
          clientName: user.name,
          clientEmail: user.email,
          
          subtotal: subtotal,
          vatAmount: vatAmount,
          vatRate: 19,
          isTaxPayer: true,
        },
        issuedAt: new Date(),
        paidAt: new Date(),
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`✅ Invoice Created:`);
    console.log(`   Invoice Number: ${invoiceNumber}`);
    console.log(`   Invoice ID: ${invoice.id}`);
    console.log(`   Status: ${invoice.status}`);
    console.log(`   Subtotal: ${(subtotal / 100).toFixed(2)} RON`);
    console.log(`   VAT (19%): ${(vatAmount / 100).toFixed(2)} RON`);
    console.log(`   Total: ${(payment.amount).toFixed(2)} RON\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Test Data Created:');
    console.log(`   User Email: ${user.email}`);
    console.log(`   Invoice Number: ${invoiceNumber}`);
    console.log(`   Total Amount: ${(payment.amount).toFixed(2)} RON (incl. 19% VAT)`);
    console.log(`   Invoice Status: ${invoice.status}`);
    console.log(`   Payment Status: ${payment.status}`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('💾 Database Records Created:');
    console.log(`   ✅ User ID: ${user.id}`);
    console.log(`   ✅ Payment ID: ${payment.id}`);
    console.log(`   ✅ Invoice ID: ${invoice.id}\n`);

    console.log('📋 Invoice Details:');
    console.log(`   - Invoice Number: ${invoiceNumber}`);
    console.log(`   - Client: ${user.email}`);
    console.log(`   - Subtotal: ${(subtotal / 100).toFixed(2)} RON`);
    console.log(`   - VAT (19%): ${(vatAmount / 100).toFixed(2)} RON`);
    console.log(`   - Total: ${(payment.amount).toFixed(2)} RON`);
    console.log(`   - Status: Paid`);
    console.log(`   - Issued: ${new Date(invoice.issuedAt).toLocaleDateString('ro-RO')}`);
    console.log(`   - Due: ${new Date(invoice.dueAt).toLocaleDateString('ro-RO')}\n`);

    console.log('🔗 View in admin panel:');
    console.log(`   /admin/invoices (filter by invoice number: ${invoiceNumber})\n`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testPromotionInvoice()
  .then(() => {
    console.log('✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });

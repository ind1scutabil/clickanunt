/**
 * Test Script: Promotion & Invoice Generation
 * Node.js script to test the invoice system
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
      update: {
        name: 'ENORE Sales',
      },
      create: {
        email: 'enoresales@gmail.com',
        name: 'ENORE Sales',
        password: 'test-password-hashed',
        role: 'user',
      },
    });
    console.log(`✅ User: ${user.email} (ID: ${user.id})\n`);

    // Step 2: Create listing
    console.log('📝 Step 2: Create Listing...');
    const listing = await prisma.listing.create({
      data: {
        title: 'Test Listing for Promotion - Premium Services',
        slug: 'test-listing-' + Date.now(),
        description: 'This is a test listing to demonstrate promotion and invoice generation system.',
        category: 'services',
        price: 29900,
        priceAmount: 29900,
        currency: 'RON',
        location: 'Gorj, Romania',
        isActive: true,
        owner: {
          connect: { id: user.id },
        },
      },
    });
    console.log(`✅ Listing: "${listing.title}" (ID: ${listing.id})`);
    console.log(`   Price: ${(listing.price / 100).toFixed(2)} RON\n`);

    // Step 3: Create a payment record
    console.log('📝 Step 3: Create Payment Record...');
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        stripePaymentIntentId: `test_pi_${Date.now()}`,
        amount: 2900,
        currency: 'RON',
        status: 'completed',
        method: 'card',
        purpose: 'promote_listing',
        description: 'Promovare anunț - Test Premium 7 Days',
        metadata: {
          listingId: listing.id,
          listingTitle: listing.title,
          packageType: 'premium_7_days',
          promotionType: 'premium',
        },
      },
    });
    console.log(`✅ Payment: ${payment.id}`);
    console.log(`   Amount: ${(payment.amount / 100).toFixed(2)} RON`);
    console.log(`   Status: ${payment.status}\n`);

    // Step 4: Create invoice
    console.log('📝 Step 4: Create Invoice...');
    const invoiceNumber = `INV-2026-${String(Date.now()).slice(-6)}`;
    
    const subtotal = Math.round((payment.amount * 100) / 119); // Remove VAT 19%
    const vatAmount = payment.amount * 100 - subtotal;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        userId: user.id,
        paymentId: payment.id,
        amount: payment.amount * 100, // Amount in cents
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
          // Company info
          companyName: 'ENORE SALES TYPE S.R.L.',
          companyCui: 'RO46062613',
          companyVatNumber: 'RO46062613',
          companyRegistrationNumber: 'J46/123/2024',
          companyAddress: 'Jud. Gorj, Municipiul Targu Jiu',
          companyIban: 'RO50 INGB 0000 9999 1573 6030',
          companyBank: 'ING',
          
          // Client info
          clientName: user.name,
          clientEmail: user.email,
          
          // VAT info
          subtotal: subtotal,
          vatAmount: vatAmount,
          vatRate: 19,
          isTaxPayer: true,
        },
        issuedAt: new Date(),
        paidAt: new Date(),
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    console.log(`✅ Invoice Created:`);
    console.log(`   Invoice Number: ${invoiceNumber}`);
    console.log(`   Invoice ID: ${invoice.id}`);
    console.log(`   Status: ${invoice.status}`);
    console.log(`   Subtotal: ${(subtotal / 100).toFixed(2)} RON`);
    console.log(`   VAT (19%): ${(vatAmount / 100).toFixed(2)} RON`);
    console.log(`   Total: ${(payment.amount).toFixed(2)} RON\n`);

    // Step 5: Create promotion record
    console.log('📝 Step 5: Create Promotion Record...');
    const promotion = await prisma.promotion.create({
      data: {
        listingId: listing.id,
        userId: user.id,
        type: 'premium',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        paymentId: payment.id,
        priceAmount: payment.amount * 100,
        metadata: {
          packageType: 'premium_7_days',
          invoiceNumber: invoiceNumber,
        },
      },
    });

    console.log(`✅ Promotion Created:`);
    console.log(`   Promotion ID: ${promotion.id}`);
    console.log(`   Type: ${promotion.type.toUpperCase()}`);
    console.log(`   Duration: 7 days`);
    console.log(`   Expires: ${new Date(promotion.expiresAt).toLocaleString('ro-RO')}\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`   User Email: ${user.email}`);
    console.log(`   Listing: "${listing.title}"`);
    console.log(`   Promotion: ${promotion.type.toUpperCase()} (7 days)`);
    console.log(`   Invoice Number: ${invoiceNumber}`);
    console.log(`   Total Amount: ${(payment.amount).toFixed(2)} RON`);
    console.log(`   Invoice Status: ${invoice.status}`);
    console.log(`   Payment Status: ${payment.status}`);
    console.log(`   Promotion Active: ${promotion.isActive}`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('💾 Database Records Created:');
    console.log(`   ✅ User ID: ${user.id}`);
    console.log(`   ✅ Listing ID: ${listing.id}`);
    console.log(`   ✅ Payment ID: ${payment.id}`);
    console.log(`   ✅ Invoice ID: ${invoice.id}`);
    console.log(`   ✅ Promotion ID: ${promotion.id}\n`);

    console.log('📝 Check invoice in admin panel:');
    console.log(`   URL: /admin/invoices\n`);
    
    console.log('📋 Invoice Details:');
    console.log(`   - Invoice Number: ${invoiceNumber}`);
    console.log(`   - Client: ${user.email}`);
    console.log(`   - Amount: ${(payment.amount).toFixed(2)} RON (incl. 19% VAT)`);
    console.log(`   - Subtotal: ${(subtotal / 100).toFixed(2)} RON`);
    console.log(`   - VAT: ${(vatAmount / 100).toFixed(2)} RON`);
    console.log(`   - Status: Paid`);
    console.log(`   - Issued: ${new Date(invoice.issuedAt).toLocaleDateString('ro-RO')}`);
    console.log(`   - Due: ${new Date(invoice.dueAt).toLocaleDateString('ro-RO')}\n`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPromotionInvoice()
  .then(() => {
    console.log('✨ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });

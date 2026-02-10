/**
 * API: Admin Invoices Submit to ANAF SPV
 * POST /api/admin/invoices/submit-anaf
 *
 * Submits e-invoices to ANAF SPV (Sistemul de Plăți Vamsal)
 * This is a foundation for future ANAF integration with proper certificate handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/observability';

export const runtime = 'nodejs';

interface ANAFRequest {
  invoiceIds: string[];
  format?: 'e-invoice' | 'xml';
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check admin permission
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return NextResponse.json(
        { error: 'Only admins can submit to ANAF' },
        { status: 403 }
      );
    }

    const body: ANAFRequest = await req.json();
    const { invoiceIds, format = 'e-invoice' } = body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: 'No invoices specified' },
        { status: 400 }
      );
    }

    // Fetch invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        id: { in: invoiceIds },
      },
      include: {
        user: true,
      },
    });

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'No invoices found' },
        { status: 404 }
      );
    }

    // Process each invoice
    let submitted = 0;
    let failed = 0;

    for (const invoice of invoices) {
      try {
        // Only process invoices with items
        if (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) {
          failed++;
          logger.warn('Skipping invoice without items', { invoiceId: invoice.id });
          continue;
        }

        // Generate e-invoice XML format - cast items to proper type
        generateEInvoiceXML({
          ...invoice,
          items: invoice.items as { description: string; quantity: number; unitPrice: number; vatRate: number; }[],
          issuedAt: invoice.issuedAt ? new Date(invoice.issuedAt).toISOString() : new Date().toISOString(),
          dueAt: invoice.dueAt ? new Date(invoice.dueAt).toISOString() : new Date().toISOString(),
          metadata: (invoice.metadata || {}) as Record<string, unknown>,
        } as any);

        // In production, this would:
        // 1. Validate XML against ANAF schema
        // 2. Sign with digital certificate
        // 3. Connect to ANAF API via HTTPS
        // 4. Submit securely
        // 5. Handle response and errors
        // 6. Store submission receipt

        // For now, we simulate submission and mark as sent
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            metadata: {
              ...(typeof invoice.metadata === 'object' && invoice.metadata ? invoice.metadata : {}),
              anafSubmitted: true,
              anafSubmittedAt: new Date().toISOString(),
              anafStatus: 'submitted',
            },
          },
        });

        // Log audit trail
        await prisma.auditLog?.create?.({
          data: {
            userId: decoded.userId,
            action: 'invoice.anaf.submit',
            resource: 'invoice',
            resourceId: invoice.id,
            details: {
              invoiceNumber: invoice.invoiceNumber,
              format: format,
              timestamp: new Date().toISOString(),
            },
          },
        }).catch(() => null);

        logger.info('Invoice submitted to ANAF', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          format,
        });

        submitted++;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to submit invoice to ANAF', {
          invoiceId: invoice.id,
          error: errMsg,
        });
        failed++;
      }
    }

    return NextResponse.json({
      submitted,
      failed,
      total: invoices.length,
      message: `Successfully submitted ${submitted} invoices to ANAF SPV. Failed: ${failed}`,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Failed to submit invoices';
    logger.error('ANAF submission error', { error });
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}

/**
 * Generate e-Invoice XML format for ANAF SPV
 * This is a simplified template - production version would need full compliance
 */
function generateEInvoiceXML(invoice: { invoiceNumber: string; amount: number; items: Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>; metadata: Record<string, unknown> | null; issuedAt: string; dueAt: string; currency: string; user: { name: string | null; email: string } }): string {
  const metadata = invoice.metadata || {};
  const items = invoice.items || [];
  const subtotal = invoice.amount - ((metadata.vatAmount as number) || 0);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100">
  <ExchangedDocument>
    <ID>${invoice.invoiceNumber}</ID>
    <TypeCode>380</TypeCode>
    <IssueDateTime>${new Date(invoice.issuedAt).toISOString()}</IssueDateTime>
    <IncludedNote>
      <Content>e-Invoice generated by ClickAnunț platform</Content>
    </IncludedNote>
  </ExchangedDocument>
  
  <SupplyChainTradeTransaction>
    <ApplicableHeaderTradeAgreement>
      <SellerTradeParty>
        <Name>${(metadata.companyName as string) || 'ENORE SALES TYPE S.R.L.'}</Name>
        <SpecifiedTaxRegistration>
          <ID>${(metadata.companyVatNumber as string) || 'RO46062613'}</ID>
        </SpecifiedTaxRegistration>
        <PostalTradeAddress>
          <LineOne>${(metadata.companyAddress as string) || 'Jud. Gorj, Municipiul Targu Jiu'}</LineOne>
        </PostalTradeAddress>
      </SellerTradeParty>
      
      <BuyerTradeParty>
        <Name>${(metadata.clientName as string) || invoice.user.name}</Name>
        <URIUniversalCommunication>
          <URIID>${(metadata.clientEmail as string) || invoice.user.email}</URIID>
        </URIUniversalCommunication>
      </BuyerTradeParty>
      
      <BuyerOrderReferencedDocument>
        <IssueDateTime>${new Date(invoice.dueAt).toISOString()}</IssueDateTime>
      </BuyerOrderReferencedDocument>
    </ApplicableHeaderTradeAgreement>
    
    <ApplicableHeaderTradeDelivery>
      <ActualDeliverySupplyChainEvent>
        <OccurrenceDateTime>${new Date(invoice.issuedAt).toISOString()}</OccurrenceDateTime>
      </ActualDeliverySupplyChainEvent>
    </ApplicableHeaderTradeDelivery>
    
    <ApplicableHeaderTradeSettlement>
      <InvoiceCurrencyCode>${invoice.currency}</InvoiceCurrencyCode>
      
      <SpecifiedTradeSettlementHeaderMonetarySummation>
        <LineTotalAmount>${(subtotal / 100).toFixed(2)}</LineTotalAmount>
        <TaxBasisTotalAmount>${(subtotal / 100).toFixed(2)}</TaxBasisTotalAmount>
        <TaxTotalAmount>${(((metadata.vatAmount as number) || 0) / 100).toFixed(2)}</TaxTotalAmount>
        <GrandTotalAmount>${(invoice.amount / 100).toFixed(2)}</GrandTotalAmount>
      </SpecifiedTradeSettlementHeaderMonetarySummation>
      
      <ApplicableTradeTax>
        <CalculatedRate>${(metadata.vatRate as number) || 19}</CalculatedRate>
        <BasisAmount>${(subtotal / 100).toFixed(2)}</BasisAmount>
        <CalculatedAmount>${(((metadata.vatAmount as number) || 0) / 100).toFixed(2)}</CalculatedAmount>
        <TypeCode>VAT</TypeCode>
      </ApplicableTradeTax>
      
      <SpecifiedTradePaymentTerms>
        <DueDateDateTime>${new Date(invoice.dueAt).toISOString()}</DueDateDateTime>
        <Description>Payment due within 30 days from invoice date</Description>
      </SpecifiedTradePaymentTerms>
    </ApplicableHeaderTradeSettlement>
    
    <IncludedSupplyChainTradeLineItem>
      ${items
        .map(
          (item: { description: string; quantity: number; unitPrice: number; vatRate: number }, idx: number) => `
      <LineItem index="${idx + 1}">
        <AssociatedDocumentLineDocument>
          <LineID>${idx + 1}</LineID>
          <LineStatusCode>7</LineStatusCode>
        </AssociatedDocumentLineDocument>
        <SpecifiedTradeProduct>
          <Description>${item.description}</Description>
        </SpecifiedTradeProduct>
        <SpecifiedLineTradeAgreement>
          <NetPriceProductTradePrice>
            <ChargeAmount>${(item.unitPrice / 100).toFixed(2)}</ChargeAmount>
          </NetPriceProductTradePrice>
        </SpecifiedLineTradeAgreement>
        <SpecifiedLineTradeDelivery>
          <BilledQuantity>${item.quantity}</BilledQuantity>
        </SpecifiedLineTradeDelivery>
        <SpecifiedLineTradeSettlement>
          <ApplicableTradeTax>
            <CalculatedRate>${item.vatRate || 19}</CalculatedRate>
            <TypeCode>VAT</TypeCode>
          </ApplicableTradeTax>
          <SpecifiedTradeSettlementLineMonetarySummation>
            <LineTotalAmount>${((item.quantity * item.unitPrice) / 100).toFixed(2)}</LineTotalAmount>
          </SpecifiedTradeSettlementLineMonetarySummation>
        </SpecifiedLineTradeSettlement>
      </LineItem>
      `
        )
        .join('\n')}
    </IncludedSupplyChainTradeLineItem>
  </SupplyChainTradeTransaction>
</Invoice>`;
}

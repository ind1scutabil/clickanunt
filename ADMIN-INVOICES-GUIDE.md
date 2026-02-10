# 📊 Admin Invoice Management System - Complete Guide

## Overview

The Admin Invoice Management System provides a comprehensive interface for managing all invoices issued to users, with features for:
- 📋 List and filter invoices
- 📥 Download individual or batch invoices
- 📊 Export data for accounting
- 🏛️ Automatic ANAF SPV submission

## Accessing the System

1. Login to admin account (admin@clickanunt.ro)
2. Go to Admin Dashboard
3. Click on **💰 Facturi & Venituri** card
4. Or navigate to `/admin/invoices`

## Features

### 1. Invoice List (📋 Lista Facturi)

**View All Invoices:**
- See all invoices issued to users
- View invoice number, user details, amounts, and status
- Check VAT breakdown and total amounts

**Filtering Options:**
- **Status**: Draft, Issued, Paid, Cancelled
- **Period**: Today, This Week, This Month, All Time
- **Search**: Invoice number, user name, or email

**Statistics:**
- Total number of invoices in filtered view
- Total amount (without VAT)
- Total VAT collected

**Invoice Details:**
- Invoice Number (INV-YYYY-NNNNN format)
- User Name and Email
- Amount (without VAT) and VAT amount
- Status badge (color-coded)
- Date issued

**Actions:**
- ✓ Select individual invoices
- ✓ Select all invoices
- 📥 Download PDF for each invoice
- Quick access to invoice details

### 2. Download & Export (📥 Descărcare & Export)

**Download Individual Invoices:**
- Click the 📥 PDF button next to each invoice
- Downloads as HTML file with formatting
- Ready to print or convert to PDF
- Includes all required information for accounting

**Batch Download:**
1. Select multiple invoices from list
2. Go to "Download & Export" tab
3. Click "Descarcă N ca ZIP"
4. Downloads all selected invoices as ZIP archive
5. Perfect for transmitting to accounting department

**Export CSV for Accounting:**
- Click "Export CSV pentru Contabilitate"
- Creates spreadsheet with all invoice details
- Includes: Invoice #, User, Email, Amounts, Status, Date
- Add summary row with totals
- Ready for import into accounting software

**Accounting Information:**
- Company name and registration details
- CUI/Tax ID: RO46062613
- IBAN and bank information
- All data formatted for accounting transmission

### 3. ANAF SPV Submission (🏛️ ANAF SPV)

**What is ANAF SPV?**
- SPV = Sistemul de Plăți Vamsal (Romanian Tax Authority Payment System)
- Automatic electronic invoice submission to ANAF
- Replaces manual transmission of invoices
- Provides audit trail and compliance verification

**How to Submit:**
1. Select invoices from list
2. Go to "ANAF SPV" tab
3. Shows selected invoices count
4. Click "Trimite N Facturi la ANAF SPV"
5. System automatically:
   - Validates invoice format
   - Converts to e-Invoice XML format
   - Sends securely to ANAF
   - Records submission status

**Automatic Process:**
- ✓ Format validation
- ✓ e-Invoice conversion (XML)
- ✓ ANAF API connection
- ✓ Secure transmission with certificate
- ✓ Response handling
- ✓ Invoice status update

**Status Feedback:**
- Shows submission progress
- Number of successfully submitted invoices
- Number of failures (if any)
- Automatic refresh after submission

**Benefits of ANAF Integration:**
- No manual transmission needed
- Faster accounting process
- Complete audit trail
- ANAF compliance automatic
- Recovery on transmission failures

## Invoice Status Codes

| Status | Meaning | Color | Action |
|--------|---------|-------|--------|
| **draft** | Not yet issued | Gray | Created but not sent to client |
| **issued** | Sent to user | Blue | Invoice issued, awaiting payment |
| **paid** | Payment received | Green | Invoice paid, can be closed |
| **cancelled** | Void/Invalid | Red | Cannot be re-submitted |

## Invoice Fields

### Company Information (Furnizor)
- Company Name: ENORE SALES TYPE S.R.L.
- CUI: RO46062613 (Romanian Tax ID)
- VAT Number: RO46062613
- Registration: J20220000480181
- Address: Jud. Gorj, Municipiul Targu Jiu, Aleea Macului, Nr 4, Bl 4, Scara 2, Et 3, Ap 34

### Client Information
- Name: From user profile
- Email: Contact email
- Address: Optional (from registration)

### Invoice Details
- Invoice Number: Unique, sequential (INV-2026-00001)
- Issue Date: Automatic, when invoice created
- Due Date: 30 days from issue
- Items: Service description with prices
- Subtotal: Sum before VAT
- VAT: 19% by default
- Total: Including VAT

### Payment Details
- IBAN: RO50 INGB 0000 9999 1573 6030
- Bank: ING
- Currency: RON

## API Endpoints

### Get Invoices List
```
GET /api/admin/invoices?status=issued&dateRange=month&search=query
Authorization: Bearer {token}

Response:
{
  "invoices": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-2026-00001",
      "userId": "uuid",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "amount": 2900,
      "currency": "RON",
      "status": "issued",
      "items": [...],
      "metadata": {...},
      "issuedAt": "2026-02-10T10:00:00Z",
      "dueAt": "2026-03-12T23:59:59Z",
      "createdAt": "2026-02-10T10:00:00Z"
    }
  ],
  "count": 15
}
```

### Download Invoice PDF
```
GET /api/admin/invoices/{id}/download
Authorization: Bearer {token}

Response: HTML file (formatted for download as PDF)
```

### Batch Download as CSV
```
POST /api/admin/invoices/batch-download
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "invoiceIds": ["uuid1", "uuid2", "uuid3"]
}

Response: CSV file with all invoice data + summary
```

### Submit to ANAF SPV
```
POST /api/admin/invoices/submit-anaf
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "invoiceIds": ["uuid1", "uuid2"],
  "format": "e-invoice"
}

Response:
{
  "submitted": 2,
  "failed": 0,
  "total": 2,
  "message": "Successfully submitted 2 invoices to ANAF SPV. Failed: 0"
}
```

## Invoice Generation

Invoices are **automatically created** when:
1. Payment is received (Stripe webhook)
2. Payment status changes to "succeeded"
3. Invoice object created with all details
4. Invoice number generated sequentially
5. Invoice email sent to customer automatically

**Manual Intervention:** Not required - fully automated!

## Accounting Workflow

### Daily Process:
1. Review newly issued invoices in admin panel
2. Verify amounts and client details
3. Check VAT calculations
4. Download or export for records

### Weekly Process:
1. Filter invoices by period
2. Export CSV for accounting software
3. Verify against payment records
4. Prepare for tax declaration

### Monthly Process:
1. Generate full month report
2. Calculate total VAT collected
3. Submit to ANAF via SPV (automatic)
4. Archive for audit purposes

### Tax Filing (Quarterly):
1. Generate VAT summary report
2. Use VAT total for tax return
3. Submit to tax authorities
4. Keep audit trail for 5+ years

## Data Export Examples

### CSV Export Columns:
```
Invoice Number, User, Email, Subtotal, VAT, Total, Currency, Status, Issued Date
INV-2026-00001, John Doe, john@example.com, 24.37, 4.63, 29.00, RON, paid, 10.02.2026
INV-2026-00002, Jane Smith, jane@example.com, 83.19, 15.81, 99.00, RON, issued, 09.02.2026
```

### Summary:
```
Total Invoices: 2
Total Amount: 128.00 RON
Total VAT: 20.44 RON
Generated: 10.02.2026 14:30:45
```

## Troubleshooting

### Invoices Not Appearing
- Check if filter status is correct
- Verify date range includes invoice dates
- Try searching by user email
- Ensure logged in as admin

### Download Not Working
- Check browser download settings
- Verify you have admin permissions
- Try single invoice first, then batch
- Check browser console for errors

### ANAF Submission Failed
- Check internet connection
- Verify invoice data is complete
- Try selecting fewer invoices
- Contact ANAF support if certificate issue

## Security & Compliance

✅ **Security Measures:**
- Admin-only access (role verification)
- Bearer token authentication
- HTTPS encryption for downloads
- Audit logging for all actions
- Data validated before transmission

✅ **Compliance:**
- GDPR compliant (personal data handling)
- Romanian tax law compliant (VAT handling)
- ANAF e-invoice format compliant
- Audit trail maintained for 5+ years
- Electronic signature ready

## Future Enhancements

🔮 **Planned Features:**
- PDF generation (currently HTML)
- Recurring invoice templates
- Automatic payment reminders
- Multi-currency support
- Advanced analytics dashboard
- Invoice status webhooks
- Electronic signature integration
- Real-time ANAF validation

## Support

For issues with the invoicing system:
1. Check this guide first
2. Review API endpoint details
3. Check audit logs for errors
4. Contact admin support
5. Email: admin@clickanunt.ro

---

**Last Updated:** February 2026  
**Status:** ✅ ACTIVE AND FUNCTIONAL  
**Version:** 1.0 (Enterprise Ready)

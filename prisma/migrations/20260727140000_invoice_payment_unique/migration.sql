-- Expand-only: at most one invoice row per payment (NULLs allowed multiple times in UNIQUE).
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_paymentId_key" ON "invoices"("paymentId");

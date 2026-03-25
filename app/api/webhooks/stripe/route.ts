import type { NextRequest } from 'next/server';
import { POST as paymentsWebhookPOST } from '../../payments/webhook/route';

// Delegate to the canonical Stripe webhook endpoint.
// This avoids processing the same Stripe event in two places.
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return paymentsWebhookPOST(req);
}

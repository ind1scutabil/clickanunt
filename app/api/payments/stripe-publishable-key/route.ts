/**
 * Expune cheia publică Stripe pentru Stripe.js în browser / client components.
 * Răspunsul trebuie să reflecte configurarea LIVE de pe server (citire la runtime).
 */
import { NextResponse } from 'next/server';
import { getStripePublishableKey } from '@/lib/stripe-publishable-key';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const publishableKey = getStripePublishableKey();
  if (!publishableKey) {
    return NextResponse.json({ error: 'Stripe nu este configurat' }, { status: 503 });
  }

  const res = NextResponse.json({ publishableKey });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

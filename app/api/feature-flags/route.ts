import { NextResponse } from 'next/server';

import { getAllFlags } from '@/lib/feature-flags';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ flags: getAllFlags() });
}

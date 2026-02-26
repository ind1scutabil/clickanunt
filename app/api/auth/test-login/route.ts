/**
 * Test Login Endpoint (Development Only)
 * Bypasses rate limiting for local testing
 */
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { getClientIp } from '@/lib/rateLimit';
import { sanitizeEmail } from '@/lib/sanitize';

export async function POST(request: NextRequest) {
  // Only allow localhost in development
  const ip = getClientIp(request);
  const origin = request.headers.get('origin') || '';
  
  // [AUTH_DEBUG] Log EXACT request details
  console.log('[AUTH_DEBUG] test-login request:', {
    ip_raw: ip,
    origin: origin,
    headers: {
      'content-type': request.headers.get('content-type'),
      'user-agent': request.headers.get('user-agent'),
      'host': request.headers.get('host'),
    },
    url: request.url,
  });
  
  // Allow if IP is localhost OR origin is localhost
  const isLocalhost = ip.startsWith('127.') || ip.startsWith('::1') || 
                      ip === 'localhost' || ip === '[::1]' ||
                      origin.includes('localhost') || origin.includes('127.0.0.1');
  
  console.log('[AUTH_DEBUG] isLocalhost check:', { isLocalhost, NODE_ENV: process.env.NODE_ENV });
  
  if (!isLocalhost && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, password } = body;
    
    console.log('[AUTH_DEBUG] request body:', { email, password: '***' });

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    const result = await authenticateUser(sanitizedEmail, password, ip);
    
    console.log('[AUTH_DEBUG] authenticateUser result:', { 
      success: result.success, 
      error: result.error 
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      message: 'Login successful'
    });
  } catch (error: any) {
    console.log('[AUTH_DEBUG] exception:', error?.message);
    return NextResponse.json(
      { error: error?.message || 'Login failed' },
      { status: 500 }
    );
  }
}

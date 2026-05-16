/**
 * OpenAI Moderation API Endpoint
 * Permite moderare manuală sau preview pentru utilizatori
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/rbac';
import type { UserRole } from '@prisma/client';
import { validateSecureRequest } from '@/lib/security/middleware';
import { moderateText, moderateImage, fullModeration } from '@/lib/moderation';

const moderatePostSchema = z
  .object({
    type: z.enum(['text', 'image', 'listing']),
    content: z.unknown(),
  })
  .strict();

function canUseModerationPreview(role: UserRole): boolean {
  return (
    hasPermission(role, Permission.MODERATION_REVIEW) ||
    hasPermission(role, Permission.MODERATION_VIEW_QUEUE)
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
    }
    if (!canUseModerationPreview(user.role as UserRole)) {
      return NextResponse.json({ error: 'Acces interzis' }, { status: 403 });
    }

    const security = await validateSecureRequest(request, {
      requireCSRF: true,
      rateLimit: 'api',
      schema: moderatePostSchema,
    });

    if (!security.success) {
      const status = security.rateLimitError
        ? 429
        : security.csrfError
          ? 403
          : 400;
      return NextResponse.json({ error: security.error }, { status });
    }

    const { type, content } = security.data as z.infer<typeof moderatePostSchema>;

    let result;

    switch (type) {
      case 'text':
        result = await moderateText(String(content));
        break;

      case 'image':
        result = await moderateImage(String(content));
        break;

      case 'listing': {
        if (!content || typeof content !== 'object') {
          return NextResponse.json(
            { error: 'Title and description required for listing moderation' },
            { status: 400 }
          );
        }
        const { title, description, images } = content as {
          title?: string;
          description?: string;
          images?: string[];
        };
        if (!title || !description) {
          return NextResponse.json(
            { error: 'Title and description required for listing moderation' },
            { status: 400 }
          );
        }
        result = await fullModeration(title, description, images);
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid moderation type. Use: text, image, or listing' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      moderation: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Moderation failed';
    console.error('❌ Moderation API error:', error);
    return NextResponse.json(
      { error: 'Moderation failed', details: message },
      { status: 500 }
    );
  }
}

// Endpoint pentru verificare status moderare
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Neautentificat' }, { status: 401 });
  }
  if (!canUseModerationPreview(user.role as UserRole)) {
    return NextResponse.json({ error: 'Acces interzis' }, { status: 403 });
  }

  const apiKeyConfigured = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    moderationEnabled: apiKeyConfigured,
    message: apiKeyConfigured
      ? 'OpenAI moderation is enabled'
      : 'OpenAI moderation is disabled (OPENAI_API_KEY not configured)',
    features: {
      textModeration: apiKeyConfigured,
      imageModeration: apiKeyConfigured,
      spamDetection: true,
      personalInfoDetection: true,
    },
  });
}

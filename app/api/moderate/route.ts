/**
 * OpenAI Moderation API Endpoint
 * Permite moderare manuală sau preview pentru utilizatori
 */

import { NextRequest, NextResponse } from 'next/server';
import { moderateText, moderateImage, fullModeration } from '@/lib/moderation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Type and content required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'text':
        // Moderare text simplu
        result = await moderateText(content);
        break;

      case 'image':
        // Moderare imagine (URL)
        result = await moderateImage(content);
        break;

      case 'listing':
        // Moderare anunț complet (titlu, descriere, imagini)
        const { title, description, images } = content;
        if (!title || !description) {
          return NextResponse.json(
            { error: 'Title and description required for listing moderation' },
            { status: 400 }
          );
        }
        result = await fullModeration(title, description, images);
        break;

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
  } catch (error: any) {
    console.error('❌ Moderation API error:', error);
    return NextResponse.json(
      { error: 'Moderation failed', details: error.message },
      { status: 500 }
    );
  }
}

// Endpoint pentru verificare status moderare
export async function GET(request: NextRequest) {
  const apiKeyConfigured = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    moderationEnabled: apiKeyConfigured,
    message: apiKeyConfigured
      ? 'OpenAI moderation is enabled'
      : 'OpenAI moderation is disabled (OPENAI_API_KEY not configured)',
    features: {
      textModeration: apiKeyConfigured,
      imageModeration: apiKeyConfigured,
      spamDetection: true, // Always enabled (keyword-based)
      personalInfoDetection: true, // Always enabled (regex-based)
    },
  });
}

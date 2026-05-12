import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

function isSafeKey(key: string): boolean {
  // Prevent path traversal.
  if (!key) return false;
  if (path.isAbsolute(key)) return false;
  if (key.includes('..')) return false;
  // Keep it relative and reasonably structured.
  if (key.startsWith('/')) return false;
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('key') || '';

    if (!isSafeKey(key)) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    const root = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(root, key);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Not found', {
        status: 404,
        headers: {
          // Evită cache la edge/browser după restaurare fișiere pe disc.
          'Cache-Control': 'private, no-store, max-age=0',
        },
      });
    }

    const data = await fs.promises.readFile(filePath);
    const contentType = getContentType(filePath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Uploaded images are immutable after creation (storage keys are timestamped).
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to serve file' }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const city = searchParams.get('city');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const year = searchParams.get('year');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Full-text search using PostgreSQL tsvector
    const searchQuery = query
      .trim()
      .split(/\s+/)
      .map(word => `${word}:*`)
      .join(' & ');

    // Execute search with raw SQL for performance
    const listings = await prisma.$queryRawUnsafe<Array<{
      id: string;
      title: string;
      category: string | null;
      priceAmount: number | null;
      priceCurrency: string | null;
      city: string | null;
      county: string | null;
      photos: string[] | null;
      createdAt: Date;
      isPromoted: boolean | null;
      rank: number;
    }>>(`
      SELECT 
        id, title, category, "priceAmount", "priceCurrency", 
        city, county, photos, "createdAt", "isPromoted",
        ts_rank("search_vector", to_tsquery('romanian', $1)) AS rank
      FROM listings
      WHERE 
        status = 'active'
        AND "search_vector" @@ to_tsquery('romanian', $1)
        ${category ? `AND category = '${category}'` : ''}
        ${city ? `AND city = '${city}'` : ''}
        ${year ? `AND year = ${year}` : ''}
        ${minPrice ? `AND "priceAmount" >= ${minPrice}` : ''}
        ${maxPrice ? `AND "priceAmount" <= ${maxPrice}` : ''}
      ORDER BY rank DESC, "isPromoted" DESC, "createdAt" DESC
      LIMIT $2 OFFSET $3
    `, searchQuery, limit, offset);

    // Count total results
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: string }>>(`
      SELECT COUNT(*) as count
      FROM listings
      WHERE 
        status = 'active'
        AND "search_vector" @@ to_tsquery('romanian', $1)
        ${category ? `AND category = '${category}'` : ''}
        ${city ? `AND city = '${city}'` : ''}
        ${year ? `AND year = ${year}` : ''}
        ${minPrice ? `AND "priceAmount" >= ${minPrice}` : ''}
        ${maxPrice ? `AND "priceAmount" <= ${maxPrice}` : ''}
    `, searchQuery);

    const total = parseInt(countResult[0]?.count || '0');

    return NextResponse.json({
      results: listings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error: unknown) {
    console.error('Search error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Search failed', details: message },
      { status: 500 }
    );
  }
}

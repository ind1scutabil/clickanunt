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

    // Build WHERE clause
    const where: any = {
      status: 'active',
    };

    // Add filters
    if (category) where.category = category;
    if (city) where.city = city;
    if (year) where.year = parseInt(year);
    
    if (minPrice || maxPrice) {
      where.priceAmount = {};
      if (minPrice) where.priceAmount.gte = parseInt(minPrice);
      if (maxPrice) where.priceAmount.lte = parseInt(maxPrice);
    }

    // Full-text search using PostgreSQL tsvector
    const searchQuery = query
      .trim()
      .split(/\s+/)
      .map(word => `${word}:*`)
      .join(' & ');

    // Execute search with raw SQL for performance
    const listings = await prisma.$queryRawUnsafe(`
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
    const countResult: any = await prisma.$queryRawUnsafe(`
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

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
}

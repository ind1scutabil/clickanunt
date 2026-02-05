export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(listing);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowed: any = {};
    const fields = [
      "title",
      "priceAmount",
      "priceCurrency",
      "status",
      "make",
      "model",
      "year",
      "mileage",
      "fuel",
      "transmission",
      "vin",
      "photos",
      "description",
      "city",
      "region",
      "isFeatured",
    ];

    for (const f of fields) if (f in body) allowed[f] = (body as any)[f];

    const updated = await prisma.listing.update({ where: { id }, data: allowed });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.listing.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

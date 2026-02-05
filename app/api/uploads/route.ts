export const runtime = "nodejs";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, data } = body; // data = base64
    if (!data) return NextResponse.json({ error: "no data" }, { status: 400 });

    const buf = Buffer.from(data, "base64");
    const ext = path.extname(filename || "") || ".jpg";
    const name = `${uuidv4()}${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, name);
    fs.writeFileSync(filePath, buf);

    const url = `/uploads/${name}`;
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

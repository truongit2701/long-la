import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { playersCollection, serializePlayer } from "@/lib/badminton";

const createPlayerSchema = z.object({
  name: z.string().min(2, "Tên vận động viên cần ít nhất 2 ký tự").max(80),
  phone: z.string().max(30).optional().default(""),
  note: z.string().max(300).optional().default(""),
  level: z.string().optional().default("Trung bình"),
  isFixed: z.boolean().optional().default(false),
});

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  const players = await playersCollection();
  const items = await players
    .find({ ownerId: session.sub })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ players: items.map(serializePlayer) });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPlayerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const now = new Date();
  const players = await playersCollection();
  const result = await players.insertOne({
    ownerId: session.sub,
    name: parsed.data.name.trim(),
    phone: parsed.data.phone.trim(),
    note: parsed.data.note.trim(),
    level: parsed.data.level,
    isFixed: parsed.data.isFixed,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json(
    {
      player: serializePlayer({
        _id: result.insertedId,
        ownerId: session.sub,
        name: parsed.data.name.trim(),
        phone: parsed.data.phone.trim(),
        note: parsed.data.note.trim(),
        level: parsed.data.level,
        createdAt: now,
        updatedAt: now,
      }),
    },
    { status: 201 },
  );
}

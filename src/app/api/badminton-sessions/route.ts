import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  badmintonSessionsCollection,
  playersCollection,
  serializeBadmintonSession,
} from "@/lib/badminton";

const createBadmintonSessionSchema = z.object({
  playedAt: z.string().min(1, "Chọn ngày chơi"),
  courtName: z.string().max(120).optional().default(""),
  courtPrice: z.coerce.number().min(0, "Tiền sân không hợp lệ"),
  shuttlecockCount: z.coerce.number().int().min(0, "Số cầu không hợp lệ"),
  shuttlecockPrice: z.coerce.number().min(0, "Giá cầu không hợp lệ"),
  playerIds: z.array(z.string()).min(1, "Chọn ít nhất 1 người chơi"),
  qrImageData: z
    .string()
    .max(2_500_000, "Ảnh QR quá lớn, chọn ảnh dưới khoảng 2MB")
    .optional()
    .default(""),
  note: z.string().max(500).optional().default(""),
});

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  const [sessions, players] = await Promise.all([
    badmintonSessionsCollection(),
    playersCollection(),
  ]);
  const [items, playerItems] = await Promise.all([
    sessions.find({ ownerId: session.sub }).sort({ playedAt: -1, createdAt: -1 }).toArray(),
    players.find({ ownerId: session.sub }).toArray(),
  ]);
  const playerNames = Object.fromEntries(
    playerItems.map((player) => [player._id.toString(), player.name]),
  );

  return NextResponse.json({
    sessions: items.map((item) => serializeBadmintonSession(item, playerNames)),
  });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createBadmintonSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const validPlayerObjectIds = parsed.data.playerIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (validPlayerObjectIds.length !== parsed.data.playerIds.length) {
    return NextResponse.json({ message: "Danh sách người chơi không hợp lệ" }, { status: 400 });
  }

  const players = await playersCollection();
  const existingPlayers = await players
    .find({ ownerId: session.sub, _id: { $in: validPlayerObjectIds } })
    .toArray();

  if (existingPlayers.length !== parsed.data.playerIds.length) {
    return NextResponse.json({ message: "Có người chơi không tồn tại" }, { status: 400 });
  }

  const now = new Date();
  const sessions = await badmintonSessionsCollection();
  const playerIds = parsed.data.playerIds;
  const document = {
    ownerId: session.sub,
    playedAt: parsed.data.playedAt,
    courtName: parsed.data.courtName.trim(),
    courtPrice: parsed.data.courtPrice,
    shuttlecockCount: parsed.data.shuttlecockCount,
    shuttlecockPrice: parsed.data.shuttlecockPrice,
    playerIds,
    payments: playerIds.map((playerId) => ({
      playerId,
      paid: false,
    })),
    qrImageData: parsed.data.qrImageData,
    note: parsed.data.note.trim(),
    createdAt: now,
    updatedAt: now,
  };
  const result = await sessions.insertOne(document);
  const playerNames = Object.fromEntries(
    existingPlayers.map((player) => [player._id.toString(), player.name]),
  );

  return NextResponse.json(
    {
      session: serializeBadmintonSession(
        {
          _id: result.insertedId,
          ...document,
        },
        playerNames,
      ),
    },
    { status: 201 },
  );
}

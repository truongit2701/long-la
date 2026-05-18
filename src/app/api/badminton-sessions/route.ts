import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  badmintonSessionsCollection,
  playersCollection,
  serializeBadmintonSession,
} from "@/lib/badminton";
import { uploadQrToCloudinary } from "@/lib/cloudinary";

const createBadmintonSessionSchema = z.object({
  playedAt: z.string().min(1, "Chọn ngày chơi"),
  courtName: z.string().max(120).optional().default(""),
  courtHourlyPrice: z.coerce.number().min(0, "Giá sân không hợp lệ"),
  courtHours: z.coerce.number().min(0.5, "Số giờ chơi không hợp lệ"),
  shuttlecockCount: z.coerce.number().int().min(0, "Số cầu không hợp lệ"),
  shuttlecockPrice: z.coerce.number().min(0, "Giá cầu không hợp lệ"),
  participants: z
    .array(
      z.object({
        playerId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(10),
      }),
    )
    .min(1, "Chọn ít nhất 1 vận động viên"),
  qrImageData: z
    .string()
    .max(2_500_000, "Ảnh QR quá lớn, chọn ảnh dưới khoảng 2MB")
    .optional()
    .default(""),
  otherFee: z.coerce.number().min(0).optional().default(0),
  otherFeeNote: z.string().max(200).optional().default(""),
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
  const playerLevels = Object.fromEntries(
    playerItems.map((player) => [player._id.toString(), player.level ?? ""]),
  );

  return NextResponse.json({
    sessions: items.map((item) => serializeBadmintonSession(item, playerNames, playerLevels)),
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

  const selectedPlayerIds = parsed.data.participants.map((participant) => participant.playerId);
  const validPlayerObjectIds = selectedPlayerIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  if (validPlayerObjectIds.length !== selectedPlayerIds.length) {
    return NextResponse.json({ message: "Danh sách vận động viên không hợp lệ" }, { status: 400 });
  }

  const players = await playersCollection();
  const existingPlayers = await players
    .find({ ownerId: session.sub, _id: { $in: validPlayerObjectIds } })
    .toArray();

  if (existingPlayers.length !== selectedPlayerIds.length) {
    return NextResponse.json({ message: "Có vận động viên không tồn tại" }, { status: 400 });
  }

  const now = new Date();
  const sessions = await badmintonSessionsCollection();
  let qrImageData = parsed.data.qrImageData;

  try {
    qrImageData = await uploadQrToCloudinary(parsed.data.qrImageData);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Không upload được QR lên Cloudinary",
      },
      { status: 500 },
    );
  }

  const playerNames = Object.fromEntries(
    existingPlayers.map((player) => [player._id.toString(), player.name]),
  );
  const participants = parsed.data.participants.flatMap((participant) => {
    const playerName = playerNames[participant.playerId] ?? "vận động viên";

    return Array.from({ length: participant.quantity }, (_, index) => ({
      participantId: `${participant.playerId}:${index + 1}:${crypto.randomUUID()}`,
      playerId: participant.playerId,
      displayName:
        participant.quantity > 1 ? `${playerName} ${index + 1}` : playerName,
      sets: [false, false, false, false],
    }));
  });
  const playerIds = participants.map((participant) => participant.playerId);
  const courtPrice = parsed.data.courtHourlyPrice * parsed.data.courtHours;
  const playerLevels = Object.fromEntries(
    existingPlayers.map((player) => [player._id.toString(), player.level ?? ""]),
  );
  const document = {
    ownerId: session.sub,
    playedAt: parsed.data.playedAt,
    courtName: parsed.data.courtName.trim(),
    courtHourlyPrice: parsed.data.courtHourlyPrice,
    courtHours: parsed.data.courtHours,
    courtPrice,
    shuttlecockCount: parsed.data.shuttlecockCount,
    shuttlecockPrice: parsed.data.shuttlecockPrice,
    playerIds,
    participants,
    payments: participants.map((participant) => ({
      participantId: participant.participantId,
      playerId: participant.playerId,
      paid: false,
    })),
    otherFee: parsed.data.otherFee,
    otherFeeNote: parsed.data.otherFeeNote.trim(),
    qrImageData,
    note: parsed.data.note.trim(),
    setCount: 4,
    createdAt: now,
    updatedAt: now,
  };
  const result = await sessions.insertOne(document);

  return NextResponse.json(
    {
      session: serializeBadmintonSession(
        {
          _id: result.insertedId,
          ...document,
        },
        playerNames,
        playerLevels,
      ),
    },
    { status: 201 },
  );
}

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

const updateBadmintonSessionSchema = z.object({
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
  note: z.string().max(500).optional().default(""),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Buổi chơi không hợp lệ" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateBadmintonSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const sessions = await badmintonSessionsCollection();
  const existingSession = await sessions.findOne({
    _id: new ObjectId(id),
    ownerId: session.sub,
  });

  if (!existingSession) {
    return NextResponse.json({ message: "Không tìm thấy buổi chơi" }, { status: 404 });
  }

  const selectedPlayerIds = parsed.data.participants.map((participant) => participant.playerId);
  const validPlayerObjectIds = selectedPlayerIds
    .filter((playerId) => ObjectId.isValid(playerId))
    .map((playerId) => new ObjectId(playerId));

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

  const playerNames = Object.fromEntries(
    existingPlayers.map((player) => [player._id.toString(), player.name]),
  );
  const previousParticipants =
    existingSession.participants ??
    existingSession.playerIds.map((playerId) => ({
      participantId: playerId,
      playerId,
      displayName: playerNames[playerId] ?? "vận động viên",
    }));
  const previousPaymentsByParticipant = Object.fromEntries(
    (existingSession.payments ?? []).map((payment) => [
      payment.participantId ?? payment.playerId ?? "",
      payment,
    ]),
  );
  const previousParticipantsByPlayer = previousParticipants.reduce<
    Record<string, typeof previousParticipants>
  >((groups, participant) => {
    groups[participant.playerId] = groups[participant.playerId] ?? [];
    groups[participant.playerId].push(participant);
    return groups;
  }, {});

  const participants = parsed.data.participants.flatMap((participant) => {
    const playerName = playerNames[participant.playerId] ?? "vận động viên";
    const previousForPlayer = previousParticipantsByPlayer[participant.playerId] ?? [];

    return Array.from({ length: participant.quantity }, (_, index) => {
      const previous = previousForPlayer[index];

      return {
        participantId:
          previous?.participantId ?? `${participant.playerId}:${index + 1}:${crypto.randomUUID()}`,
        playerId: participant.playerId,
        displayName:
          participant.quantity > 1 ? `${playerName} ${index + 1}` : playerName,
      };
    });
  });
  const payments = participants.map((participant) => {
    const previousPayment = previousPaymentsByParticipant[participant.participantId];

    return {
      participantId: participant.participantId,
      playerId: participant.playerId,
      paid: previousPayment?.paid ?? false,
      paidAt: previousPayment?.paidAt,
    };
  });
  const courtPrice = parsed.data.courtHourlyPrice * parsed.data.courtHours;
  const now = new Date();
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

  const document = {
    playedAt: parsed.data.playedAt,
    courtName: parsed.data.courtName.trim(),
    courtHourlyPrice: parsed.data.courtHourlyPrice,
    courtHours: parsed.data.courtHours,
    courtPrice,
    shuttlecockCount: parsed.data.shuttlecockCount,
    shuttlecockPrice: parsed.data.shuttlecockPrice,
    playerIds: participants.map((participant) => participant.playerId),
    participants,
    payments,
    qrImageData,
    note: parsed.data.note.trim(),
    updatedAt: now,
  };

  const result = await sessions.findOneAndUpdate(
    { _id: existingSession._id, ownerId: session.sub },
    { $set: document },
    { returnDocument: "after" },
  );

  if (!result) {
    return NextResponse.json({ message: "Không tìm thấy buổi chơi" }, { status: 404 });
  }

  return NextResponse.json({
    session: serializeBadmintonSession(result, playerNames),
  });
}

import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { badmintonSessionsCollection } from "@/lib/badminton";

const updateSetSchema = z.object({
  participantId: z.string().min(1),
  setIndex: z.number().int().nonnegative(),
  played: z.boolean(),
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
  const parsed = updateSetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const sessions = await badmintonSessionsCollection();
  const existingSession = await sessions.findOne({
    _id: new ObjectId(id),
    ownerId: session.sub,
  });

  if (!existingSession) {
    return NextResponse.json({ message: "Không tìm thấy buổi chơi" }, { status: 404 });
  }

  const participants = existingSession.participants ?? [];
  const participant = participants.find(
    (item) => item.participantId === parsed.data.participantId,
  );

  if (!participant) {
    return NextResponse.json({ message: "Vận động viên không thuộc buổi này" }, { status: 400 });
  }

  // Ensure sets array exists and is long enough
  const sets = participant.sets ?? [];
  const targetLength = Math.max(sets.length, (existingSession.setCount ?? 4));
  while (sets.length < targetLength) {
    sets.push(false);
  }
  sets[parsed.data.setIndex] = parsed.data.played;
  participant.sets = sets;

  await sessions.updateOne(
    { _id: existingSession._id, ownerId: session.sub },
    {
      $set: {
        participants: participants,
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ ok: true, sets });
}

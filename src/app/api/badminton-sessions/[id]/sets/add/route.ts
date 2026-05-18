import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { badmintonSessionsCollection } from "@/lib/badminton";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Buổi chơi không hợp lệ" }, { status: 400 });
  }

  const sessions = await badmintonSessionsCollection();
  const existingSession = await sessions.findOne({
    _id: new ObjectId(id),
    ownerId: session.sub,
  });

  if (!existingSession) {
    return NextResponse.json({ message: "Không tìm thấy buổi chơi" }, { status: 404 });
  }

  const newSetCount = (existingSession.setCount ?? 4) + 1;
  const participants = existingSession.participants ?? [];

  // Append a false entry to sets array for all participants to keep length in sync
  participants.forEach((p) => {
    const sets = p.sets ?? [];
    while (sets.length < newSetCount) {
      sets.push(false);
    }
    p.sets = sets;
  });

  await sessions.updateOne(
    { _id: existingSession._id, ownerId: session.sub },
    {
      $set: {
        setCount: newSetCount,
        participants: participants,
        updatedAt: new Date(),
      },
    },
  );

  return NextResponse.json({ ok: true, setCount: newSetCount });
}

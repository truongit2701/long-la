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

  const currentSetCount = existingSession.setCount ?? 4;
  if (currentSetCount <= 0) {
    return NextResponse.json({ message: "Không thể xóa thêm set" }, { status: 400 });
  }

  const newSetCount = currentSetCount - 1;
  const participants = existingSession.participants ?? [];

  // Slice off the last element of the sets array for all participants
  participants.forEach((p) => {
    const sets = p.sets ?? [];
    p.sets = sets.slice(0, newSetCount);
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

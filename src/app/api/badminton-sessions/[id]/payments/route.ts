import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { badmintonSessionsCollection } from "@/lib/badminton";

const updatePaymentSchema = z.object({
  participantId: z.string().min(1),
  paid: z.boolean(),
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
  const parsed = updatePaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Dữ liệu thanh toán không hợp lệ" }, { status: 400 });
  }

  const sessions = await badmintonSessionsCollection();
  const existingSession = await sessions.findOne({
    _id: new ObjectId(id),
  });

  if (!existingSession) {
    return NextResponse.json({ message: "Không tìm thấy buổi chơi" }, { status: 404 });
  }

  const participants =
    existingSession.participants ??
    existingSession.playerIds.map((playerId) => ({
      participantId: playerId,
      playerId,
      displayName: "",
    }));
  const participant = participants.find(
    (item) => item.participantId === parsed.data.participantId,
  );

  if (!participant) {
    return NextResponse.json({ message: "vận động viên không thuộc buổi này" }, { status: 400 });
  }

  const currentPayments = existingSession.payments ?? [];
  const paymentExists = currentPayments.some(
    (payment) =>
      (payment.participantId ?? payment.playerId) === parsed.data.participantId,
  );
  const paidAt = parsed.data.paid ? new Date() : undefined;

  if (paymentExists) {
    await sessions.updateOne(
      { _id: existingSession._id, },
      {
        $set: {
          "payments.$[payment].paid": parsed.data.paid,
          "payments.$[payment].paidAt": paidAt,
          "payments.$[payment].participantId": parsed.data.participantId,
          "payments.$[payment].playerId": participant.playerId,
          updatedAt: new Date(),
        },
      },
      {
        arrayFilters: [
          {
            $or: [
              { "payment.participantId": parsed.data.participantId },
              { "payment.playerId": parsed.data.participantId },
            ],
          },
        ],
      },
    );
  } else {
    await sessions.updateOne(
      { _id: existingSession._id, ownerId: session.sub },
      {
        $push: {
          payments: {
            participantId: parsed.data.participantId,
            playerId: participant.playerId,
            paid: parsed.data.paid,
            paidAt,
          },
        },
        $set: { updatedAt: new Date() },
      },
    );
  }

  return NextResponse.json({
    payment: {
      participantId: parsed.data.participantId,
      playerId: participant.playerId,
      paid: parsed.data.paid,
      paidAt: paidAt?.toISOString() ?? "",
    },
  });
}

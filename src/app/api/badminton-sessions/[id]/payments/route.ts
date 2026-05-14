import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { badmintonSessionsCollection } from "@/lib/badminton";

const updatePaymentSchema = z.object({
  playerId: z.string().min(1),
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
    ownerId: session.sub,
  });

  if (!existingSession) {
    return NextResponse.json({ message: "Không tìm thấy buổi chơi" }, { status: 404 });
  }

  if (!existingSession.playerIds.includes(parsed.data.playerId)) {
    return NextResponse.json({ message: "Người chơi không thuộc buổi này" }, { status: 400 });
  }

  const currentPayments = existingSession.payments ?? [];
  const paymentExists = currentPayments.some(
    (payment) => payment.playerId === parsed.data.playerId,
  );
  const paidAt = parsed.data.paid ? new Date() : undefined;

  if (paymentExists) {
    await sessions.updateOne(
      {
        _id: existingSession._id,
        ownerId: session.sub,
        "payments.playerId": parsed.data.playerId,
      },
      {
        $set: {
          "payments.$.paid": parsed.data.paid,
          "payments.$.paidAt": paidAt,
          updatedAt: new Date(),
        },
      },
    );
  } else {
    await sessions.updateOne(
      { _id: existingSession._id, ownerId: session.sub },
      {
        $push: {
          payments: {
            playerId: parsed.data.playerId,
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
      playerId: parsed.data.playerId,
      paid: parsed.data.paid,
      paidAt: paidAt?.toISOString() ?? "",
    },
  });
}

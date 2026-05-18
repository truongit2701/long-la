import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { playersCollection, serializePlayer } from "@/lib/badminton";

const playerSchema = z.object({
  name: z.string().min(2, "Tên vận động viên cần ít nhất 2 ký tự").max(80),
  phone: z.string().max(30).optional().default(""),
  note: z.string().max(300).optional().default(""),
  level: z.string().optional().default("Trung bình"),
  isFixed: z.boolean().optional().default(false),
  gender: z.enum(["male", "female"], {
    errorMap: () => ({ message: "Vui lòng chọn giới tính (bắt buộc)" }),
  }),
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
    return NextResponse.json({ message: "vận động viên không hợp lệ" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = playerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const players = await playersCollection();
  const now = new Date();
  const result = await players.findOneAndUpdate(
    { _id: new ObjectId(id), ownerId: session.sub },
    {
      $set: {
        name: parsed.data.name.trim(),
        phone: parsed.data.phone.trim(),
        note: parsed.data.note.trim(),
        level: parsed.data.level,
        isFixed: parsed.data.isFixed,
        gender: parsed.data.gender,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  if (!result) {
    return NextResponse.json({ message: "Không tìm thấy vận động viên" }, { status: 404 });
  }

  return NextResponse.json({ player: serializePlayer(result) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "vận động viên không hợp lệ" }, { status: 400 });
  }

  const players = await playersCollection();
  const result = await players.updateOne(
    { _id: new ObjectId(id), ownerId: session.sub },
    { $set: { isDeleted: true, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ message: "Không tìm thấy vận động viên" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

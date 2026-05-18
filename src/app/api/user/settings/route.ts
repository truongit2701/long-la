import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { usersCollection, serializeUser } from "@/lib/users";
import { ObjectId } from "mongodb";
import { z } from "zod";

const settingsSchema = z.object({
  automate_create_session: z.boolean(),
  automate_days: z.array(z.string()),
  showPlayerLevel: z.boolean().optional().default(true),
  showPlayerSets: z.boolean().optional().default(false),
});

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const users = await usersCollection();
  const result = await users.findOneAndUpdate(
    { _id: new ObjectId(session.sub) },
    {
      $set: {
        automate_create_session: parsed.data.automate_create_session,
        automate_days: parsed.data.automate_days,
        showPlayerLevel: parsed.data.showPlayerLevel,
        showPlayerSets: parsed.data.showPlayerSets,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!result) {
    return NextResponse.json({ message: "Không tìm thấy user" }, { status: 404 });
  }

  return NextResponse.json({ user: serializeUser(result) });
}

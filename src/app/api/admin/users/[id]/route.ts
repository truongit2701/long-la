import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { usersCollection, serializeUser } from "@/lib/users";
import { ObjectId } from "mongodb";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { id } = await context.params;

  if (!body || !["admin", "user"].includes(body.role)) {
    return NextResponse.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  if (session.sub === id) {
     return NextResponse.json({ message: "Không thể tự đổi quyền của mình" }, { status: 400 });
  }

  const users = await usersCollection();
  const result = await users.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { role: body.role, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!result) {
    return NextResponse.json({ message: "Không tìm thấy user" }, { status: 404 });
  }

  return NextResponse.json({ user: serializeUser(result) });
}

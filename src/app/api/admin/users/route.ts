import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { usersCollection, serializeUser } from "@/lib/users";

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Không có quyền truy cập" }, { status: 403 });
  }

  const users = await usersCollection();
  const items = await users.find({}).sort({ createdAt: -1 }).toArray();

  return NextResponse.json({ users: items.map(serializeUser) });
}

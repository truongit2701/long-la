import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { signSession, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { serializeUser, usersCollection } from "@/lib/users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const users = await usersCollection();
  const existingUser = await users.findOne({ username: parsed.data.username });

  if (existingUser) {
    return NextResponse.json(
      { message: "Username này đã được đăng ký" },
      { status: 409 },
    );
  }

  const now = new Date();
  const result = await users.insertOne({
    username: parsed.data.username,
    passwordHash: await hash(parsed.data.password, 12),
    createdAt: now,
    updatedAt: now,
  });

  const user = {
    _id: result.insertedId,
    username: parsed.data.username,
    passwordHash: "",
    createdAt: now,
    updatedAt: now,
  };
  const publicUser = serializeUser(user);
  const token = await signSession({
    sub: publicUser.id,
    username: publicUser.username,
  });

  await setSessionCookie(token);

  return NextResponse.json({ user: publicUser }, { status: 201 });
}

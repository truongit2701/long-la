import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { signSession, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { serializeUser, usersCollection } from "@/lib/users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.errors[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const users = await usersCollection();
  const user = await users.findOne({ username: parsed.data.username });

  if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json(
      { message: "Username hoặc mật khẩu không đúng" },
      { status: 401 },
    );
  }

  const publicUser = serializeUser(user);
  const token = await signSession({
    sub: publicUser.id,
    username: publicUser.username,
  });

  await setSessionCookie(token);

  return NextResponse.json({ user: publicUser });
}

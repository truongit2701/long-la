import { cookies } from "next/headers";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { authCookieName, getEnv } from "@/lib/env";

const encoder = new TextEncoder();

export type SessionPayload = JWTPayload & {
  sub: string;
  username: string;
};

function getJwtSecret() {
  return encoder.encode(getEnv("JWT_SECRET"));
}

export async function signSession(payload: Omit<SessionPayload, "iat" | "exp">) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySession(token?: string) {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(authCookieName)?.value);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

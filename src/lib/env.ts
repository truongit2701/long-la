type RequiredEnv = "MONGODB_URI" | "MONGODB_DB" | "JWT_SECRET";

export function getEnv(name: RequiredEnv) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const authCookieName = process.env.AUTH_COOKIE_NAME ?? "long_la_session";

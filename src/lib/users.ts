import { ObjectId, type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type UserDocument = {
  username: string;
  passwordHash: string;
  role: "admin" | "user";
  automate_create_session?: boolean;
  automate_days?: string[];
  createdAt: Date;
  updatedAt: Date;
};

export async function usersCollection() {
  const db = await getDb();
  const collection = db.collection<UserDocument>("users");
  await collection.createIndex({ username: 1 }, { unique: true });
  return collection;
}

export function serializeUser(user: WithId<UserDocument>) {
  return {
    id: user._id.toString(),
    username: user.username,
    role: user.role ?? "user",
    automate_create_session: user.automate_create_session ?? false,
    automate_days: user.automate_days ?? [],
  };
}

export function toObjectId(id: string) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return new ObjectId(id);
}

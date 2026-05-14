import { type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type PlayerDocument = {
  ownerId: string;
  name: string;
  phone?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BadmintonSessionDocument = {
  ownerId: string;
  playedAt: string;
  courtName?: string;
  courtPrice: number;
  shuttlecockCount: number;
  shuttlecockPrice: number;
  playerIds: string[];
  payments?: Array<{
    playerId: string;
    paid: boolean;
    paidAt?: Date;
  }>;
  qrImageData?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function playersCollection() {
  const db = await getDb();
  const collection = db.collection<PlayerDocument>("players");
  await collection.createIndex({ ownerId: 1, name: 1 });
  return collection;
}

export async function badmintonSessionsCollection() {
  const db = await getDb();
  const collection = db.collection<BadmintonSessionDocument>("badminton_sessions");
  await collection.createIndex({ ownerId: 1, playedAt: -1 });
  return collection;
}

export function serializePlayer(player: WithId<PlayerDocument>) {
  return {
    id: player._id.toString(),
    name: player.name,
    phone: player.phone ?? "",
    note: player.note ?? "",
    createdAt: player.createdAt.toISOString(),
  };
}

export function serializeBadmintonSession(
  session: WithId<BadmintonSessionDocument>,
  playerNames: Record<string, string>,
) {
  const shuttlecockTotal = session.shuttlecockCount * session.shuttlecockPrice;
  const totalCost = session.courtPrice + shuttlecockTotal;
  const playerCount = session.playerIds.length;
  const paymentsByPlayerId = Object.fromEntries(
    (session.payments ?? []).map((payment) => [payment.playerId, payment]),
  );

  return {
    id: session._id.toString(),
    playedAt: session.playedAt,
    courtName: session.courtName ?? "",
    courtPrice: session.courtPrice,
    shuttlecockCount: session.shuttlecockCount,
    shuttlecockPrice: session.shuttlecockPrice,
    shuttlecockTotal,
    totalCost,
    playerCount,
    costPerPlayer: playerCount > 0 ? Math.ceil(totalCost / playerCount) : 0,
    players: session.playerIds.map((id) => ({
      id,
      name: playerNames[id] ?? "Người chơi đã xóa",
      paid: paymentsByPlayerId[id]?.paid ?? false,
      paidAt: paymentsByPlayerId[id]?.paidAt?.toISOString() ?? "",
    })),
    paidCount: session.playerIds.filter((id) => paymentsByPlayerId[id]?.paid).length,
    qrImageData: session.qrImageData ?? "",
    note: session.note ?? "",
    createdAt: session.createdAt.toISOString(),
  };
}

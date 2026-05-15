import { type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type PlayerDocument = {
  ownerId: string;
  name: string;
  phone?: string;
  note?: string;
  isFixed?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type BadmintonSessionDocument = {
  ownerId: string;
  playedAt: string;
  courtName?: string;
  courtPrice?: number;
  courtHourlyPrice?: number;
  courtHours?: number;
  shuttlecockCount: number;
  shuttlecockPrice: number;
  playerIds: string[];
  participants?: Array<{
    participantId: string;
    playerId: string;
    displayName: string;
  }>;
  payments?: Array<{
    playerId?: string;
    participantId?: string;
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
    isFixed: player.isFixed ?? false,
    createdAt: player.createdAt.toISOString(),
  };
}

export function serializeBadmintonSession(
  session: WithId<BadmintonSessionDocument>,
  playerNames: Record<string, string>,
) {
  const courtHourlyPrice = session.courtHourlyPrice ?? session.courtPrice ?? 0;
  const courtHours = session.courtHours ?? 1;
  const courtPrice = session.courtPrice ?? courtHourlyPrice * courtHours;
  const shuttlecockTotal = session.shuttlecockCount * session.shuttlecockPrice;
  const totalCost = courtPrice + shuttlecockTotal;
  const participants =
    session.participants ??
    session.playerIds.map((id) => ({
      participantId: id,
      playerId: id,
      displayName: playerNames[id] ?? "vận động viên đã xóa",
    }));
  const playerCount = participants.length;
  const paymentsByParticipantId = Object.fromEntries(
    (session.payments ?? []).map((payment) => [
      payment.participantId ?? payment.playerId ?? "",
      payment,
    ]),
  );

  return {
    id: session._id.toString(),
    playedAt: session.playedAt,
    courtName: session.courtName ?? "",
    courtHourlyPrice,
    courtHours,
    courtPrice,
    shuttlecockCount: session.shuttlecockCount,
    shuttlecockPrice: session.shuttlecockPrice,
    shuttlecockTotal,
    totalCost,
    playerCount,
    costPerPlayer: playerCount > 0 ? Math.ceil(totalCost / playerCount) : 0,
    players: participants.map((participant) => ({
      id: participant.participantId,
      playerId: participant.playerId,
      name: participant.displayName,
      paid: paymentsByParticipantId[participant.participantId]?.paid ?? false,
      paidAt: paymentsByParticipantId[participant.participantId]?.paidAt?.toISOString() ?? "",
    })),
    paidCount: participants.filter(
      (participant) => paymentsByParticipantId[participant.participantId]?.paid,
    ).length,
    qrImageData: session.qrImageData ?? "",
    note: session.note ?? "",
    createdAt: session.createdAt.toISOString(),
  };
}

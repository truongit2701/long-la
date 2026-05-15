import { NextResponse } from "next/server";
import { usersCollection } from "@/lib/users";
import { badmintonSessionsCollection, playersCollection } from "@/lib/badminton";
import crypto from "crypto";

const weekdayOffsets: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const users = await usersCollection();
  const sessions = await badmintonSessionsCollection();
  const players = await playersCollection();
  
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  
  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() + diffToMonday);

  const owners = await users.find({
    automate_create_session: true,
  }).toArray();
  
  console.log(`\n[CRON ${today.toISOString()}] Starting WEEKLY auto-create sessions. Found ${owners.length} candidate owner(s).`);
  
  const results = [];
  let createdCount = 0;

  for (const owner of owners) {
    const ownerId = owner._id.toString();
    const automateDays = owner.automate_days || [];
    
    if (automateDays.length === 0) {
      console.log(`[CRON] Owner ${ownerId} - SKIPPED: No days configured`);
      continue;
    }

    const latestSession = await sessions.findOne(
      { ownerId },
      { sort: { playedAt: -1, createdAt: -1 } }
    );
    
    if (!latestSession) {
      console.log(`[CRON] Owner ${ownerId} - SKIPPED: No previous session found to clone`);
      results.push({ ownerId, status: "skipped", reason: "No previous session to clone" });
      continue;
    }

    const allOwnerPlayers = await players.find({ ownerId }).toArray();
    const fixedPlayerIds = allOwnerPlayers.filter(p => p.isFixed).map(p => p._id.toString());
    
    for (const day of automateDays) {
      const offset = weekdayOffsets[day];
      if (offset === undefined) continue;

      const targetDate = new Date(mondayDate);
      targetDate.setDate(mondayDate.getDate() + offset);
      const targetDateStr = targetDate.toISOString().slice(0, 10);

      const existingSession = await sessions.findOne({
        ownerId,
        playedAt: targetDateStr,
      });
      
      if (existingSession) {
        console.log(`[CRON] Owner ${ownerId} - SKIPPED [${day}]: Already has a session on ${targetDateStr}`);
        results.push({ ownerId, date: targetDateStr, day, status: "skipped", reason: "Already exists" });
        continue;
      }
      
      const participants = fixedPlayerIds.map(playerId => ({
        participantId: `${playerId}:1:${crypto.randomUUID()}`,
        playerId,
        displayName: allOwnerPlayers.find(p => p._id.toString() === playerId)?.name ?? "vận động viên",
      }));
      
      const now = new Date();
      
      const newSession = {
        ownerId,
        playedAt: targetDateStr,
        courtName: latestSession.courtName,
        courtPrice: latestSession.courtPrice,
        courtHourlyPrice: latestSession.courtHourlyPrice,
        courtHours: latestSession.courtHours,
        shuttlecockCount: latestSession.shuttlecockCount,
        shuttlecockPrice: latestSession.shuttlecockPrice,
        playerIds: fixedPlayerIds,
        participants,
        payments: [],
        qrImageData: latestSession.qrImageData,
        note: `Auto-created session for ${day}`,
        createdAt: now,
        updatedAt: now,
      };
      
      await sessions.insertOne(newSession);
      console.log(`[CRON] Owner ${ownerId} - SUCCESS [${day}]: Created session for ${targetDateStr}`);
      results.push({ ownerId, date: targetDateStr, day, status: "created" });
      createdCount++;
    }
  }

  console.log(`[CRON] Finished. Processed: ${owners.length} owners, Created: ${createdCount} sessions\n`);

  return NextResponse.json({ 
    message: "Weekly Cron executed successfully", 
    processedOwners: owners.length,
    createdSessions: createdCount,
    results 
  });
}

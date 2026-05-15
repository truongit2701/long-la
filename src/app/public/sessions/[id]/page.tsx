import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { Activity, Calendar, MapPin, Users, CheckCircle2, Clock } from "lucide-react";
import { badmintonSessionsCollection, playersCollection, serializeBadmintonSession } from "@/lib/badminton";
import { getLevelName } from "@/lib/badminton-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usersCollection } from "@/lib/users";

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PublicSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    notFound();
  }

  const [sessions, playersCol] = await Promise.all([
    badmintonSessionsCollection(),
    playersCollection(),
  ]);

  const sessionDoc = await sessions.findOne({ _id: new ObjectId(id) });

  if (!sessionDoc) {
    notFound();
  }

  const users = await usersCollection();
  const owner = await users.findOne({ _id: new ObjectId(sessionDoc.ownerId) });
  const showPlayerLevel = owner?.showPlayerLevel ?? true;

  // To get player names correctly for serialization
  const playerItems = await playersCol.find({ ownerId: sessionDoc.ownerId }).toArray();
  const playerNames = Object.fromEntries(
    playerItems.map((player) => [player._id.toString(), player.name]),
  );
  const playerLevels = Object.fromEntries(
    playerItems.map((player) => [player._id.toString(), player.level ?? "intermediate"]),
  );

  const session = serializeBadmintonSession(sessionDoc, playerNames, playerLevels);

  return (
    <main className="sport-page min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="sport-kicker">
              <Activity className="size-4" />
              Chi tiết buổi đánh
            </div>
          </div>
          <h1 className="text-3xl font-bold text-emerald-950">
            {session.courtName || "Sân cầu lông"}
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Calendar className="size-4" />
            {new Date(session.playedAt).toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="court-panel">
            <CardHeader className="pb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tổng chi phí</p>
              <CardTitle className="text-2xl text-primary font-bold">
                {formatMoney(session.totalCost)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p>Sân: {formatMoney(session.courtPrice)} ({session.courtHours}h)</p>
                <p>Cầu: {formatMoney(session.shuttlecockTotal)} ({session.shuttlecockCount} quả)</p>
                {session.otherFee > 0 && (
                  <p>Phí khác: {formatMoney(session.otherFee)} ({session.otherFeeNote || "Không có ghi chú"})</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="court-panel border-orange-200 bg-orange-50/30">
            <CardHeader className="pb-2">
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Mỗi người đóng</p>
              <CardTitle className="text-2xl text-orange-700 font-bold">
                {formatMoney(session.costPerPlayer)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-orange-600/80">Chia đều cho {session.playerCount} người tham gia</p>
            </CardContent>
          </Card>
        </div>

        <Card className="court-panel overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Danh sách người chơi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {session.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {player.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-emerald-950 flex items-center gap-2">
                        {player.name}
                        {showPlayerLevel && player.level && (
                          <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20 leading-none">
                            {getLevelName(player.level)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {player.paid ? (
                    <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                      <CheckCircle2 className="size-4" />
                      <span className="text-xs font-bold uppercase">Đã đóng</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-orange-500 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                      <Clock className="size-4" />
                      <span className="text-xs font-bold uppercase">Chờ đóng</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {session.qrImageData && (
          <Card className="court-panel">
            <CardHeader>
              <CardTitle className="text-lg text-center">Quét mã chuyển khoản</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative group p-2 bg-white rounded-xl border-2 border-dashed border-primary/20">
                <img 
                  src={session.qrImageData} 
                  alt="QR Thanh toán" 
                  className="max-w-[280px] w-full rounded-lg shadow-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-[300px]">
                Vui lòng ghi nội dung chuyển khoản rõ ràng kèm tên của bạn để chủ sân dễ đối soát.
              </p>
            </CardContent>
          </Card>
        )}

        {session.note && (
          <div className="text-center italic text-sm text-muted-foreground">
            &ldquo;{session.note}&rdquo;
          </div>
        )}

        <div className="text-center pt-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
            Powered by Long La Badminton
          </p>
        </div>
      </div>
    </main>
  );
}

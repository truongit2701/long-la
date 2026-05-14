"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDollarSign, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SessionPlayer = {
  id: string;
  name: string;
  paid: boolean;
  paidAt: string;
};

type BadmintonSession = {
  id: string;
  playedAt: string;
  courtName: string;
  courtPrice: number;
  shuttlecockCount: number;
  shuttlecockPrice: number;
  shuttlecockTotal: number;
  totalCost: number;
  playerCount: number;
  costPerPlayer: number;
  paidCount: number;
  qrImageData: string;
  players: SessionPlayer[];
  note: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SessionHistory() {
  const [sessions, setSessions] = useState<BadmintonSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      const response = await fetch("/api/badminton-sessions");
      const data = await response.json().catch(() => null);
      const loadedSessions = data?.sessions ?? [];

      setSessions(loadedSessions);
      setSelectedSessionId(loadedSessions[0]?.id ?? "");
      setIsLoading(false);
    }

    loadSessions();
  }, []);

  const selectedSession = sessions.find((item) => item.id === selectedSessionId) ?? sessions[0];
  const totalReceived = useMemo(
    () =>
      sessions.reduce(
        (sum, session) =>
          sum + session.players.filter((player) => player.paid).length * session.costPerPlayer,
        0,
      ),
    [sessions],
  );

  async function togglePayment(sessionId: string, playerId: string, paid: boolean) {
    setError("");
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              paidCount: session.paidCount + (paid ? 1 : -1),
              players: session.players.map((player) =>
                player.id === playerId
                  ? { ...player, paid, paidAt: paid ? new Date().toISOString() : "" }
                  : player,
              ),
            }
          : session,
      ),
    );

    const response = await fetch(`/api/badminton-sessions/${sessionId}/payments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, paid }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? "Không cập nhật được trạng thái chuyển khoản");
      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                paidCount: session.paidCount + (paid ? -1 : 1),
                players: session.players.map((player) =>
                  player.id === playerId ? { ...player, paid: !paid, paidAt: "" } : player,
                ),
              }
            : session,
        ),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Về dashboard
          </Link>
        </Button>
        <Card className="metric-card w-full sm:w-72">
          <CardHeader className="pb-2">
            <CardDescription>Đã nhận</CardDescription>
            <CardTitle className="flex items-center justify-between gap-3">
              {formatMoney(totalReceived)}
              <CircleDollarSign className="size-6 text-primary" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="court-panel">
          <CardHeader>
            <CardTitle>Lịch sử buổi đánh</CardTitle>
            <CardDescription>
              {isLoading ? "Đang tải..." : "Click vào một buổi để xem chi tiết."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.length === 0 && !isLoading ? (
              <p className="text-sm text-muted-foreground">Chưa có buổi đánh nào.</p>
            ) : null}
            {sessions.map((item) => (
              <button
                key={item.id}
                className={cn(
                  "w-full rounded-md border border-primary/15 bg-white/75 p-4 text-left transition-colors hover:bg-accent",
                  selectedSession?.id === item.id && "border-primary bg-accent/80",
                )}
                type="button"
                onClick={() => setSelectedSessionId(item.id)}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold">
                      {item.playedAt}
                      {item.courtName ? ` - ${item.courtName}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.players.map((player) => player.name).join(", ")}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-semibold">{formatMoney(item.totalCost)}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.paidCount}/{item.playerCount} đã chuyển
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <p>Tiền sân: {formatMoney(item.courtPrice)}</p>
                  <p>
                    Cầu: {item.shuttlecockCount} x {formatMoney(item.shuttlecockPrice)}
                  </p>
                  <p>{formatMoney(item.costPerPlayer)} / người</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="court-panel">
          <CardHeader>
            <CardTitle>Chi tiết buổi chơi</CardTitle>
            <CardDescription>
              {selectedSession
                ? `${selectedSession.playedAt}${selectedSession.courtName ? ` - ${selectedSession.courtName}` : ""}`
                : "Chọn một buổi để xem chi tiết."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSession ? (
              <>
                <div className="grid gap-2 rounded-md border border-primary/15 bg-white/75 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Tiền sân</span>
                    <span className="font-medium">{formatMoney(selectedSession.courtPrice)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Tiền cầu</span>
                    <span className="font-medium">
                      {formatMoney(selectedSession.shuttlecockTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 border-t pt-2">
                    <span className="font-medium">Tổng</span>
                    <span className="font-semibold">{formatMoney(selectedSession.totalCost)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Mỗi người</span>
                    <span className="font-semibold">
                      {formatMoney(selectedSession.costPerPlayer)}
                    </span>
                  </div>
                </div>

                <div className="rounded-md border border-primary/15 bg-white/75 p-3">
                  <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <QrCode className="size-4" />
                    QR nhận tiền
                  </p>
                  {selectedSession.qrImageData ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="QR nhận tiền"
                      className="mx-auto aspect-square max-h-72 rounded-md object-contain"
                      src={selectedSession.qrImageData}
                    />
                  ) : (
                    <div className="flex aspect-square max-h-72 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                      Chưa thêm QR
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Trạng thái chuyển khoản</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSession.paidCount}/{selectedSession.playerCount}
                    </p>
                  </div>
                  {selectedSession.players.map((player) => (
                    <label
                      key={player.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-accent"
                    >
                      <span>
                        <span className="font-medium">{player.name}</span>
                        <span className="block text-muted-foreground">
                          {formatMoney(selectedSession.costPerPlayer)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {player.paid ? (
                          <span className="flex items-center gap-1 text-primary">
                            <CheckCircle2 className="size-4" />
                            Đã chuyển
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Chưa chuyển</span>
                        )}
                        <input
                          checked={player.paid}
                          className="size-4"
                          type="checkbox"
                          onChange={(event) =>
                            togglePayment(selectedSession.id, player.id, event.target.checked)
                          }
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

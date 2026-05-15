"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Pencil, QrCode, Save, X, Share2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Player = {
  id: string;
  name: string;
  phone: string;
  note: string;
};

type SessionPlayer = {
  id: string;
  playerId: string;
  name: string;
  paid: boolean;
  paidAt: string;
};

type BadmintonSession = {
  id: string;
  playedAt: string;
  courtName: string;
  courtHourlyPrice: number;
  courtHours: number;
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không đọc được ảnh QR"));
    reader.readAsDataURL(file);
  });
}

export function SessionHistory() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<BadmintonSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editParticipantQuantities, setEditParticipantQuantities] = useState<Record<string, number>>({});
  const [editQrImageData, setEditQrImageData] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [sessionsResponse, playersResponse] = await Promise.all([
        fetch("/api/badminton-sessions"),
        fetch("/api/players"),
      ]);
      const [sessionsData, playersData] = await Promise.all([
        sessionsResponse.json(),
        playersResponse.json(),
      ]);
      const loadedSessions = sessionsData?.sessions ?? [];

      setSessions(loadedSessions);
      setPlayers(playersData?.players ?? []);
      setSelectedSessionId(loadedSessions[0]?.id ?? "");
      setIsLoading(false);
    }

    loadData();
  }, []);

  const selectedSession = sessions.find((item) => item.id === selectedSessionId) ?? sessions[0];
  const selectedSessionReceived = selectedSession
    ? selectedSession.players.filter((player) => player.paid).length * selectedSession.costPerPlayer
    : 0;
  const selectedSessionMissing = selectedSession
    ? Math.max(selectedSession.totalCost - selectedSessionReceived, 0)
    : 0;
  const playersById = useMemo(
    () => Object.fromEntries(players.map((player) => [player.id, player])),
    [players],
  );

  function getGroupedPlayers(session: BadmintonSession) {
    const groups = session.players.reduce<
      Record<
        string,
        {
          playerId: string;
          name: string;
          participantIds: string[];
          quantity: number;
          paidCount: number;
        }
      >
    >((currentGroups, player) => {
      const group = currentGroups[player.playerId] ?? {
        playerId: player.playerId,
        name: playersById[player.playerId]?.name ?? player.name.replace(/\s+\d+$/, ""),
        participantIds: [],
        quantity: 0,
        paidCount: 0,
      };

      group.participantIds.push(player.id);
      group.quantity += 1;
      group.paidCount += player.paid ? 1 : 0;
      currentGroups[player.playerId] = group;
      return currentGroups;
    }, {});

    return Object.values(groups);
  }

  function openEditSession(session: BadmintonSession) {
    const quantities = session.players.reduce<Record<string, number>>((groups, player) => {
      groups[player.playerId] = (groups[player.playerId] ?? 0) + 1;
      return groups;
    }, {});

    setError("");
    setIsEditing(true);
    setEditParticipantQuantities(quantities);
    setEditQrImageData(session.qrImageData);
  }

  function updateEditParticipantQuantity(playerId: string, quantity: number) {
    setEditParticipantQuantities((current) => ({
      ...current,
      [playerId]: quantity,
    }));
  }

  function toggleEditParticipant(playerId: string) {
    setEditParticipantQuantities((current) => {
      if (current[playerId]) {
        const next = { ...current };
        delete next[playerId];
        return next;
      }

      return { ...current, [playerId]: 1 };
    });
  }

  async function handleEditQrChange(file?: File) {
    setError("");

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("File QR phải là ảnh");
      return;
    }

    if (file.size > 2_000_000) {
      setError("Ảnh QR nên dưới 2MB");
      return;
    }

    setEditQrImageData(await readFileAsDataUrl(file));
  }

  async function updateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSession) {
      return;
    }

    setError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/badminton-sessions/${selectedSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playedAt: String(formData.get("playedAt") ?? ""),
        courtName: String(formData.get("courtName") ?? ""),
        courtHourlyPrice: Number(formData.get("courtHourlyPrice") ?? 0),
        courtHours: Number(formData.get("courtHours") ?? 0),
        shuttlecockCount: Number(formData.get("shuttlecockCount") ?? 0),
        shuttlecockPrice: Number(formData.get("shuttlecockPrice") ?? 0),
        participants: Object.entries(editParticipantQuantities).map(([playerId, quantity]) => ({
          playerId,
          quantity,
        })),
        qrImageData: editQrImageData,
        note: String(formData.get("note") ?? ""),
      }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setError(data?.message ?? "Không cập nhật được buổi đánh");
      return;
    }

    setSessions((current) =>
      current.map((session) => (session.id === selectedSession.id ? data.session : session)),
    );
    setSelectedSessionId(data.session.id);
    setIsEditing(false);
  }

  async function togglePaymentGroup(
    sessionId: string,
    participantIds: string[],
    paid: boolean,
  ) {
    setError("");
    const now = new Date().toISOString();

    setSessions((current) =>
      current.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }

        const changedCount = session.players.filter(
          (player) => participantIds.includes(player.id) && player.paid !== paid,
        ).length;

        return {
          ...session,
          paidCount: session.paidCount + (paid ? changedCount : -changedCount),
          players: session.players.map((player) =>
            participantIds.includes(player.id)
              ? { ...player, paid, paidAt: paid ? now : "" }
              : player,
          ),
        };
      }),
    );

    const responses = await Promise.all(
      participantIds.map((participantId) =>
        fetch(`/api/badminton-sessions/${sessionId}/payments`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId, paid }),
        }),
      ),
    );

    if (responses.some((response) => !response.ok)) {
      setError("Không cập nhật được trạng thái chuyển khoản");
      setSessions((current) =>
        current.map((session) => {
          if (session.id !== sessionId) {
            return session;
          }

          const changedCount = session.players.filter(
            (player) => participantIds.includes(player.id) && player.paid === paid,
          ).length;

          return {
            ...session,
            paidCount: session.paidCount + (paid ? -changedCount : changedCount),
            players: session.players.map((player) =>
              participantIds.includes(player.id)
                ? { ...player, paid: !paid, paidAt: "" }
                : player,
            ),
          };
        }),
      );
    }
  }

  function copyPublicLink() {
    if (!selectedSession) return;
    const url = `${window.location.origin}/public/sessions/${selectedSession.id}`;
    navigator.clipboard.writeText(url);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
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
                onClick={() => {
                  setSelectedSessionId(item.id);
                  setIsEditing(false);
                }}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold">
                      {item.playedAt}
                      {item.courtName ? ` - ${item.courtName}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {getGroupedPlayers(item)
                        .map((player) =>
                          player.quantity > 1 ? `${player.name} x${player.quantity}` : player.name,
                        )
                        .join(", ")}
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
                  <p>
                    Sân: {formatMoney(item.courtHourlyPrice)} x {item.courtHours}h
                  </p>
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Chi tiết buổi chơi</CardTitle>
                <CardDescription>
                  {selectedSession
                    ? `${selectedSession.playedAt}${selectedSession.courtName ? ` - ${selectedSession.courtName}` : ""}`
                    : "Chọn một buổi để xem chi tiết."}
                </CardDescription>
              </div>
              {selectedSession ? (
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    title="Chia sẻ link công khai"
                    onClick={copyPublicLink}
                  >
                    {copying ? <Check className="size-4 text-green-600" /> : <Share2 className="size-4" />}
                  </Button>
                  <Button
                    className="gap-2"
                    type="button"
                    variant={isEditing ? "outline" : "default"}
                    onClick={() =>
                      isEditing ? setIsEditing(false) : openEditSession(selectedSession)
                    }
                  >
                    {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
                    {isEditing ? "Hủy" : "Chỉnh sửa"}
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSession && isEditing ? (
              <form className="space-y-4 rounded-md border border-primary/15 bg-white/75 p-3" onSubmit={updateSession}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-playedAt">Ngày chơi</Label>
                    <Input id="edit-playedAt" name="playedAt" type="date" defaultValue={selectedSession.playedAt} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-courtName">Tên sân</Label>
                    <Input id="edit-courtName" name="courtName" defaultValue={selectedSession.courtName} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-courtHourlyPrice">Giá sân / giờ</Label>
                    <Input id="edit-courtHourlyPrice" name="courtHourlyPrice" type="number" min={0} defaultValue={selectedSession.courtHourlyPrice} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-courtHours">Số giờ chơi</Label>
                    <Input id="edit-courtHours" name="courtHours" type="number" min={0.5} step={0.5} defaultValue={selectedSession.courtHours} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-shuttlecockCount">Số cầu</Label>
                    <Input id="edit-shuttlecockCount" name="shuttlecockCount" type="number" min={0} defaultValue={selectedSession.shuttlecockCount} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-shuttlecockPrice">Giá mỗi quả cầu</Label>
                    <Input id="edit-shuttlecockPrice" name="shuttlecockPrice" type="number" min={0} defaultValue={selectedSession.shuttlecockPrice} required />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-note">Ghi chú</Label>
                    <Input id="edit-note" name="note" defaultValue={selectedSession.note} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-qr">Đổi ảnh QR nhận tiền</Label>
                  <Input
                    id="edit-qr"
                    accept="image/*"
                    type="file"
                    onChange={(event) => handleEditQrChange(event.target.files?.[0])}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Người tham gia</Label>
                    <span className="text-sm text-muted-foreground">
                      {Object.values(editParticipantQuantities).reduce((sum, quantity) => sum + quantity, 0)} suất
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {players.map((player) => (
                      <label
                        key={player.id}
                        className="flex cursor-pointer items-center gap-3 rounded-md border border-primary/15 bg-white/80 p-3 text-sm transition-colors hover:bg-accent"
                      >
                        <input
                          checked={Boolean(editParticipantQuantities[player.id])}
                          className="size-4"
                          type="checkbox"
                          onChange={() => toggleEditParticipant(player.id)}
                        />
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                          <span className="truncate font-medium">{player.name}</span>
                          <select
                            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            disabled={!editParticipantQuantities[player.id]}
                            value={editParticipantQuantities[player.id] ?? 1}
                            onChange={(event) =>
                              updateEditParticipantQuantity(player.id, Number(event.target.value))
                            }
                            onClick={(event) => event.stopPropagation()}
                          >
                            {Array.from({ length: 10 }, (_, index) => index + 1).map((quantity) => (
                              <option key={quantity} value={quantity}>
                                SL {quantity}
                              </option>
                            ))}
                          </select>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button className="gap-2" type="submit">
                  <Save className="size-4" />
                  Lưu buổi đánh
                </Button>
              </form>
            ) : null}
            {selectedSession ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-primary/15 bg-white/75 p-3">
                    <p className="text-sm text-muted-foreground">Tổng</p>
                    <p className="mt-1 font-semibold">{formatMoney(selectedSession.totalCost)}</p>
                  </div>
                  <div className="rounded-md border border-primary/15 bg-white/75 p-3">
                    <p className="text-sm text-muted-foreground">Đã chuyển</p>
                    <p className="mt-1 font-semibold text-primary">
                      {formatMoney(selectedSessionReceived)}
                    </p>
                  </div>
                  <div className="rounded-md border border-primary/15 bg-white/75 p-3">
                    <p className="text-sm text-muted-foreground">Còn thiếu</p>
                    <p className="mt-1 font-semibold text-orange-600">
                      {formatMoney(selectedSessionMissing)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 rounded-md border border-primary/15 bg-white/75 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Tiền sân</span>
                    <span className="font-medium">
                      {formatMoney(selectedSession.courtHourlyPrice)} x {selectedSession.courtHours}h
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Tổng tiền sân</span>
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
                  {getGroupedPlayers(selectedSession).map((player) => {
                    const isPaid = player.paidCount === player.quantity;
                    const isPartial = player.paidCount > 0 && player.paidCount < player.quantity;

                    return (
                    <label
                      key={player.playerId}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-accent"
                    >
                      <span>
                        <span className="font-medium">
                          {player.name}
                          {player.quantity > 1 ? ` x${player.quantity}` : ""}
                        </span>
                        <span className="block text-muted-foreground">
                          {formatMoney(selectedSession.costPerPlayer * player.quantity)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {isPaid ? (
                          <span className="flex items-center gap-1 text-primary">
                            <CheckCircle2 className="size-4" />
                            Đã chuyển
                          </span>
                        ) : isPartial ? (
                          <span className="text-muted-foreground">
                            {player.paidCount}/{player.quantity} đã chuyển
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Chưa chuyển</span>
                        )}
                        <input
                          checked={isPaid}
                          className="size-4"
                          type="checkbox"
                          onChange={(event) =>
                            togglePaymentGroup(
                              selectedSession.id,
                              player.participantIds,
                              event.target.checked,
                            )
                          }
                        />
                      </span>
                    </label>
                    );
                  })}
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

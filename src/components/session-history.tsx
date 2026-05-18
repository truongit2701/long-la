"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Pencil, QrCode, Save, X, Share2, Check, Copy, Plus, Trash } from "lucide-react";
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
import { getLevelName } from "@/lib/badminton-types";

type Player = {
  id: string;
  name: string;
  phone: string;
  note: string;
  level: string;
};

type SessionPlayer = {
  id: string;
  playerId: string;
  name: string;
  paid: boolean;
  paidAt: string;
  level?: string;
  sets?: boolean[];
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
  otherFee: number;
  otherFeeNote: string;
  note: string;
  setCount?: number;
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

type SessionSetsTrackerProps = {
  session: BadmintonSession;
  showPlayerLevel: boolean;
  playersById: Record<string, Player>;
  onToggleSet: (participantId: string, setIndex: number, played: boolean) => Promise<void>;
  onAddSet: () => Promise<void>;
  onDeleteSet: () => Promise<void>;
  onClose: () => void;
};

function SessionSetsTracker({
  session,
  showPlayerLevel,
  playersById,
  onToggleSet,
  onAddSet,
  onDeleteSet,
  onClose,
}: SessionSetsTrackerProps) {
  return (
    <div className="rounded-lg border border-primary/15 bg-white/95 p-3 shadow-sm animate-in slide-in-from-top duration-200 space-y-3 mt-2">
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 pb-2">
        <div>
          <p className="font-bold text-emerald-950 text-xs">Theo dõi số set cầu</p>
          <p className="text-[10px] text-muted-foreground">Tích chọn các set đấu VĐV tham gia.</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-primary/20 hover:bg-primary/5 text-primary text-[10px] font-bold px-2"
            onClick={(e) => {
              e.stopPropagation();
              onAddSet();
            }}
          >
            <Plus className="size-3" />
            Thêm Set
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-destructive/20 hover:bg-destructive/5 text-destructive text-[10px] font-bold px-2 disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSet();
            }}
            disabled={(session.setCount ?? 4) <= 0}
          >
            <Trash className="size-3" />
            Xóa Set
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-primary/10 bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-primary/10 bg-primary/[0.02]">
              <th className="p-2 font-bold text-emerald-950">Tên</th>
              {showPlayerLevel && <th className="p-2 font-bold text-emerald-950">Trình</th>}
              {Array.from({ length: session.setCount ?? 4 }).map((_, index) => (
                <th key={index} className="p-2 font-bold text-emerald-950 text-center">Set {index + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {session.players.map((player) => {
              const level = player.level ?? playersById[player.playerId]?.level ?? "";
              return (
                <tr key={player.id} className="border-b border-primary/5 last:border-0 hover:bg-primary/[0.01]">
                  <td className="p-2 font-medium text-emerald-950 truncate max-w-[100px]">{player.name}</td>
                  {showPlayerLevel && (
                    <td className="p-2">
                      {level && (
                        <span className="text-[9px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold uppercase leading-none">
                          {getLevelName(level)}
                        </span>
                      )}
                    </td>
                  )}
                  {Array.from({ length: session.setCount ?? 4 }).map((_, setIdx) => {
                    const isPlayed = player.sets?.[setIdx] ?? false;
                    return (
                      <td key={setIdx} className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isPlayed}
                          className="size-3.5 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary/20"
                          onChange={(e) => onToggleSet(player.id, setIdx, e.target.checked)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SessionHistory({ 
  showPlayerLevel = true, 
  showPlayerSets = false 
}: { 
  showPlayerLevel?: boolean; 
  showPlayerSets?: boolean; 
}) {
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
      setSelectedSessionId("");
      setIsLoading(false);
    }

    loadData();
  }, []);

  const selectedSession = sessions.find((item) => item.id === selectedSessionId);
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

  const selectablePlayers = useMemo(() => {
    if (!selectedSession) return players;
    const activeIds = new Set(players.map((p) => p.id));
    const list = [...players];

    selectedSession.players.forEach((sp) => {
      if (!activeIds.has(sp.playerId)) {
        list.push({
          id: sp.playerId,
          name: sp.name.replace(/\s+\d+$/, "") + " (Đã xóa)",
          phone: "",
          note: "",
          level: "",
        });
        activeIds.add(sp.playerId);
      }
    });

    return list;
  }, [players, selectedSession]);

  function getGroupedPlayers(session: BadmintonSession) {
    const groups = session.players.reduce<
      Record<
        string,
        {
          playerId: string;
          name: string;
          level: string;
          participantIds: string[];
          quantity: number;
          paidCount: number;
        }
      >
    >((currentGroups, player) => {
      const group = currentGroups[player.playerId] ?? {
        playerId: player.playerId,
        name: playersById[player.playerId]?.name ?? player.name.replace(/\s+\d+$/, ""),
        level: playersById[player.playerId]?.level ?? "",
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
        otherFee: Number(formData.get("otherFee") ?? 0),
        otherFeeNote: String(formData.get("otherFeeNote") ?? ""),
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

  async function handleToggleSet(participantId: string, setIndex: number, played: boolean) {
    if (!selectedSession) return;
    setError("");

    // Optimistically update frontend state
    setSessions((curr) =>
      curr.map((s) => {
        if (s.id !== selectedSession.id) return s;
        return {
          ...s,
          players: s.players.map((p) => {
            if (p.id !== participantId) return p;
            const newSets = [...(p.sets ?? [])];
            while (newSets.length <= setIndex) {
              newSets.push(false);
            }
            newSets[setIndex] = played;
            return { ...p, sets: newSets };
          }),
        };
      })
    );

    const response = await fetch(`/api/badminton-sessions/${selectedSession.id}/sets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, setIndex, played }),
    });

    if (!response.ok) {
      setError("Không thể cập nhật số set cầu, vui lòng thử lại.");
      // Rollback frontend state if failed
      setSessions((curr) =>
        curr.map((s) => {
          if (s.id !== selectedSession.id) return s;
          return {
            ...s,
            players: s.players.map((p) => {
              if (p.id !== participantId) return p;
              const newSets = [...(p.sets ?? [])];
              newSets[setIndex] = !played;
              return { ...p, sets: newSets };
            }),
          };
        })
      );
    }
  }

  async function handleAddSet() {
    if (!selectedSession) return;
    setError("");

    // Optimistically update frontend state
    setSessions((curr) =>
      curr.map((s) => {
        if (s.id !== selectedSession.id) return s;
        const newSetCount = (s.setCount ?? 4) + 1;
        return {
          ...s,
          setCount: newSetCount,
          players: s.players.map((p) => {
            const newSets = [...(p.sets ?? [])];
            while (newSets.length < newSetCount) {
              newSets.push(false);
            }
            return { ...p, sets: newSets };
          }),
        };
      })
    );

    const response = await fetch(`/api/badminton-sessions/${selectedSession.id}/sets/add`, {
      method: "POST",
    });

    if (!response.ok) {
      setError("Không thể thêm set cầu mới, vui lòng thử lại.");
      // Rollback if failed
      setSessions((curr) =>
        curr.map((s) => {
          if (s.id !== selectedSession.id) return s;
          const oldSetCount = Math.max(0, (s.setCount ?? 5) - 1);
          return {
            ...s,
            setCount: oldSetCount,
            players: s.players.map((p) => ({
              ...p,
              sets: (p.sets ?? []).slice(0, oldSetCount),
            })),
          };
        })
      );
    }
  }

  async function handleDeleteSet() {
    if (!selectedSession) return;
    const currentSetCount = selectedSession.setCount ?? 4;
    if (currentSetCount <= 0) return;
    setError("");

    // Optimistically update frontend state
    setSessions((curr) =>
      curr.map((s) => {
        if (s.id !== selectedSession.id) return s;
        const newSetCount = currentSetCount - 1;
        return {
          ...s,
          setCount: newSetCount,
          players: s.players.map((p) => ({
            ...p,
            sets: (p.sets ?? []).slice(0, newSetCount),
          })),
        };
      })
    );

    const response = await fetch(`/api/badminton-sessions/${selectedSession.id}/sets/delete`, {
      method: "POST",
    });

    if (!response.ok) {
      setError("Không thể xóa set cầu, vui lòng thử lại.");
      // Rollback if failed
      setSessions((curr) =>
        curr.map((s) => {
          if (s.id !== selectedSession.id) return s;
          const oldSetCount = currentSetCount;
          return {
            ...s,
            setCount: oldSetCount,
            players: s.players.map((p) => {
              const newSets = [...(p.sets ?? [])];
              while (newSets.length < oldSetCount) {
                newSets.push(false);
              }
              return { ...p, sets: newSets };
            }),
          };
        })
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
              <div key={item.id} className="space-y-2">
                <button
                  className={cn(
                    "w-full rounded-md border border-primary/15 bg-white/75 p-4 text-left transition-colors hover:bg-accent",
                    selectedSession?.id === item.id && "border-primary bg-accent/80",
                  )}
                  type="button"
                  onClick={() => {
                    setSelectedSessionId(selectedSessionId === item.id ? "" : item.id);
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
                {selectedSession?.id === item.id && showPlayerSets && (
                  <SessionSetsTracker
                    session={selectedSession}
                    showPlayerLevel={showPlayerLevel}
                    playersById={playersById}
                    onToggleSet={handleToggleSet}
                    onAddSet={handleAddSet}
                    onDeleteSet={handleDeleteSet}
                    onClose={() => setSelectedSessionId("")}
                  />
                )}
              </div>
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
                  <div className="space-y-2">
                    <Label htmlFor="edit-otherFee">Phí khác</Label>
                    <Input id="edit-otherFee" name="otherFee" type="number" min={0} defaultValue={selectedSession.otherFee} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-otherFeeNote">Ghi chú phí khác</Label>
                    <Input id="edit-otherFeeNote" name="otherFeeNote" defaultValue={selectedSession.otherFeeNote} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-note">Ghi chú buổi đánh</Label>
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
                    {selectablePlayers.map((player) => (
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
                  {selectedSession.otherFee > 0 && (
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Phí khác ({selectedSession.otherFeeNote})</span>
                      <span className="font-medium">
                        {formatMoney(selectedSession.otherFee)}
                      </span>
                    </div>
                  )}
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
                      className="mx-auto aspect-square max-h-36 rounded-md object-contain"
                      src={selectedSession.qrImageData}
                    />
                  ) : (
                    <div className="flex aspect-square max-h-36 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
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
                        <span className="font-medium flex items-center gap-2">
                          {player.name}
                          {showPlayerLevel && player.level && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20 leading-none">
                              {getLevelName(player.level)}
                            </span>
                          )}
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

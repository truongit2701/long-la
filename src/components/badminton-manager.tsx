"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  CalendarPlus,
  CircleDollarSign,
  Pencil,
  Plus,
  QrCode,
  Save,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { PLAYER_LEVELS, getLevelName } from "@/lib/badminton-types";
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

type Player = {
  id: string;
  name: string;
  phone: string;
  note: string;
  level: string;
  isFixed?: boolean;
};

type BadmintonSession = {
  id: string;
  totalCost: number;
  players: Array<{ paid: boolean }>;
  costPerPlayer: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không đọc được ảnh QR"));
    reader.readAsDataURL(file);
  });
}

export function BadmintonManager({ showPlayerLevel = true }: { showPlayerLevel?: boolean }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<BadmintonSession[]>([]);
  const [participantQuantities, setParticipantQuantities] = useState<Record<string, number>>({});
  const [editingPlayerId, setEditingPlayerId] = useState("");
  const [qrImageData, setQrImageData] = useState("");
  const [playerError, setPlayerError] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [playersResponse, sessionsResponse] = await Promise.all([
        fetch("/api/players"),
        fetch("/api/badminton-sessions"),
      ]);
      const [playersData, sessionsData] = await Promise.all([
        playersResponse.json(),
        sessionsResponse.json(),
      ]);

      const loadedPlayers = playersData.players ?? [];
      setPlayers(loadedPlayers);
      setSessions(sessionsData.sessions ?? []);
      
      const defaultQuantities: Record<string, number> = {};
      loadedPlayers.forEach((p: Player) => {
        if (p.isFixed) defaultQuantities[p.id] = 1;
      });
      setParticipantQuantities(defaultQuantities);
      setIsLoading(false);
    }

    loadData();
  }, []);

  const selectedPlayerCount = Object.values(participantQuantities).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const totalSpent = useMemo(
    () => sessions.reduce((sum, session) => sum + session.totalCost, 0),
    [sessions],
  );
  const totalReceived = useMemo(
    () =>
      sessions.reduce(
        (sum, session) =>
          sum + session.players.filter((player) => player.paid).length * session.costPerPlayer,
        0,
      ),
    [sessions],
  );

  async function createPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPlayerError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        note: String(formData.get("note") ?? ""),
        level: String(formData.get("level") ?? "Trung bình"),
        isFixed: formData.get("isFixed") === "on",
      }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setPlayerError(data?.message ?? "Không tạo được vận động viên");
      return;
    }

    setPlayers((current) => [data.player, ...current]);
    if (data.player.isFixed) {
      setParticipantQuantities((current) => ({ ...current, [data.player.id]: 1 }));
    }
    form.reset();
  }

  async function updatePlayer(event: FormEvent<HTMLFormElement>, playerId: string) {
    event.preventDefault();
    setPlayerError("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        note: String(formData.get("note") ?? ""),
        level: String(formData.get("level") ?? "Trung bình"),
        isFixed: formData.get("isFixed") === "on",
      }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setPlayerError(data?.message ?? "Không sửa được vận động viên");
      return;
    }

    setPlayers((current) =>
      current.map((player) => (player.id === playerId ? data.player : player)),
    );
    setParticipantQuantities((current) => {
      if (data.player.isFixed && !current[data.player.id]) {
         return { ...current, [data.player.id]: 1 };
      }
      return current;
    });
    setEditingPlayerId("");
  }

  async function deletePlayer(playerId: string) {
    if (!window.confirm("Xóa vận động viên này khỏi danh sách? Lịch sử buổi đánh cũ vẫn được giữ.")) {
      return;
    }

    setPlayerError("");
    const response = await fetch(`/api/players/${playerId}`, { method: "DELETE" });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setPlayerError(data?.message ?? "Không xóa được vận động viên");
      return;
    }

    setPlayers((current) => current.filter((player) => player.id !== playerId));
    setParticipantQuantities((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });
  }

  async function createBadmintonSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSessionError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/badminton-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playedAt: String(formData.get("playedAt") ?? ""),
        courtName: String(formData.get("courtName") ?? ""),
        courtHourlyPrice: Number(formData.get("courtHourlyPrice") ?? 0),
        courtHours: Number(formData.get("courtHours") ?? 0),
        shuttlecockCount: Number(formData.get("shuttlecockCount") ?? 0),
        shuttlecockPrice: Number(formData.get("shuttlecockPrice") ?? 0),
        otherFee: Number(formData.get("otherFee") ?? 0),
        otherFeeNote: String(formData.get("otherFeeNote") ?? ""),
        participants: Object.entries(participantQuantities).map(([playerId, quantity]) => ({
          playerId,
          quantity,
        })),
        qrImageData,
        note: String(formData.get("note") ?? ""),
      }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setSessionError(data?.message ?? "Không tạo được buổi đánh");
      return;
    }

    setSessions((current) => [data.session, ...current]);
    const defaultQuantities: Record<string, number> = {};
    players.forEach(p => { if (p.isFixed) defaultQuantities[p.id] = 1 });
    setParticipantQuantities(defaultQuantities);
    setQrImageData("");
    form.reset();
  }

  async function handleQrChange(file?: File) {
    setSessionError("");

    if (!file) {
      setQrImageData("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSessionError("File QR phải là ảnh");
      return;
    }

    if (file.size > 2_000_000) {
      setSessionError("Ảnh QR nên dưới 2MB");
      return;
    }

    setQrImageData(await readFileAsDataUrl(file));
  }

  function togglePlayer(playerId: string) {
    setParticipantQuantities((current) => {
      if (current[playerId]) {
        const next = { ...current };
        delete next[playerId];
        return next;
      }

      return { ...current, [playerId]: 1 };
    });
  }

  function updateParticipantQuantity(playerId: string, quantity: number) {
    setParticipantQuantities((current) => ({
      ...current,
      [playerId]: quantity,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription>vận động viên</CardDescription>
            <CardTitle className="flex items-center justify-between">
              {players.length}
              <Users className="size-6 text-primary" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription>Buổi đã lưu</CardDescription>
            <CardTitle className="flex items-center justify-between">
              {sessions.length}
              <CalendarDays className="size-6 text-orange-500" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription>Tổng chi phí</CardDescription>
            <CardTitle className="flex items-center justify-between gap-3 text-xl">
              {formatMoney(totalSpent)}
              <CircleDollarSign className="size-6 text-primary" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription>Đã nhận</CardDescription>
            <CardTitle className="flex items-center justify-between gap-3 text-xl">
              {formatMoney(totalReceived)}
              <WalletCards className="size-6 text-orange-500" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="court-panel flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold">Sổ buổi đánh</p>
          <p className="text-sm text-muted-foreground">
            Mở trang xem QR và tick trạng thái chuyển khoản.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/sessions">
            <CalendarDays className="size-4" />
            Xem lịch sử buổi đánh
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card className="court-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="size-5" />
                Thêm vận động viên
              </CardTitle>
              <CardDescription>Tạo danh sách để chọn mỗi lần đánh.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={createPlayer}>
                <div className="space-y-2">
                  <Label htmlFor="player-name">Tên</Label>
                  <Input id="player-name" name="name" placeholder="Nguyễn Văn A" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player-phone">Số điện thoại</Label>
                  <Input id="player-phone" name="phone" placeholder="Tùy chọn" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player-note">Ghi chú</Label>
                  <Input id="player-note" name="note" placeholder="Tùy chọn" />
                </div>
                  {showPlayerLevel && (
                    <div className="space-y-2">
                      <Label htmlFor="player-level">Trình độ</Label>
                      <select
                        id="player-level"
                        name="level"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        defaultValue="Trung bình"
                      >
                        {PLAYER_LEVELS.map((level: { id: string; name: string }) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                <div className="flex items-center gap-2">
                  <input id="player-isFixed" name="isFixed" type="checkbox" className="size-4" />
                  <Label htmlFor="player-isFixed" className="cursor-pointer">Cố định (tự động chọn khi tạo buổi đánh)</Label>
                </div>
                {playerError ? <p className="text-sm text-destructive">{playerError}</p> : null}
                <Button className="w-full gap-2" type="submit">
                  <Plus className="size-4" />
                  Thêm vận động viên
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="court-panel">
            <CardHeader>
              <CardTitle className="text-xl">Danh sách vận động viên</CardTitle>
              <CardDescription>
                {isLoading ? "Đang tải..." : "Chọn ở form tạo buổi đánh."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {players.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có vận động viên nào.</p>
              ) : (
                players.map((player) =>
                  editingPlayerId === player.id ? (
                    <form
                      key={player.id}
                      className="space-y-3 rounded-md border border-primary/15 bg-white/75 p-3"
                      onSubmit={(event) => updatePlayer(event, player.id)}
                    >
                      <Input name="name" defaultValue={player.name} required minLength={2} />
                      <Input name="phone" defaultValue={player.phone} placeholder="Số điện thoại" />
                      <Input name="note" defaultValue={player.note} placeholder="Ghi chú" />
                      {showPlayerLevel && (
                        <select
                          name="level"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          defaultValue={player.level}
                        >
                          {PLAYER_LEVELS.map((level: { id: string; name: string }) => (
                            <option key={level.id} value={level.id}>
                              {level.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex items-center gap-2">
                        <input id={`edit-isFixed-${player.id}`} name="isFixed" type="checkbox" defaultChecked={player.isFixed} className="size-4" />
                        <Label htmlFor={`edit-isFixed-${player.id}`} className="cursor-pointer">Thành viên cố định</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button className="h-9 gap-2" type="submit">
                          <Save className="size-4" />
                          Lưu
                        </Button>
                        <Button
                          className="h-9 gap-2"
                          type="button"
                          variant="outline"
                          onClick={() => setEditingPlayerId("")}
                        >
                          <X className="size-4" />
                          Hủy
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div key={player.id} className="rounded-md border border-primary/15 bg-white/75 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {player.name}
                            {showPlayerLevel && (
                              <span className="ml-2 text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20">{getLevelName(player.level)}</span>
                            )}
                            {player.isFixed && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">Cố định</span>}
                          </p>
                          {player.phone ? (
                            <p className="text-sm text-muted-foreground">{player.phone}</p>
                          ) : null}
                          {player.note ? (
                            <p className="text-sm text-muted-foreground">{player.note}</p>
                          ) : null}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() => setEditingPlayerId(player.id)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() => deletePlayer(player.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ),
                )
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="court-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarPlus className="size-5" />
              Tạo buổi đánh
            </CardTitle>
            <CardDescription>
              Chọn vận động viên, nhập chi phí và thêm QR nhận tiền.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={createBadmintonSession}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="playedAt">Ngày chơi</Label>
                  <Input id="playedAt" name="playedAt" type="date" defaultValue={today()} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courtName">Tên sân</Label>
                  <Input id="courtName" name="courtName" placeholder="Sân 123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courtHourlyPrice">Giá sân / giờ</Label>
                  <Input id="courtHourlyPrice" name="courtHourlyPrice" type="number" min={0} placeholder="90000" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courtHours">Số giờ chơi</Label>
                  <Input id="courtHours" name="courtHours" type="number" min={0.5} step={0.5} placeholder="2" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shuttlecockCount">Số cầu</Label>
                  <Input id="shuttlecockCount" name="shuttlecockCount" type="number" min={0} placeholder="3" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shuttlecockPrice">Giá mỗi quả cầu</Label>
                  <Input id="shuttlecockPrice" name="shuttlecockPrice" type="number" min={0} placeholder="25000" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-note">Ghi chú</Label>
                  <Input id="session-note" name="note" placeholder="Tùy chọn" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2">
                  <div className="space-y-2">
                    <Label htmlFor="otherFee" className="font-bold">Phí khác (Nước uống, gửi xe...)</Label>
                    <div className="relative">
                      <Input id="otherFee" name="otherFee" type="number" min={0} placeholder="0" className="pr-10" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">VND</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otherFeeNote" className="font-bold">Ghi chú phí khác</Label>
                    <Input id="otherFeeNote" name="otherFeeNote" placeholder="Ví dụ: 10 chai nước suối" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div className="space-y-2">
                  <Label htmlFor="qrImage">Ảnh QR nhận tiền</Label>
                  <Input
                    id="qrImage"
                    accept="image/*"
                    type="file"
                    onChange={(event) => handleQrChange(event.target.files?.[0])}
                  />
                </div>
                <div className="flex aspect-square items-center justify-center rounded-md border bg-muted/50">
                  {qrImageData ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="QR nhận tiền" className="h-full w-full rounded-md object-contain p-2" src={qrImageData} />
                  ) : (
                    <QrCode className="size-10 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Người tham gia</Label>
                  <span className="text-sm text-muted-foreground">
                    Đã chọn {selectedPlayerCount}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {players.map((player) => (
                    <label
                      key={player.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-primary/15 bg-white/75 p-3 text-sm transition-colors hover:bg-accent"
                    >
                      <input
                        checked={Boolean(participantQuantities[player.id])}
                        className="size-4"
                        type="checkbox"
                        onChange={() => togglePlayer(player.id)}
                      />
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span className="truncate font-medium">
                          {player.name}
                          {showPlayerLevel && (
                            <span className="ml-2 text-[8px] opacity-70">({getLevelName(player.level)})</span>
                          )}
                        </span>
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          disabled={!participantQuantities[player.id]}
                          value={participantQuantities[player.id] ?? 1}
                          onChange={(event) =>
                            updateParticipantQuantity(player.id, Number(event.target.value))
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
                {players.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Thêm vận động viên trước rồi tạo buổi đánh.
                  </p>
                ) : null}
              </div>

              {sessionError ? <p className="text-sm text-destructive">{sessionError}</p> : null}
              <Button className="gap-2" disabled={players.length === 0} type="submit">
                <CalendarPlus className="size-4" />
                Lưu buổi đánh
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

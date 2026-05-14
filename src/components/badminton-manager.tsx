"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, CalendarPlus, CircleDollarSign, Plus, QrCode, Users, WalletCards } from "lucide-react";
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

export function BadmintonManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<BadmintonSession[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
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

      setPlayers(playersData.players ?? []);
      setSessions(sessionsData.sessions ?? []);
      setIsLoading(false);
    }

    loadData();
  }, []);

  const selectedPlayerCount = selectedPlayerIds.length;
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
      }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setPlayerError(data?.message ?? "Không tạo được người chơi");
      return;
    }

    setPlayers((current) => [data.player, ...current]);
    form.reset();
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
        courtPrice: Number(formData.get("courtPrice") ?? 0),
        shuttlecockCount: Number(formData.get("shuttlecockCount") ?? 0),
        shuttlecockPrice: Number(formData.get("shuttlecockPrice") ?? 0),
        playerIds: selectedPlayerIds,
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
    setSelectedPlayerIds([]);
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
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="metric-card">
          <CardHeader className="pb-2">
            <CardDescription>Người chơi</CardDescription>
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
            Mở trang riêng để xem QR và tick trạng thái chuyển khoản.
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
                Thêm người chơi
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
                {playerError ? <p className="text-sm text-destructive">{playerError}</p> : null}
                <Button className="w-full gap-2" type="submit">
                  <Plus className="size-4" />
                  Thêm người chơi
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="court-panel">
            <CardHeader>
              <CardTitle className="text-xl">Danh sách người chơi</CardTitle>
              <CardDescription>
                {isLoading ? "Đang tải..." : "Chọn ở form tạo buổi đánh."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {players.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có người chơi nào.</p>
              ) : (
                players.map((player) => (
                  <div key={player.id} className="rounded-md border border-primary/15 bg-white/75 p-3">
                    <p className="font-medium">{player.name}</p>
                    {player.phone ? (
                      <p className="text-sm text-muted-foreground">{player.phone}</p>
                    ) : null}
                  </div>
                ))
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
              Chọn người chơi, nhập chi phí và thêm QR nhận tiền.
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
                  <Label htmlFor="courtPrice">Tiền sân</Label>
                  <Input id="courtPrice" name="courtPrice" type="number" min={0} placeholder="180000" required />
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
                        checked={selectedPlayerIds.includes(player.id)}
                        className="size-4"
                        type="checkbox"
                        onChange={() => togglePlayer(player.id)}
                      />
                      <span className="font-medium">{player.name}</span>
                    </label>
                  ))}
                </div>
                {players.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Thêm người chơi trước rồi tạo buổi đánh.
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

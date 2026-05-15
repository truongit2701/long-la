"use client";

import { type FormEvent, useState } from "react";
import {
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
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

interface PlayerManagerProps {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  isLoading: boolean;
}

export function PlayerManager({ players, setPlayers, isLoading }: PlayerManagerProps) {
  const [editingPlayerId, setEditingPlayerId] = useState("");
  const [playerError, setPlayerError] = useState("");

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
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        <Card className="court-panel border-primary/10 shadow-lg">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="flex items-center gap-2 text-xl text-primary font-black">
              <Plus className="size-6" />
              Thêm vận động viên
            </CardTitle>
            <CardDescription>Tạo danh sách để chọn mỗi lần đánh.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-4" onSubmit={createPlayer}>
              <div className="space-y-2">
                <Label htmlFor="player-name" className="font-bold">Tên</Label>
                <Input id="player-name" name="name" placeholder="Nguyễn Văn A" required className="focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-phone" className="font-bold">Số điện thoại</Label>
                <Input id="player-phone" name="phone" placeholder="Tùy chọn" className="focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-note" className="font-bold">Ghi chú</Label>
                <Input id="player-note" name="note" placeholder="Tùy chọn" className="focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="player-level" className="font-bold">Trình độ</Label>
                <select
                  id="player-level"
                  name="level"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-medium"
                  defaultValue="Trung bình"
                >
                  {PLAYER_LEVELS.map((level: { id: string; name: string }) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg border">
                <input id="player-isFixed" name="isFixed" type="checkbox" className="size-5 rounded border-gray-300 text-primary focus:ring-primary/20" />
                <Label htmlFor="player-isFixed" className="cursor-pointer text-xs font-bold text-muted-foreground leading-tight">Cố định (tự động chọn khi tạo buổi mới)</Label>
              </div>
              {playerError ? <p className="text-sm text-destructive font-bold">{playerError}</p> : null}
              <Button className="w-full gap-2 h-11 font-black shadow-md shadow-primary/10" type="submit">
                <Plus className="size-5" />
                THÊM VẬN ĐỘNG VIÊN
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="court-panel border-primary/10 shadow-lg">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-xl text-primary font-black flex items-center gap-2">
            <Users className="size-6" />
            Danh sách hiện tại
          </CardTitle>
          <CardDescription>
            {isLoading ? "Đang tải dữ liệu..." : `Hiện có ${players.length} vận động viên.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {players.length === 0 && !isLoading ? (
              <div className="sm:col-span-2 py-12 text-center bg-muted/20 rounded-xl border border-dashed">
                <p className="text-sm text-muted-foreground italic">Chưa có vận động viên nào trong danh sách.</p>
              </div>
            ) : (
              players.map((player) =>
                editingPlayerId === player.id ? (
                  <form
                    key={player.id}
                    className="space-y-3 rounded-xl border-2 border-primary bg-primary/[0.02] p-4 shadow-inner animate-in zoom-in-95 duration-200"
                    onSubmit={(event) => updatePlayer(event, player.id)}
                  >
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Tên</Label>
                      <Input name="name" defaultValue={player.name} required minLength={2} className="h-9 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Điện thoại</Label>
                      <Input name="phone" defaultValue={player.phone} placeholder="Số điện thoại" className="h-9 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Ghi chú</Label>
                      <Input name="note" defaultValue={player.note} placeholder="Ghi chú" className="h-9 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground">Trình độ</Label>
                      <select
                        name="level"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                        defaultValue={player.level}
                      >
                        {PLAYER_LEVELS.map((level: { id: string; name: string }) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 py-1">
                      <input id={`edit-isFixed-${player.id}`} name="isFixed" type="checkbox" defaultChecked={player.isFixed} className="size-4 rounded text-primary focus:ring-primary/20" />
                      <Label htmlFor={`edit-isFixed-${player.id}`} className="cursor-pointer text-[10px] font-bold text-muted-foreground uppercase">Thành viên cố định</Label>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button className="h-9 flex-1 gap-2 font-bold" type="submit">
                        <Save className="size-4" />
                        Lưu
                      </Button>
                      <Button
                        className="h-9 flex-1 gap-2 font-bold"
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
                  <div key={player.id} className="group relative rounded-xl border border-primary/10 bg-white/50 p-4 transition-all hover:bg-white hover:shadow-md hover:border-primary/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-emerald-950 truncate">{player.name}</p>
                          <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full border border-blue-500/20 font-black uppercase tracking-tight">
                            {getLevelName(player.level)}
                          </span>
                          {player.isFixed && (
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 font-black uppercase tracking-tight">
                              Cố định
                            </span>
                          )}
                        </div>
                        {player.phone ? (
                          <p className="text-xs text-muted-foreground mt-1 font-medium">{player.phone}</p>
                        ) : null}
                        {player.note ? (
                          <p className="text-xs text-muted-foreground mt-1 italic leading-tight">“{player.note}”</p>
                        ) : null}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          type="button"
                          variant="ghost"
                          className="size-8 text-primary hover:bg-primary/10"
                          onClick={() => setEditingPlayerId(player.id)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          type="button"
                          variant="ghost"
                          className="size-8 text-destructive hover:bg-destructive/10"
                          onClick={() => deletePlayer(player.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

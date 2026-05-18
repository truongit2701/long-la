"use client";

import { useState } from "react";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS_OF_WEEK = [
  { value: "Monday", label: "Thứ Hai" },
  { value: "Tuesday", label: "Thứ Ba" },
  { value: "Wednesday", label: "Thứ Tư" },
  { value: "Thursday", label: "Thứ Năm" },
  { value: "Friday", label: "Thứ Sáu" },
  { value: "Saturday", label: "Thứ Bảy" },
  { value: "Sunday", label: "Chủ Nhật" },
];

export function AutomationSettings({ initialSettings }: { 
  initialSettings: { automate_create_session: boolean; automate_days: string[]; showPlayerLevel: boolean; showPlayerSets: boolean } 
}) {
  const [enabled, setEnabled] = useState(initialSettings.automate_create_session);
  const [days, setDays] = useState<string[]>(initialSettings.automate_days);
  const [showLevel, setShowLevel] = useState(initialSettings.showPlayerLevel);
  const [showSets, setShowSets] = useState(initialSettings.showPlayerSets);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function toggleDay(day: string) {
    setDays((curr) => curr.includes(day) ? curr.filter(d => d !== day) : [...curr, day]);
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    
    const response = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        automate_create_session: enabled,
        automate_days: days,
        showPlayerLevel: showLevel,
        showPlayerSets: showSets,
      })
    });
    
    if (response.ok) {
      setMessage("Đã lưu cài đặt tự động!");
    } else {
      setMessage("Có lỗi xảy ra, vui lòng thử lại");
    }
    
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Settings className="size-5" />
          Tự động tạo lịch tuần
        </CardTitle>
        <CardDescription>
          Thiết lập các tính năng tự động và hiển thị cho tài khoản của bạn.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Tự động hóa</p>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="automate_create_session" 
              checked={enabled} 
              onChange={(e) => setEnabled(e.target.checked)} 
              className="size-4 rounded border-gray-300 text-primary focus:ring-primary/20"
            />
            <label htmlFor="automate_create_session" className="font-medium cursor-pointer">
              Bật tự động tạo buổi đánh hàng tuần
            </label>
          </div>
        </div>

        {enabled && (
          <div className="space-y-3 pt-2 pl-6 border-l-2 border-primary/20">
            <p className="text-sm font-medium">Chọn lịch cố định hàng tuần:</p>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = days.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background hover:bg-accent border-input'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            {days.length === 0 && <p className="text-xs text-destructive">Vui lòng chọn ít nhất 1 ngày</p>}
          </div>
        )}

        <div className="pt-4 border-t space-y-4">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Hiển thị</p>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="show_player_level" 
              checked={showLevel} 
              onChange={(e) => setShowLevel(e.target.checked)} 
              className="size-4 rounded border-gray-300 text-primary focus:ring-primary/20"
            />
            <label htmlFor="show_player_level" className="font-medium cursor-pointer">
              Hiển thị trình độ VĐV (Newbie, Trung bình...)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="show_player_sets" 
              checked={showSets} 
              onChange={(e) => setShowSets(e.target.checked)} 
              className="size-4 rounded border-gray-300 text-primary focus:ring-primary/20"
            />
            <label htmlFor="show_player_sets" className="font-medium cursor-pointer">
              Hiển thị và theo dõi số set cầu chơi trong buổi
            </label>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <Button onClick={handleSave} disabled={saving || (enabled && days.length === 0)} className="gap-2">
            <Save className="size-4" />
            {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </Button>
          {message && <span className="text-sm text-green-600 font-medium">{message}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

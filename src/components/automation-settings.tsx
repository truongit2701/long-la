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
  initialSettings: { automate_create_session: boolean; automate_days: string[] } 
}) {
  const [enabled, setEnabled] = useState(initialSettings.automate_create_session);
  const [days, setDays] = useState<string[]>(initialSettings.automate_days);
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
          Hệ thống sẽ tự động tạo sẵn các buổi đánh cho cả tuần (kèm danh sách VĐV cố định) vào đầu mỗi tuần.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="automate_create_session" 
            checked={enabled} 
            onChange={(e) => setEnabled(e.target.checked)} 
            className="size-4"
          />
          <label htmlFor="automate_create_session" className="font-medium cursor-pointer">
            Bật tự động tạo buổi đánh
          </label>
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

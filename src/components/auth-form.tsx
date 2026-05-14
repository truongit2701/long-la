"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isRegister ? payload : {
        username: payload.username,
        password: payload.password,
      }),
    });
    const data = await response.json().catch(() => null);

    setIsLoading(false);

    if (!response.ok) {
      setError(data?.message ?? "Không thể xác thực tài khoản");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="court-panel w-full max-w-md">
      <CardHeader>
        <div className="mb-3 flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Dumbbell className="size-6" />
        </div>
        <CardTitle>{isRegister ? "Tạo tài khoản" : "Đăng nhập"}</CardTitle>
        <CardDescription>
          {isRegister
            ? "Tạo tài khoản để quản lý team cầu lông của bạn."
            : "Vào sân quản lý lịch đánh, chi phí và chuyển khoản."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="long_la"
              required
              minLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={8}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full gap-2" disabled={isLoading} type="submit">
            {isRegister ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
            {isLoading ? "Đang xử lý..." : isRegister ? "Đăng ký" : "Đăng nhập"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

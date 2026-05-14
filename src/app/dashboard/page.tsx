import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { BadmintonManager } from "@/components/badminton-manager";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="sport-page">
      <section className="sport-shell">
        <div className="sport-header">
          <div>
            <p className="sport-kicker">
              <Activity className="size-4" />
              Quản lý team cầu lông
            </p>
            <h1 className="sport-title">
              Xin chào, {session.username}
            </h1>
            <p className="sport-subtitle">
              Tạo buổi đánh, chọn người tham gia và giữ mọi khoản chi phí gọn
              như một bài khởi động tốt.
            </p>
          </div>
          <LogoutButton />
        </div>
        <BadmintonManager />
      </section>
    </main>
  );
}

import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { BadmintonManager } from "@/components/badminton-manager";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";
import { AutomationSettings } from "@/components/automation-settings";
import { usersCollection } from "@/lib/users";
import { ObjectId } from "mongodb";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const users = await usersCollection();
  const user = await users.findOne({ _id: new ObjectId(session.sub) });
  
  const initialSettings = {
    automate_create_session: user?.automate_create_session ?? false,
    automate_days: user?.automate_days ?? [],
    showPlayerLevel: user?.showPlayerLevel ?? true,
    showPlayerSets: user?.showPlayerSets ?? false,
  };

  return (
    <main className="sport-page">
      <section className="sport-shell">
        <div className="sport-header">
          <div>
            <p className="sport-kicker">
              <Activity className="size-4" />
              Quản lý cầu lông
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
        <AutomationSettings initialSettings={initialSettings} />
        <BadmintonManager showPlayerLevel={initialSettings.showPlayerLevel} />
      </section>
    </main>
  );
}

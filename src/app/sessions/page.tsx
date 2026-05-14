import { redirect } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { SessionHistory } from "@/components/session-history";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";

export default async function SessionsPage() {
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
              <ReceiptText className="size-4" />
              Lịch sử buổi đánh
            </p>
            <h1 className="sport-title">
              Chi tiết tiền và chuyển khoản
            </h1>
            <p className="sport-subtitle">
              Kiểm tra QR nhận tiền, số tiền mỗi người và trạng thái đã chuyển
              khoản cho từng buổi chơi.
            </p>
          </div>
          <LogoutButton />
        </div>
        <SessionHistory />
      </section>
    </main>
  );
}

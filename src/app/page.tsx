import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Dumbbell, HeartPulse, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="sport-page flex items-center justify-center">
      <section className="court-panel grid w-full max-w-5xl gap-8 p-6 md:grid-cols-[1.05fr_0.95fr] md:p-8">
        <div className="relative z-10 flex flex-col justify-center space-y-6">
          <div>
            <p className="sport-kicker">
              <Activity className="size-4" />
              Badminton Team Manager
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-normal text-emerald-950 sm:text-6xl">
              Chơi khỏe, chia tiền gọn
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Quản lý lịch đánh, vận động viên, chi phí sân cầu và trạng thái
              chuyển khoản trong một không gian năng động cho team cầu lông.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Đăng nhập</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/register">Tạo tài khoản</Link>
            </Button>
          </div>
        </div>

        <div className="relative z-10 grid gap-4">
          <div className="rounded-lg border border-primary/15 bg-emerald-950 p-5 text-primary-foreground shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-emerald-100">Buổi đánh hôm nay</p>
                <p className="mt-2 text-3xl font-bold">Team ready</p>
              </div>
              <Trophy className="size-10 text-secondary" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-md bg-white/10 p-3">
                <p className="text-emerald-100">Sân</p>
                <p className="mt-1 font-bold">2h</p>
              </div>
              <div className="rounded-md bg-white/10 p-3">
                <p className="text-emerald-100">Cầu</p>
                <p className="mt-1 font-bold">3 quả</p>
              </div>
              <div className="rounded-md bg-white/10 p-3">
                <p className="text-emerald-100">Team</p>
                <p className="mt-1 font-bold">8 người</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-white/85 p-5">
              <HeartPulse className="size-7 text-primary" />
              <p className="mt-3 font-semibold">Theo dõi đều đặn</p>
              <p className="mt-1 text-sm text-muted-foreground">Lịch chơi và chi phí rõ ràng.</p>
            </div>
            <div className="rounded-lg border bg-white/85 p-5">
              <Dumbbell className="size-7 text-orange-500" />
              <p className="mt-3 font-semibold">Team khỏe hơn</p>
              <p className="mt-1 text-sm text-muted-foreground">Ít lộn xộn, nhiều thời gian chơi.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

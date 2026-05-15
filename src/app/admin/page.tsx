import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usersCollection, serializeUser } from "@/lib/users";
import { Button } from "@/components/ui/button";
import { AdminUserList } from "./admin-user-list";

export default async function AdminPage() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect("/dashboard");
  }

  const usersCursor = await usersCollection();
  const items = await usersCursor.find({}).sort({ createdAt: -1 }).toArray();
  const initialUsers = items.map(serializeUser);

  return (
    <main className="sport-page p-4 md:p-8">
      <div className="mx-auto max-w-8xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Quản lý người dùng</p>
          </div>
          <div className="flex gap-4">
            <Button asChild variant="outline">
              <Link href="/dashboard">Về Dashboard</Link>
            </Button>
            <form action="/api/auth/logout" method="POST">
              <Button type="submit" variant="destructive" className="gap-2">
                <LogOut className="size-4" />
                Đăng xuất
              </Button>
            </form>
          </div>
        </div>

        <AdminUserList initialUsers={initialUsers} currentUserId={session.sub} />
      </div>
    </main>
  );
}

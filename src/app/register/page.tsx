import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="sport-page flex items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <AuthForm mode="register" />
        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link className="font-medium text-primary hover:underline" href="/login">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}

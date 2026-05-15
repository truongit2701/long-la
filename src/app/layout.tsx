import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lông lá",
  description: "a project for 🏸",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="vi">
      <body>
        {children}
        {session?.role === "admin" && (
          <div className="fixed bottom-2 right-2 z-50 pointer-events-none text-xs font-medium text-muted-foreground opacity-50">
            v1.0.1 - init<br />
            v1.0.2 - codinh feature<br />
            v1.0.3 - admin dashboard, auto create session<br />
            v1.0.4 - public share session<br />
            v1.0.5 - level, other fee
          </div>
        )}
      </body>
    </html>
  );
}

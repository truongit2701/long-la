import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Long La",
  description: "a project for fun",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        {children}
        <div className="fixed bottom-2 right-2 z-50 pointer-events-none text-xs font-medium text-muted-foreground opacity-50">
          v1.0.2
        </div>
      </body>
    </html>
  );
}
